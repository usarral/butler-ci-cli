import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function getVersion(): string {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading version from package.json:', error);
    return 'unknown';
  }
}
