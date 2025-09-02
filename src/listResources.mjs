import fs from 'node:fs';
import path from 'node:path';

const listResources = (pathname) => {
  try {
    const stats = fs.statSync(pathname);

    if (!stats.isDirectory()) {
      return [pathname];
    }

    const entries = fs.readdirSync(pathname, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      const fullPath = path.join(pathname, entry.name);

      if (entry.isDirectory()) {
        result.push(...listResources(fullPath));
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }

    return result;
  } catch (error) {
    return [];
  }
};

export default listResources;
