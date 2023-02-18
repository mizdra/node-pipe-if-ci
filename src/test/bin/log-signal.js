#!/usr/bin/env node

process.once('SIGINT', () => {
  console.log('SIGINT');
  process.kill(process.pid, 'SIGINT');
});

/**
 * @returns {Promise<void>}
 */
async function waitForever() {
  return new Promise((resolve) => {
    // Use setTimeout to avoid the 'Unfinished Top-Level Await' warning.
    // ref: https://nodejs.org/api/process.html#exit-codes
    setTimeout(() => resolve(), 2 ** 31 - 1);
  });
}

await waitForever();

export {};
