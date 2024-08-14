import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import shelljs from 'shelljs';
import { readFileList } from '@quanxiaoxiao/node-utils';
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
      fs.writeFileSync(metaPathname, JSON.stringify([]));
    }
  } else {
    fs.writeFileSync(metaPathname, JSON.stringify([]));
  }

  if (!shelljs.test('-d', resourceTempDir)) {
    if (logger && logger.warn) {
      logger.warn(`\`${resourceTempDir}\` not exist`);
    }
    return null;
  }

  const filePathnameList = readFileList(resourceTempDir);
  const resourceBlockList = filePathnameList.map((pathname) => fs.readFileSync(pathname));
  const hash = calcHash(resourceBlockList);
  const targetDir = path.join(projectItem.dir, hash);

  if (!shelljs.test('-d', targetDir)) {
    shelljs.mkdir('-p', targetDir);
    for (let i = 0; i < filePathnameList.length; i++) {
      const resourcePathname = filePathnameList[i];
      const filename = resourcePathname.slice(resourceTempDir.length + 1);
      const targetFilePathname = path.join(projectItem.dir, hash, filename);
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
    const filename = resourcePathname.slice(resourceTempDir.length + 1);
    const targetFilePathname = path.join(resourceCurrentDir, filename);
    if (!shelljs.test('-d', path.dirname(targetFilePathname))) {
      shelljs.mkdir('-p', path.dirname(targetFilePathname));
    }
    fs.writeFileSync(targetFilePathname, fs.readFileSync(resourcePathname));
  }
  shelljs.rm('-rf', resourceTempDir);

  fs.writeFileSync(metaPathname, JSON.stringify(metaData));

  return metaData[0];
};
