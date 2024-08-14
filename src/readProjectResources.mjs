import path from 'node:path';
import fs from 'node:fs';
import shelljs from 'shelljs';
import zlib from 'node:zlib';
import mime from 'mime';
import { readFileList, sha256 } from '@quanxiaoxiao/node-utils';
import { calcHash } from './utils.mjs';
import parseHtml from './html/parseHtml.mjs';

export default (projectItem) => {
  const resourceCurrentDir = path.resolve(projectItem.dir, projectItem.currentDirName);
  if (!shelljs.test('-d', resourceCurrentDir)) {
    return  {
      hash: null,
      size: 0,
      pageInfo: null,
      list: [],
    };
  }
  const resourcePathnameList = readFileList(resourceCurrentDir);
  const result = [];
  for (let i = 0; i < resourcePathnameList.length; i++) {
    const resourcePathname = resourcePathnameList[i];
    const buf = fs.readFileSync(resourcePathname);
    result.push({
      hash: sha256(buf),
      buf,
      mime: mime.getType(resourcePathname),
      bufGzip: zlib.gzipSync(buf),
      resourcePathname,
      pathname: resourcePathname.slice(resourceCurrentDir.length + 1),
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
