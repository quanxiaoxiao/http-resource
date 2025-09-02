import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { sha256 } from '@quanxiaoxiao/node-utils';
import mime from 'mime';
import shelljs from 'shelljs';

import parseHtml from './html/parseHtml.mjs';
import listResources from './listResources.mjs';
import { calcHash } from './utils.mjs';

export default (projectItem) => {
  const defaultResult = {
    hash: null,
    size: 0,
    pageInfo: null,
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
  return {
    hash: calcHash(resources.map((d) => d.buf)),
    size: totalSize,
    pageInfo: indexHtml ? parseHtml(indexHtml.buf) : null,
    list: resources,
  };
};
