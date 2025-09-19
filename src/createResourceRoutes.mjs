import path from 'node:path';
import { PassThrough } from 'node:stream';

import { hasHttpBodyContent } from '@quanxiaoxiao/http-utils';
import { waitFor } from '@quanxiaoxiao/utils';
import createError from 'http-errors';
import shelljs from 'shelljs';
import * as tar from 'tar';

import readProjectResources from './readProjectResources.mjs';
import storeProjectResources from './storeProjectResources.mjs';

const DEFAULT_RESOURCE_DIST_PREFIX = '/static';
const DEFAULT_RESOURCE_UPDATE_PREFIX = '/www';
const TEMP_DIR_CLEANUP_DELAY = 1000;
const FORBIDDEN_PATHS = new Set(['index.html']);

export default (
  {
    resourceDistPrefix = DEFAULT_RESOURCE_DIST_PREFIX,
    resourceUpdatePrefix = DEFAULT_RESOURCE_UPDATE_PREFIX,
    logger,
    onUpdateResource,
  },
  getProject,
) => {
  if (typeof getProject !== 'function') {
    throw new Error('getProject must be a function');
  }

  return {
    [`${resourceUpdatePrefix}/:name/:key`]: {
      onPre: (ctx) => {
        const { name, key } = ctx.request.params;
        const projectItem = getProject(name);
        if (!projectItem) {
          throw createError(404);
        }
        if (projectItem.key !== key) {
          throw createError(401);
        }
        if (ctx.request.method === 'POST') {
          if (!hasHttpBodyContent(ctx.request.headers)) {
            throw createError(403);
          }
          if (logger?.warn) {
            logger.warn(`\`project:${projectItem.name}\` will update resources...`);
          }
          const resourceTempDir = path.resolve(projectItem.dir, projectItem.tempDirName);

          if (shelljs.test('-d', resourceTempDir)) {
            shelljs.rm('-rf', resourceTempDir);
          }

          shelljs.mkdir('-p', resourceTempDir);

          ctx.request.body = new PassThrough();
          ctx.request.body.pipe(tar.x({
            strip: 1,
            C: resourceTempDir,
          }));
        }
      },
      post: async (ctx) => {
        const projectItem = getProject(ctx.request.params.name);
        await waitFor(TEMP_DIR_CLEANUP_DELAY);
        const ret = storeProjectResources(projectItem);
        if (!ret) {
          throw createError(403);
        }
        if (logger?.warn) {
          logger.warn(`\`project:${projectItem.name}\` update resources success, \`size:${ret.size}\` \`hash:${ret.hash}\``);
        }
        ctx.response = {
          data: ret,
        };
        if (onUpdateResource) {
          process.nextTick(() => {
            const updatedProject = getProject(ctx.request.params.name);
            if (updatedProject) {
              onUpdateResource({
                ...updatedProject,
                resource: readProjectResources(updatedProject),
              });
            }
          });
        }
      },
    },

    [`${resourceDistPrefix}/:name{/*path}`]: {
      get: (ctx) => {
        const { name, path: requestPath } = ctx.request.params;
        const projectItem = getProject(name);
        if (!projectItem) {
          throw createError(404);
        }
        if (FORBIDDEN_PATHS.has(requestPath)) {
          throw createError(403);
        }

        const resourceItem = projectItem?.resource?.list?.find((d) => d.pathname === requestPath);

        if (!resourceItem) {
          throw createError(404);
        }

        const clientEtag = ctx.request.headers['if-none-match'];
        if (clientEtag && clientEtag === resourceItem.hash) {
          ctx.response = {
            statusCode: 304,
            body: null,
          };
          return;
        }
        ctx.response = {
          headers: {
            Etag: resourceItem.hash,
          },
          body: resourceItem.buf,
        };
        if (resourceItem.mime) {
          ctx.response.headers['Content-Type'] = resourceItem.mime;
        }

        const supportsGzip = /\bgzip\b/i.test(ctx.request.headers['accept-encoding']);

        if (supportsGzip && resourceItem.bufGzip) {
          ctx.response.headers['Content-Encoding'] = 'gzip';
          ctx.response.body = resourceItem.bufGzip;
        }
      },
    },
  };
};
