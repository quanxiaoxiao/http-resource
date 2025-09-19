import { Buffer } from 'node:buffer';

import { fetchActions } from '@quanxiaoxiao/fetch-action';
import {
  insertInlineScript,
  jsonToHtml,
  setCharset,
  setTitle,
  setViewport,
} from '@quanxiaoxiao/html-helper';
import { encodeContentEncoding } from '@quanxiaoxiao/http-utils';
import createError from 'http-errors';
import _ from 'lodash';

const createRouteHandler = (
  projectName,
  hosts,
  onPageRender,
  getProject,
) => async (ctx) => {
  const projectItem = getProject(projectName);
  if (!projectItem) {
    throw createError(404);
  }
  if (!projectItem.resource?.pageAst) {
    console.warn(`Project "${projectItem.name}" page ast is not configured`);
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
  const pageAst = JSON.parse(projectItem.resource.pageAst);
  setCharset(pageAst, 'utf-8');
  setViewport(pageAst);
  if (projectItem.title) {
    setTitle(pageAst, projectItem.title);
  }
  if (ctx.state) {
    insertInlineScript(pageAst, `window.__STATE__=${JSON.stringify(ctx.state)};`);
  }
  if (onPageRender) {
    onPageRender(ctx, pageAst);
  }
  const content = `<!DOCTYPE html>${jsonToHtml(pageAst)}`;
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
