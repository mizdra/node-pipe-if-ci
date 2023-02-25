import { assert, it, describe } from 'vitest';
import { spawn } from 'node:child_process';
import { waitExit } from './util.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readAll, notFalse } from './test/util.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

const isWindows = process.platform === 'win32';

// NOTE: Since shebang does not work on Windows, we must explicitly use the node command to execute `.js`.
const prefixForWindows = isWindows ? 'node ' : '';
const pic = prefixForWindows + resolve(__dirname, '../bin/pipe-if-ci.js');
const cat = prefixForWindows + resolve(__dirname, './test/bin/cat.js');
const echo = prefixForWindows + resolve(__dirname, './test/bin/echo.js');
const ret = prefixForWindows + resolve(__dirname, './test/bin/return.js');

const envForNonCI = { ...process.env, CI: 'false' };
const envForCI = { ...process.env, CI: 'true' };

it('only execute the first command in a non-CI environment', async () => {
  const p = spawn(pic, [`${echo} 1`, '--pipe', `${echo} 2`], { env: envForNonCI });
  assert.strictEqual(await readAll(p.stdout), '1\n');
});

it('pipe the output of the first command to the second command in a CI environment', async () => {
  const p1 = spawn(pic, [`${echo} 1`, '--pipe', `${echo} 2`], { env: envForCI });
  assert.strictEqual(await readAll(p1.stdout), '2\n');
  const p2 = spawn(pic, [`${echo} 1`, '--pipe', cat], { env: envForCI });
  assert.strictEqual(await readAll(p2.stdout), '1\n');
});

describe('kill by signal', () => {
  const cases = /** @type {const} */ (['SIGTERM', 'SIGINT', isWindows && 'SIGBREAK', 'SIGHUP']).filter(notFalse);
  for (const signal of cases) {
    it(signal, async () => {
      const p = spawn(pic, [cat, '--pipe', cat]);
      p.kill(signal);
      assert.deepStrictEqual(await waitExit(p), { code: null, signal });
    });
  }
});

it('exit code', async () => {
  assert.deepStrictEqual(await waitExit(spawn(pic, [`${ret} 1`, '--pipe', echo], { env: envForNonCI })), {
    code: 1,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(pic, [`${ret} 1`, '--pipe', echo], { env: envForCI })), {
    code: 0,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(pic, [`${ret} 1`, '--pipe', `${ret} 2`], { env: envForCI })), {
    code: 2,
    signal: null,
  });
});

it('accept --pipe and -p option', async () => {
  assert.deepStrictEqual(await waitExit(spawn(pic, [`${echo} 1`, '-p', `${echo} 2`], { env: envForNonCI })), {
    code: 0,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(pic, [`${echo} 1`, '--pipe', `${echo} 2`], { env: envForNonCI })), {
    code: 0,
    signal: null,
  });
});

it('allow command containing pipes', async () => {
  const p1 = spawn(pic, [`${echo} 1 | ${cat}`, '-p', echo], { env: envForNonCI });
  assert.strictEqual(await readAll(p1.stdout), '1\n');
  const p2 = spawn(pic, [`${echo} 1 | ${cat}`, '-p', `${echo} 2 | ${cat}`], { env: envForCI });
  assert.strictEqual(await readAll(p2.stdout), '2\n');
  const p3 = spawn(pic, [`${echo} 1 | ${cat}`, '-p', `${cat} | ${cat}`], { env: envForCI });
  assert.strictEqual(await readAll(p3.stdout), '1\n');
});
