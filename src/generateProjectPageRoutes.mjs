import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import _ from 'lodash';
import shelljs from 'shelljs';
import generateFetchActions from '@quanxiaoxiao/fetch-action';
import renderToHtml from './html/renderToHtml.mjs';
import parseHtml from './html/parseHtml.mjs';
import { decode } from './utils.mjs';

const codeFileName = path.basename(url.fileURLToPath(import.meta.url), '.mjs');

export default ({
  list: projectResourceList,
  cipher: cipherOptions,
  logger,
  hosts,
  onPageRender,
}) => {
  return (projectName) => {
    const routes = {};
    for (let i = 0; i < projectResourceList.length; i++) {
      const projectItem = projectResourceList[i];
      if (projectName && projectName !== projectItem.name) {
        continue;
      }
      const pagePathname = path.resolve(path.join(projectItem.resourceDir, 'index.html'));
      if (!shelljs.test('-f', pagePathname)) {
        if (logger) {
          logger.warn(`[${codeFileName}] \`${projectItem.name}\` config fail \`${pagePathname}\` unexist`);
        }
        continue;
      }
      if (_.isEmpty(projectItem.routeList)) {
        if (projectName && logger) {
          logger.warn(`[${codeFileName}] \`${projectItem.name}\` config fail routeList is empty`);
        }
        continue;
      }
      const pageInfo = parseHtml(decode(fs.readFileSync(pagePathname), cipherOptions));
      if (!pageInfo) {
        if (logger) {
          logger.warn(`[${codeFileName}] \`${projectItem.name}\` config fail \`${pagePathname}\` parse error`);
        }
        continue;
      }
      const dataFetch = _.isEmpty(projectItem.api) ? null : generateFetchActions({
        fetch: projectItem.api,
      });
      const handler = {
        projectName: projectItem.name,
        pageInfo,
        get: async (ctx) => {
          if (_.isPlainObject(projectItem.data)) {
            if (!ctx.state) {
              ctx.state = {};
            }
            Object.assign(ctx.state, projectItem.data);
          }
          if (dataFetch) {
            const ret = await dataFetch.fetch({
              hosts,
              request: ctx.request,
            });
            if (_.isPlainObject(ret)) {
              if (!ctx.state) {
                ctx.state = {};
              }
              Object.assign(ctx.state, ret);
            }
          }
          const options = {
            documentAttributeList: [...pageInfo.documentAttributeList],
            bodyAttributeList: [...pageInfo.documentAttributeList],
            scriptList: [...pageInfo.scriptList],
            styleList: [...pageInfo.styleList],
            linkList: [...pageInfo.linkList],
            metaList: [...pageInfo.metaList],
            elemList: [...pageInfo.elemList],
            title: projectItem.title ?? '',
          };
          if (ctx.state) {
            options.scriptList.unshift({
              content: `window.__STATE__=${JSON.stringify(ctx.state)};`,
            });
          }
          if (onPageRender) {
            const ret = onPageRender(ctx);
            if (ret) {
              Object.keys(options).forEach((keyName) => {
                if (Object.hasOwnProperty.call(ret, keyName)) {
                  if (keyName === 'title') {
                    options.title = ret[keyName];
                  } else if (Array.isArray(ret[keyName])) {
                    options[keyName].push(...ret[keyName]);
                  }
                }
              });
            }
          }
          ctx.response = {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
            body: renderToHtml(options),
          };
        },
      };
      for (let j = 0; j < projectItem.routeList.length; j++) {
        const pathname = projectItem.routeList[j];
        if (routes[pathname]) {
          if (logger) {
            logger.warn(`[${codeFileName}] \`${projectItem.name}\` \`${pathname}\` config fail, same path with \`${routes[pathname].projectName}\``);
          }
          continue;
        }
        routes[pathname] = handler;
      }
    }
    return routes;
  };
};
