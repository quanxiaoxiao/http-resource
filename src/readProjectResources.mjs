import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { htmlToJson } from '@quanxiaoxiao/html-helper';
import { sha256 } from '@quanxiaoxiao/node-utils';
import mime from 'mime';
import shelljs from 'shelljs';

import calcHash from './calcHash.mjs';
import listResources from './listResources.mjs';

export default (projectItem) => {
  const defaultResult = {
    hash: null,
    size: 0,
    pageAst: null,
    dateTimeUpdate: null,
    list: [],
  };

  if (!projectItem?.dir || !projectItem?.currentDirName) {
    return defaultResult;
  }
  const resourceCurrentDir = path.resolve(projectItem.dir, projectItem.currentDirName);
  if (!shelljs.test('-d', resourceCurrentDir)) {
    return defaultResult;
  }
  const resourcePathnameList = listResources(resourceCurrentDir);
  const stats = fs.statSync(resourceCurrentDir);
  const dateTimeUpdate = Math.round(stats.mtimeMs);
  defaultResult.dateTimeUpdate = dateTimeUpdate;

  if (!resourcePathnameList.length) {
    return defaultResult;
  }

  const resources = [];

  for (let i = 0; i < resourcePathnameList.length; i++) {
    const resourcePathname = resourcePathnameList[i];
    const buf = fs.readFileSync(resourcePathname);
    resources.push({
      hash: sha256(buf),
      buf,
      mime: mime.getType(resourcePathname) || 'application/octet-stream',
      bufGzip: zlib.gzipSync(buf),
      resourcePathname,
      pathname: resourcePathname.slice(resourceCurrentDir.length + 1),
    });
  }

  const indexHtml = resources.find((d) => d.pathname === 'index.html');
  const totalSize = resources.reduce((acc, cur) => acc + cur.buf.length, 0);
  const pageAst = indexHtml ? htmlToJson(indexHtml.buf.toString()) : null;
  return {
    hash: calcHash(resources.map((d) => d.buf)),
    size: totalSize,
    pageAst: pageAst ? JSON.stringify(pageAst) : null,
    dateTimeUpdate,
    list: resources,
  };
};
