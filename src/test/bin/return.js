#!/usr/bin/env node

const [codeStr] = process.argv.slice(2);
const code = codeStr ? parseInt(codeStr, 10) : 0;

process.exit(code);

export {};
