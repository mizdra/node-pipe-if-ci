import { spawn } from 'node:child_process';
import { parseArgsStringToArgv } from 'string-argv';

/**
 * @param {import('child_process').ChildProcess} process
 * @returns {Promise<{code: number | null, signal: NodeJS.Signals | null}>}
 */
export async function waitExit(process) {
  return new Promise((resolve) => {
    process.on('exit', (code, signal) => resolve({ code, signal }));
  });
}

/**
 * @param {string} command
 * @param {import('child_process').SpawnOptions} options
 * @returns {import('child_process').ChildProcess}
 */
export function spawnCommand(command, options) {
  // ref: https://github.com/gilamran/tsc-watch/blob/b4f171df544d79c53575fb17805cc6720de3a307/src/lib/runner.ts#L6
  const parts = parseArgsStringToArgv(command);
  const [exec, ...args] = parts;
  if (exec === undefined) throw new Error('No command to execute');
  return spawn(exec, args, options);
}
