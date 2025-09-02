import { Buffer } from 'node:buffer';

import { fetchActions } from '@quanxiaoxiao/fetch-action';
import { encodeContentEncoding } from '@quanxiaoxiao/http-utils';
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
    if (!projectItem.resource?.pageInfo) {
      console.warn(`Project "${projectItem.name}" pageInfo is not configured`);
      throw createError(403);
    }
    if (_.isPlainObject(projectItem.data)) {
      if (!ctx.state) {
        ctx.state = {};
      }
      Object.assign(ctx.state, projectItem.data);
    }

    if (!_.isEmpty(projectItem.api)) {
      const apiResult = await fetchActions(projectItem.api)({
        hosts,
        request: ctx.request,
      });
      if (_.isPlainObject(apiResult)) {
        if (!ctx.state) {
          ctx.state = {};
        }
        Object.assign(ctx.state, apiResult);
      }
    }
    const { pageInfo } = projectItem.resource;
    const options = {
      documentAttributeList: [...pageInfo.documentAttributeList || []],
      bodyAttributeList: [...pageInfo.documentAttributeList || []],
      scriptList: [...pageInfo.scriptList || []],
      styleList: [...pageInfo.styleList || []],
      linkList: [...pageInfo.linkList || []],
      metaList: [...pageInfo.metaList || []],
      elemList: [...pageInfo.elemList || []],
      title: projectItem.title ?? '',
    };
    if (ctx.state && Object.keys(ctx.state).length > 0) {
      options.scriptList.unshift({
        content: `window.__STATE__=${JSON.stringify(ctx.state)};`,
      });
    }
    if (onPageRender) {
      const renderResult = onPageRender(ctx);
      if (renderResult) {
        Object.keys(options).forEach((keyName) => {
          if (Object.hasOwnProperty.call(renderResult, keyName)) {
            if (keyName === 'title') {
              options.title = renderResult[keyName];
            } else if (Array.isArray(renderResult[keyName])) {
              options[keyName].push(...renderResult[keyName]);
            }
          }
        });
      }
    }
    const content = renderToHtml(options);
    const contentBuf = Buffer.from(content);
    const encodedContentResult = encodeContentEncoding(contentBuf, ctx.request.headers['accept-encoding']);

    ctx.response = {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...encodedContentResult.name ? {
          'Content-Encoding': encodedContentResult.name,
        } : {},
      },
      body: encodedContentResult.buf,
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
