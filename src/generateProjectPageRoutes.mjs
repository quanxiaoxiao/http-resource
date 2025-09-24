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

const initializeState = (ctx) => {
  ctx.state ??= {};
};

const mergeProjectData = (ctx, projectItem) => {
  if (!_.isPlainObject(projectItem.data)) {
    return;
  }

  initializeState(ctx);
  Object.assign(ctx.state, projectItem.data);
};

const fetchAndMergeApiData = async (ctx, projectItem, hosts) => {
  if (_.isEmpty(projectItem.api)) {
    return;
  }

  try {
    const apiResult = await fetchActions(projectItem.api)({
      hosts,
      request: ctx.request,
    });

    if (_.isPlainObject(apiResult)) {
      initializeState(ctx);
      Object.assign(ctx.state, apiResult);
    }
  } catch (error) {
    console.error(`API fetch failed for project "${projectItem.name}":`, error);
    throw createError(502);
  }
};

const buildPageAst = (projectItem, ctx) => {
  let pageAst;

  try {
    pageAst = JSON.parse(projectItem.resource.pageAst);
  } catch (error) {
    console.error(`Invalid page AST for project "${projectItem.name}":`, error);
    throw createError(500);
  }

  setCharset(pageAst, 'utf-8');
  setViewport(pageAst);

  if (projectItem.title) {
    setTitle(pageAst, projectItem.title);
  }

  if (ctx.state && !_.isEmpty(ctx.state)) {
    const stateScript = `window.__STATE__=${JSON.stringify(ctx.state)};`;
    insertInlineScript(pageAst, stateScript);
  }

  return pageAst;
};

const processResponse = (ctx) => {
  if (!ctx.pageAst) {
    throw createError(403);
  }
  const content = `<!DOCTYPE html>${jsonToHtml(ctx.pageAst)}`;
  const contentBuf = Buffer.from(content, 'utf8');

  const acceptEncoding = ctx.request.headers['accept-encoding'] || '';
  const encodedContentResult = encodeContentEncoding(contentBuf, acceptEncoding);

  ctx.response.headers ??= {};
  Object.assign(ctx.response.headers, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': encodedContentResult.buf.length,
  });

  if (encodedContentResult.name) {
    ctx.response.headers['Content-Encoding'] = encodedContentResult.name;
  }

  ctx.response.body = encodedContentResult.buf;
};

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
  try {
    mergeProjectData(ctx, projectItem);

    await fetchAndMergeApiData(ctx, projectItem, hosts);

    ctx.projectName = projectName;
    ctx.pageAst = buildPageAst(projectItem, ctx);

    ctx.response = {};

    if (onPageRender && typeof onPageRender === 'function') {
      await onPageRender(ctx);
    }

    processResponse(ctx);

  } catch (error) {
    if (error.status) {
      throw error;
    }

    console.error(`Unexpected error in route handler for project "${projectName}":`, error);
    throw createError(500);
  }
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
