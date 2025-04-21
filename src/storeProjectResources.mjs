import fs from 'node:fs';
import path from 'node:path';

import Ajv from 'ajv';
import shelljs from 'shelljs';

import listResources from './listResources.mjs';
import { calcHash } from './utils.mjs';

const ajv = new Ajv();

const validate = ajv.compile({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      hash: {
        type: 'string',
      },
      size: {
        type: 'number',
      },
      dateTimeCteate: {
        type: 'number',
      },
    },
    required: ['hash', 'dateTimeCteate'],
  },
});

export default (projectItem, logger) => {
  const metaPathname = path.resolve(projectItem.dir, projectItem.metaFileName);
  const resourceTempDir = path.resolve(projectItem.dir, projectItem.tempDirName);
  const resourceCurrentDir = path.resolve(projectItem.dir, projectItem.currentDirName);
  const metaData = [];

  if (!shelljs.test('-d', projectItem.dir)) {
    shelljs.mkdir('-p', projectItem.dir);
    if (logger && logger.warn) {
      logger.warn(`mkdir \`${projectItem.dir}\``);
    }
  }

  if (shelljs.test('-f', metaPathname)) {
    try {
      const ret = JSON.parse(fs.readFileSync(metaPathname));
      if (!validate(ret)) {
        throw new Error(`\`${metaPathname}\` ${JSON.stringify(validate.errors)}`);
      }
      if (ret.length > 0) {
        metaData.push(...ret);
      }
    } catch (error) {
      if (logger && logger.warn) {
        logger.warn(`parse file at ${metaPathname} fail \`${error.message}\``);
      } else {
        console.warn(`parse file at ${metaPathname} fail \`${error.message}\``);
      }
    }
  }

  const dirList = fs.readdirSync(projectItem.dir).filter((name) => {
    const pathname = path.join(path.join(projectItem.dir, name));
    if (pathname === resourceTempDir || pathname === resourceCurrentDir) {
      return false;
    }
    const stats = fs.statSync(pathname);
    return stats.isDirectory();
  });

  for (let i = 0; i < dirList.length; i++) {
    const hash = dirList[i];
    if (!metaData.find((d) => d.hash !== hash)) {
      const pathname = path.join(projectItem.dir, hash);
      const pathnameList = listResources(pathname);
      if (pathnameList.length > 0) {
        const bufList = pathnameList.map((name) => fs.readFileSync(name));
        const h = calcHash(bufList);
        if (h === hash) {
          const stats = fs.statSync(pathname);
          const obj = {
            hash,
            size: bufList.reduce((acc2, cur) => acc2 + cur.length, 0),
            dateTimeCteate: Math.round(stats.ctimeMs),
          };
          metaData.push(obj);
        }
      }
    }
  }
  fs.writeFileSync(metaPathname, JSON.stringify(metaData));

  if (!shelljs.test('-d', resourceTempDir)) {
    if (logger && logger.warn) {
      logger.warn(`\`${resourceTempDir}\` not exist`);
    }
    return null;
  }

  const filePathnameList = listResources(resourceTempDir);
  const resourceBlockList = filePathnameList.map((d) => fs.readFileSync(d));
  const hash = calcHash(resourceBlockList);
  const targetDir = path.join(projectItem.dir, hash);

  if (!shelljs.test('-d', targetDir)) {
    shelljs.mkdir('-p', targetDir);
    for (let i = 0; i < filePathnameList.length; i++) {
      const resourcePathname = filePathnameList[i];
      const targetFilePathname = path.join(projectItem.dir, hash, resourcePathname.slice(resourceTempDir.length));
      if (!shelljs.test('-d', path.dirname(targetFilePathname))) {
        shelljs.mkdir('-p', path.dirname(targetFilePathname));
      }
      shelljs.cp(resourcePathname, targetFilePathname);
    }
    metaData.unshift({
      hash,
      size: resourceBlockList.reduce((acc, cur) => acc + cur.length, 0),
      dateTimeCteate: Date.now(),
    });
  }

  if (shelljs.test('-d', resourceCurrentDir)) {
    shelljs.rm('-rf', resourceCurrentDir);
  }
  for (let i = 0; i < filePathnameList.length; i++) {
    const resourcePathname = filePathnameList[i];
    const targetFilePathname = path.join(resourceCurrentDir, resourcePathname.slice(resourceTempDir.length));
    if (!shelljs.test('-d', path.dirname(targetFilePathname))) {
      shelljs.mkdir('-p', path.dirname(targetFilePathname));
    }
    fs.writeFileSync(targetFilePathname, fs.readFileSync(resourcePathname));
  }
  shelljs.rm('-rf', resourceTempDir);

  fs.writeFileSync(metaPathname, JSON.stringify(metaData));

  return metaData[0];
};
