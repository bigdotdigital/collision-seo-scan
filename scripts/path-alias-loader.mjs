import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const loaderDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(loaderDir, '..');

function resolveWithCandidates(raw) {
  const candidates = [
    raw,
    `${raw}.ts`,
    `${raw}.js`,
    path.join(raw, 'index.ts'),
    path.join(raw, 'index.js')
  ];

  const match = candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;
    return fs.statSync(candidate).isFile();
  });
  return match ? pathToFileURL(match).href : null;
}

function resolveAlias(specifier) {
  return resolveWithCandidates(path.resolve(projectRoot, specifier.slice(2)));
}

function resolveRelative(specifier, context) {
  if (!context.parentURL?.startsWith('file:')) return null;
  const parentDir = path.dirname(fileURLToPath(context.parentURL));
  return resolveWithCandidates(path.resolve(parentDir, specifier));
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === 'server-only') {
    return defaultResolve(pathToFileURL(path.resolve(loaderDir, 'server-only-stub.mjs')).href, context, defaultResolve);
  }

  if (specifier.startsWith('@/')) {
    const resolved = resolveAlias(specifier);
    if (resolved) {
      return defaultResolve(resolved, context, defaultResolve);
    }
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) &&
    !path.extname(specifier)
  ) {
    const resolved = resolveRelative(specifier, context);
    if (resolved) {
      return defaultResolve(resolved, context, defaultResolve);
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
