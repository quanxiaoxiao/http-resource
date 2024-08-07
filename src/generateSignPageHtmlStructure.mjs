import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import _ from 'lodash';
import shelljs from 'shelljs';
import parseHtml from './html/parseHtml.mjs';
import { decode } from './utils.mjs';

const codeFileName = path.basename(url.fileURLToPath(import.meta.url), '.mjs');

export default ({
  list: projectResourceList,
  cipher: cipherOptions,
  logger,
}) => {
  const list = projectResourceList.filter((d) => _.isEmpty(d.routeList));
  if (list.length !== 1) {
    if (list.length > 1 && logger) {
      logger.warn(`[${codeFileName}] found multiple project \`${list.map((d) => d.name).join(',')}\``);
    }
    return () => null;
  }
  const [signPageItem] = list;
  return () => {
    const pagePathname = path.resolve(path.join(signPageItem.resourceDir, 'index.html'));
    if (!shelljs.test('-f', pagePathname)) {
      if (logger) {
        logger.warn(`[${codeFileName}] \`${pagePathname}\` not found`);
      }
      return null;
    }
    const pageInfo = parseHtml(decode(fs.readFileSync(pagePathname), cipherOptions));
    if (!pageInfo) {
      if (logger) {
        logger.warn(`[${codeFileName}] \`${pagePathname}\` parse fail`);
      }
      return null;
    }
    return {
      projectName: signPageItem.name,
      title: signPageItem.title ?? null,
      pageInfo,
    };
  };
};
