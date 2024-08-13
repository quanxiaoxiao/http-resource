import { PassThrough } from 'node:stream';
import assert from 'node:assert';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import createError from 'http-errors';
import shelljs from 'shelljs';
import * as tar from 'tar';
import { waitFor } from '@quanxiaoxiao/utils';
import { hasHttpBodyContent } from '@quanxiaoxiao/http-utils';
import { readFileList } from '@quanxiaoxiao/node-utils';
import {
  readResourcesBufWithDecode,
  calcSize,
  calcHash,
  encode,
  decode,
} from './utils.mjs';

const codeFileName = path.basename(url.fileURLToPath(import.meta.url), '.mjs');

const checkoutResources = (projectItem, cipherOptions) => {
  if (shelljs.test('-d', projectItem.resourceDir)) {
    const filePathnameList = readFileList(projectItem.resourceDir);
    const hash = calcHash(readResourcesBufWithDecode(filePathnameList, cipherOptions));
    const resourceStoreDir = path.resolve(projectItem.resourceDir, '..', hash);
    if (!shelljs.test('-d', resourceStoreDir)) {
      for (let j = 0; j < filePathnameList.length; j++) {
        const filePathname = filePathnameList[j];
        const targetPathname = path.join(resourceStoreDir, filePathname.slice(projectItem.resourceDir.length + 1));
        const dir = path.dirname(targetPathname);
        if (!shelljs.test('-d', dir)) {
          shelljs.mkdir('-p', dir);
        }
        fs.writeFileSync(targetPathname, decode(fs.readFileSync(filePathname), cipherOptions));
      }
    } else {
      shelljs.rm('-rf', projectItem.resourceDir);
    }
  }
  const filePathnameList = readFileList(projectItem.resourceTempDir);
  for (let j = 0; j < filePathnameList.length; j++) {
    const filePathname = filePathnameList[j];
    const name = filePathname.slice(projectItem.resourceTempDir.length + 1);
    const targetPathname = path.join(projectItem.resourceDir, name);
    const dir = path.dirname(targetPathname);
    if (!shelljs.test('-d', dir)) {
      shelljs.mkdir('-p', dir);
    }
    fs.writeFileSync(targetPathname, encode(fs.readFileSync(filePathname), cipherOptions));
  }
};

export default (
  {
    list: projectResourceList,
    prefix = 'www',
    cipher: cipherOptions,
    logger,
  },
  onUpdate,
) => {
  assert(prefix.length >= 1);
  if (onUpdate) {
    assert(typeof onUpdate === 'function');
  }

  return () => {
    const routes = {};
    for (let i = 0; i < projectResourceList.length; i++) {
      const projectItem = projectResourceList[i];
      routes[`/${prefix}/${projectItem.name}/:key`] = {
        onPre: (ctx) => {
          if (projectItem.key !== ctx.request.params.key) {
            throw createError(401);
          }
          if (ctx.request.method === 'POST') {
            if (!hasHttpBodyContent(ctx.request.headers)) {
              throw createError(403);
            }
            if (logger) {
              logger.warn(`[${codeFileName}] \`${projectItem.name}\` will update projectResources...`);
            }
            if (!shelljs.test('-d', projectItem.resourceTempDir)) {
              shelljs.mkdir('-p', projectItem.resourceTempDir);
            } else {
              shelljs.rm('-rf', projectItem.resourceTempDir);
              shelljs.mkdir('-p', projectItem.resourceTempDir);
            }

            ctx.request.body = new PassThrough();
            ctx.request.body.pipe(tar.x({
              strip: 1,
              C: projectItem.resourceTempDir,
            }));
          }
        },
        post: async (ctx) => {
          await waitFor(1000);
          checkoutResources(projectItem, cipherOptions);
          const fileList = readFileList(projectItem.resourceDir);
          const bufList = readResourcesBufWithDecode(fileList, cipherOptions);
          const hash = calcHash(bufList);
          const size = calcSize(bufList);
          if (logger) {
            logger.warn(`[${codeFileName}] \`${projectItem.name}\` update projectResources success size:\`${size}\` hash:\`${hash}\``);
          }
          ctx.response = {
            data: {
              name: projectItem.name,
              dateTime: Date.now(),
              hash,
              size,
              list: fileList.map((pathname) => pathname.slice(projectItem.resourceDir.length)),
            },
          };
          process.nextTick(() => {
            if (onUpdate) {
              onUpdate(projectItem);
            }
          });
        },
      };
    }
    return routes;
  };
};
