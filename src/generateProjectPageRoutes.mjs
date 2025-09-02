import { fetchActions } from '@quanxiaoxiao/fetch-action';
import createError from 'http-errors';
import _ from 'lodash';

import renderToHtml from './html/renderToHtml.mjs';

const createRouteHandler = (
  projectName,
  hosts,
  onPageRender,
  getProject,
) => {
  return async (ctx) => {
    const projectItem = getProject(projectName);
    if (!projectItem) {
      throw createError(404);
    }
    if (!projectItem.resource.pageInfo) {
      console.warn(`\`project:${projectItem.name}\` pageInfo is unconfig`);
      throw createError(403);
    }
    if (_.isPlainObject(projectItem.data)) {
      if (!ctx.state) {
        ctx.state = {};
      }
      Object.assign(ctx.state, projectItem.data);
    }
    if (!_.isEmpty(projectItem.api)) {
      const ret = await fetchActions(projectItem.api)({
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
    const { pageInfo } = projectItem.resource;
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
  };
};

export default (
  {
    list,
    hosts,
    onPageRender,
  },
  getProject,
) => {
  const routes = {};

  list.forEach((projectItem) => {
    projectItem.list.forEach((route) => {
      routes[route] = {
        get: createRouteHandler(projectItem.name, hosts, onPageRender, getProject),
      };
    });
  });

  return routes;
};
