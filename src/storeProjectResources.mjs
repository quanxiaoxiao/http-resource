import assert from 'node:assert';
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
      dateTimeCreate: {
        type: 'number',
      },
    },
    required: ['hash', 'dateTimeCreate'],
  },
});

const ensureDirectoryExists = (dirPath) => {
  if (!shelljs.test('-d', dirPath)) {
    shelljs.mkdir('-p', dirPath);
  }
};

const loadMetaData = (metaPathname) => {
  if (!shelljs.test('-f', metaPathname)) {
    return [];
  }
  try {
    const content = fs.readFileSync(metaPathname, 'utf8');
    const data = JSON.parse(content);
    if (!validate(data)) {
      throw new Error(`Invalid metadata format: ${JSON.stringify(validate.errors)}`);
    }
    return data;
  } catch (error) {
    console.warn(`Failed to parse metadata file ${metaPathname}: ${error.message}`);
    return [];
  }
};

const copyFiles = (sourceFiles, sourceDir, targetDir) => {
  for (const sourceFile of sourceFiles) {
    const relativePath = sourceFile.slice(sourceDir.length);
    const targetFile = path.join(targetDir, relativePath);
    const targetDirPath = path.dirname(targetFile);

    if (!shelljs.test('-d', targetDirPath)) {
      shelljs.mkdir('-p', targetDirPath);
    }

    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
  }
};

const scanAndUpdateMetadata = (
  projectDir,
  metaData,
  resourceTempDir,
  resourceCurrentDir,
) => {
  const dirList = fs.readdirSync(projectDir)
    .filter((name) => {
      const fullPath = path.join(path.join(projectDir, name));
      if (fullPath === resourceTempDir || fullPath === resourceCurrentDir) {
        return false;
      }
      try {
        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
          return false;
        }
        const files = listResources(fullPath);
        if (files.length === 0) {
          return false;
        }
        const resourceBuffers = files.map((filePath) => fs.readFileSync(filePath));
        const resourceHash = calcHash(resourceBuffers);
        return resourceHash === name;
      } catch {
        return false;
      }
    });

  const updatedMetaData = [...metaData];

  for (const dirname of dirList) {
    const hash = dirname;
    if (!updatedMetaData.find((d) => d.hash === hash)) {
      const dirPath = path.join(projectDir, hash);
      const fileList = listResources(dirPath);
      assert(fileList.length > 0);
      const bufList = fileList.map((filePath) => fs.readFileSync(filePath));
      const resourceHash = calcHash(bufList);
      assert(resourceHash === dirname);
      const stats = fs.statSync(dirPath);
      updatedMetaData.push({
        hash,
        size: bufList.reduce((acc, buf) => acc + buf.length, 0),
        dateTimeCreate: Math.round(stats.ctimeMs),
      });
    }
  }

  return updatedMetaData;
};

export default (projectItem) => {
  const metaPathname = path.resolve(projectItem.dir, projectItem.metaFileName);
  const resourceTempDir = path.resolve(projectItem.dir, projectItem.tempDirName);
  const resourceCurrentDir = path.resolve(projectItem.dir, projectItem.currentDirName);

  ensureDirectoryExists(projectItem.dir);

  const originMetaData = loadMetaData(metaPathname);

  const metaData = scanAndUpdateMetadata(projectItem.dir, originMetaData, resourceTempDir, resourceCurrentDir);

  fs.writeFileSync(metaPathname, JSON.stringify(metaData, null, 2));

  if (!shelljs.test('-d', resourceTempDir)) {
    console.warn(`Temporary directory does not exist: ${resourceTempDir}`);
    return null;
  }

  const tempFiles = listResources(resourceTempDir);
  if (tempFiles.length === 0) {
    console.warn(`No files found in temporary directory: ${resourceTempDir}`);
    return null;
  }
  const resourceBuffers = tempFiles.map((filePath) => fs.readFileSync(filePath));
  const projectResourcesHash = calcHash(resourceBuffers);
  const targetDir = path.join(projectItem.dir, projectResourcesHash);

  if (!shelljs.test('-d', targetDir)) {
    shelljs.mkdir('-p', targetDir);
    copyFiles(tempFiles, resourceTempDir, targetDir);
    metaData.unshift({
      hash: projectResourcesHash,
      size: resourceBuffers.reduce((acc, buf) => acc + buf.length, 0),
      dateTimeCreate: Date.now(),
    });
  }

  if (shelljs.test('-d', resourceCurrentDir)) {
    shelljs.rm('-rf', resourceCurrentDir);
  }

  copyFiles(tempFiles, resourceTempDir, resourceCurrentDir);

  shelljs.rm('-rf', resourceTempDir);

  fs.writeFileSync(metaPathname, JSON.stringify(metaData, null, 2));

  return metaData[0] || null;
};
