import path from 'node:path';
import { PassThrough } from 'node:stream';
import createError from 'http-errors';
import * as tar from 'tar';
import shelljs from 'shelljs';
import { waitFor } from '@quanxiaoxiao/utils';
import { hasHttpBodyContent } from '@quanxiaoxiao/http-utils';
import readProjectResources from './readProjectResources.mjs';
import storeProjectResources from './storeProjectResources.mjs';

export default (
  {
    resourceDistPrefix = '/static',
    resourceUpdatePrefix = '/www',
    logger,
    onUpdateResource,
  },
  getProject,
) => ({
    [`${resourceUpdatePrefix}/:name/:key`]: {
      onPre: (ctx) => {
        const projectItem = getProject(ctx.request.params.name);
        if (!projectItem) {
          throw createError(404);
        }
        if (projectItem.key !== ctx.request.params.key) {
          throw createError(401);
        }
        if (ctx.request.method === 'POST') {
          if (!hasHttpBodyContent(ctx.request.headers)) {
            throw createError(403);
          }
          if (logger) {
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
        await waitFor(1000);
        const ret = storeProjectResources(projectItem, logger);
        if (!ret) {
          throw createError(403);
        }
        if (logger) {
          logger.warn(`\`project:${projectItem.name}\` update resources success, \`size:${ret.size}\` \`hash:${ret.hash}\``);
        }
        ctx.response = {
          data: ret,
        };
        process.nextTick(() => {
          if (onUpdateResource) {
            const d = getProject(ctx.request.params.name);
            onUpdateResource({
              ...d,
              resource: readProjectResources(d),
            });
          }
        });
      },
    },
    [`${resourceDistPrefix}/:name{/*path}`]: {
      get: (ctx) => {
        const projectItem = getProject(ctx.request.params.name);
        if (!projectItem) {
          throw createError(404);
        }
        const resourceItem = projectItem.resource.list.find((d) => d.pathname === ctx.request.params.path);
        if (!resourceItem) {
          throw createError(404);
        }
        if (ctx.request.params.path === 'index.html') {
          throw createError(403);
        }
        const etag = ctx.request.headers['if-none-match'];
        if (etag && etag === resourceItem.hash) {
          ctx.response = {
            statusCode: 304,
            body: null,
          };
        } else {
          ctx.response = {
            headers: {
              Etag: resourceItem.hash,
            },
            body: resourceItem.buf,
          };
          if (resourceItem.mime) {
            ctx.response.headers['Content-Type'] = resourceItem.mime;
          }
          if (/\bgzip\b/i.test(ctx.request.headers['accept-encoding'])) {
            ctx.response.headers['Content-Encoding'] = 'gzip';
            ctx.response.body = resourceItem.bufGzip;
          }
        }
      },
    },
});
