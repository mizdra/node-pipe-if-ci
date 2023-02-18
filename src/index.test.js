import assert from 'node:assert';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { waitExit } from './util.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readAll, notFalse } from './test/util.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const bin = resolve(__dirname, '../bin/pipe-if-ci.js');
const logSignal = resolve(__dirname, './test/bin/log-signal.js');
const isWindows = process.platform === 'win32';

const envForNonCI = { ...process.env, CI: 'false' };
const envForCI = { ...process.env, CI: 'true' };

test('only execute the first command in a non-CI environment', async () => {
  const p = spawn(bin, ['echo 1', '--pipe', 'echo 2'], { env: envForNonCI });
  assert.strictEqual(await readAll(p.stdout), '1\n');
});

test('pipe the output of the first command to the second command in a CI environment', async () => {
  const p1 = spawn(bin, ['echo 1', '--pipe', 'echo 2'], { env: envForCI });
  assert.strictEqual(await readAll(p1.stdout), '2\n');
  const p2 = spawn(bin, ['echo 1', '--pipe', 'cat'], { env: envForCI });
  assert.strictEqual(await readAll(p2.stdout), '1\n');
});

test('kill by signal', async (t) => {
  const cases = /** @type {const} */ (['SIGTERM', 'SIGINT', isWindows && 'SIGBREAK', 'SIGHUP']).filter(notFalse);
  for (const signal of cases) {
    await t.test(signal, async () => {
      const p = spawn(bin, ['cat', '--pipe', 'cat']);
      p.kill(signal);
      assert.deepStrictEqual(await waitExit(p), { code: null, signal });
    });
  }
});

// This test fails because stdin cannot be read.
// Probably due to a bug in the Node.js test runner.
// TODO: Fix this test.
test('forward the signal to the second command, skipping the first command', { skip: true }, async () => {
  const p1 = spawn(bin, [logSignal, '--pipe', 'cat'], { env: envForCI, stdio: 'pipe' });
  p1.kill('SIGINT');
  p1.kill('SIGTERM');
  assert.strictEqual(await readAll(p1.stdout), '\n');

  const p2 = spawn(bin, ['cat', '--pipe', logSignal], { env: envForCI, stdio: 'pipe' });
  p2.kill('SIGINT');
  p2.kill('SIGTERM');
  assert.strictEqual(await readAll(p2.stdout), 'SIGINT\n');
});

test('exit code', async () => {
  assert.deepStrictEqual(await waitExit(spawn(bin, ['exit 1', '--pipe', 'echo'], { env: envForNonCI })), {
    code: 1,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(bin, ['exit 1', '--pipe', 'echo'], { env: envForCI })), {
    code: 0,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(bin, ['exit 1', '--pipe', 'exit 2'], { env: envForCI })), {
    code: 2,
    signal: null,
  });
});

test('accept --pipe and -p option', async () => {
  assert.deepStrictEqual(await waitExit(spawn(bin, ['echo 1', '-p', 'echo 2'], { env: envForNonCI })), {
    code: 0,
    signal: null,
  });
  assert.deepStrictEqual(await waitExit(spawn(bin, ['echo 1', '--pipe', 'echo 2'], { env: envForNonCI })), {
    code: 0,
    signal: null,
  });
});

test('allow command containing pipes', async () => {
  const p1 = spawn(bin, ['echo 1 | cat', '-p', 'echo'], { env: envForNonCI });
  assert.strictEqual(await readAll(p1.stdout), '1\n');
  const p2 = spawn(bin, ['echo 1 | cat', '-p', 'echo 2 | cat'], { env: envForCI });
  assert.strictEqual(await readAll(p2.stdout), '2\n');
  const p3 = spawn(bin, ['echo 1 | cat', '-p', 'cat | cat'], { env: envForCI });
  assert.strictEqual(await readAll(p3.stdout), '1\n');
});
