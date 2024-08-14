import createError from 'http-errors';
import _ from 'lodash';
import { fetchActions } from '@quanxiaoxiao/fetch-action';
import renderToHtml from './html/renderToHtml.mjs';

export default (
  {
    list,
    hosts,
    onPageRender,
  },
  getProject,
) => {
  const routes = {};
  for (let i = 0; i < list.length; i++) {
    const projectItem = list[i];
    for (let j = 0; j < projectItem.list.length; j++) {
      routes[projectItem.list[j]] =  {
        get: async (ctx) => {
          const d = getProject(projectItem.name);
          if (!d) {
            throw createError(404);
          }
          if (!d.resource.pageInfo) {
            throw createError(403);
          }
          if (_.isPlainObject(d.data)) {
            if (!ctx.state) {
              ctx.state = {};
            }
            Object.assign(ctx.state, d.data);
          }
          if (!_.isEmpty(d.api)) {
            const ret = await fetchActions(d.api)({
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
          const { pageInfo } = d.resource;
          const options = {
            documentAttributeList: [...pageInfo.documentAttributeList],
            bodyAttributeList: [...pageInfo.documentAttributeList],
            scriptList: [...pageInfo.scriptList],
            styleList: [...pageInfo.styleList],
            linkList: [...pageInfo.linkList],
            metaList: [...pageInfo.metaList],
            elemList: [...pageInfo.elemList],
            title: d.title ?? '',
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
    }
  }

  return routes;
};
