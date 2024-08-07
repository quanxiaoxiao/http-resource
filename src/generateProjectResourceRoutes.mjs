import zlib from 'node:zlib';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import mime from 'mime';
import shelljs from 'shelljs';
import createError from 'http-errors';
import { readFileList, sha256 } from '@quanxiaoxiao/node-utils';
import { decode } from './utils.mjs';

const codeFileName = path.basename(url.fileURLToPath(import.meta.url), '.mjs');

export default ({
  list: projectResourceList,
  cipher: cipherOptions,
  logger,
}) => {
  return (projectName) => {
    const routes = {};
    for (let i = 0; i < projectResourceList.length; i++) {
      const projectItem = projectResourceList[i];
      if (projectName && projectName !== projectItem.name) {
        continue;
      }
      if (!shelljs.test('-d', projectItem.resourceDir)) {
        if (projectName && logger) {
          logger.warn(`[${codeFileName}] \`${projectName}\` config fail \`${projectItem.resourceDir}\` unexist`);
        }
        continue;
      }
      const filePathnameList = readFileList(projectItem.resourceDir);
      const resources = {};
      for (let j = 0; j < filePathnameList.length; j++) {
        const filePathname = filePathnameList[j];
        const buf = decode(fs.readFileSync(filePathname), cipherOptions);
        const pathname = filePathname.slice(projectItem.resourceDir.length);
        resources[pathname] = {
          pathname,
          buf,
          bufGzip: zlib.gzipSync(buf),
          hash: sha256(buf),
        };
      }
      routes[`/static/${projectItem.name}/(.*)`] = {
        projectName: projectItem.name,
        resources,
        get: (ctx) => {
          const resourceItem = resources[`/${ctx.request.params[0]}`];
          if (!resourceItem) {
            throw createError(404);
          }
          if (ctx.request.params[0] === 'index.html') {
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
            const contentType = mime.getType(resourceItem.pathname);
            if (contentType) {
              ctx.response.headers['Content-Type'] = contentType;
            }
            if (/\bgzip\b/i.test(ctx.request.headers['accept-encoding'])) {
              ctx.response.headers['Content-Encoding'] = 'gzip';
              ctx.response.body = resourceItem.bufGzip;
            }
          }
        },
      };
    }
    return routes;
  };
};
