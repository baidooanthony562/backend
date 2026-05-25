import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

// Load the build-only env file (kept separate from .env so it never ships in
// the client bundle and so the auth token stays out of dev-server context).
const dotenvPath = path.resolve(__dirname, '..', '.env.sentry-build-plugin');
const { config } = await import('dotenv');
config({ path: dotenvPath });

if (!process.env.SENTRY_AUTH_TOKEN) {
  console.error('[upload-sourcemaps] SENTRY_AUTH_TOKEN missing — set it in .env.sentry-build-plugin');
  process.exit(1);
}

const cliBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@sentry',
  'cli',
  'bin',
  'sentry-cli'
);

const sharedArgs = ['--org', 'cindy-nat-enterprise', '--project', 'javascript-react'];

function run(args) {
  const result = spawnSync(process.execPath, [cliBin, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['sourcemaps', 'inject', distDir]);
run(['sourcemaps', 'upload', ...sharedArgs, distDir]);
