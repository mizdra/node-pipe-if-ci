#!/usr/bin/env node

import { pipeIfCI, parseArgv } from '../src/index.js';

const [command, options] = parseArgv(process.argv);

pipeIfCI(command, options).catch((e) => {
  console.error(e);
  process.exit(1);
});
