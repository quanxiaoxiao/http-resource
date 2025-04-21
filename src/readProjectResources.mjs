import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { sha256 } from '@quanxiaoxiao/node-utils';
import { listResources } from '@quanxiaoxiao/resource-curd';
import mime from 'mime';
import shelljs from 'shelljs';

import parseHtml from './html/parseHtml.mjs';
import { calcHash } from './utils.mjs';

export default async (projectItem) => {
  const resourceCurrentDir = path.resolve(projectItem.dir, projectItem.currentDirName);
  if (!shelljs.test('-d', resourceCurrentDir)) {
    return {
      hash: null,
      size: 0,
      pageInfo: null,
      list: [],
    };
  }
  const resourcePathnameList = await listResources(resourceCurrentDir);
  const result = [];
  for (let i = 0; i < resourcePathnameList.length; i++) {
    const item = resourcePathnameList[i];
    const resourcePathname = path.join(resourceCurrentDir, item.pathname);
    const buf = fs.readFileSync(resourcePathname);
    result.push({
      hash: sha256(buf),
      buf,
      mime: mime.getType(resourcePathname),
      bufGzip: zlib.gzipSync(buf),
      resourcePathname,
      pathname: item.pathname.slice(1),
    });
  }
  const indexHtml = result.find((d) => d.pathname === 'index.html');
  return {
    hash: calcHash(result.map((d) => d.buf)),
    size: result.reduce((acc, cur) => acc + cur.buf.length, 0),
    pageInfo: indexHtml ? parseHtml(indexHtml.buf) : null,
    list: result,
  };
};
