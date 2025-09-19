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
  if (!Array.isArray(list)) {
    throw new Error('Project list must be an array');
  }

  if (typeof getProject !== 'function') {
    throw new Error('getProject must be a function');
  }

  const routes = {};

  list.forEach((projectItem, index) => {
    if (!projectItem || typeof projectItem !== 'object') {
      console.warn(`Invalid project item at index ${index}, skipping`);
      return;
    }
    if (!projectItem.name) {
      console.warn(`Project item at index ${index} missing name, skipping`);
      return;
    }

    if (!Array.isArray(projectItem.list)) {
      console.warn(`Project "${projectItem.name}" routes list is not an array, skipping`);
      return;
    }

    projectItem.list.forEach((route, routeIndex) => {
      if (typeof route !== 'string' || !route.trim()) {
        console.warn(`Invalid route at index ${routeIndex} for project "${projectItem.name}", skipping`);
        return;
      }
      const normalizedRoute = route.trim();
      if (routes[normalizedRoute]) {
        console.warn(`Route "${normalizedRoute}" already exists, overwriting`);
      }
      routes[normalizedRoute] = {
        get: createRouteHandler(projectItem.name, hosts, onPageRender, getProject),
      };
    });
  });

  return routes;
};
