import fs from 'node:fs';
import path from 'node:path';

const listResources = (pathname) => {
  const stats = fs.statSync(pathname);
  if (!stats.isDirectory()) {
    return [pathname];

  }
  const list = fs.readdirSync(pathname);
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const name = list[i];
    result.push(...listResources(path.join(pathname, name)));
  }
  return result;
};

export default listResources;
