#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.length > 0) {
  throw new Error(`Arguments are not supported.`);
}

process.stdin.pipe(process.stdout);

export {};
