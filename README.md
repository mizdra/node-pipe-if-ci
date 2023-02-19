# pipe-if-ci

Node.js implementation of a command to run pipeline only when in a CI environment.

## Installation

```console
$ npm install -D pipe-if-ci
```

## Usage

```console
$ pipe-if-ci --help
Run pipeline only when in a CI environment.

pipe-if-ci <command> [--pipe|-p <command-for-ci>]

Options:
  -p, --pipe     run your program                            [string] [required]
  -h, --help     Show help                                             [boolean]

Examples:
      pipe-if-ci 'tsc --noEmit' --pipe 'reviewdog -f=tsc -reporter=github-check -fail-on-error'
```

## Programmable API

See [src/index.js](https://github.com/mizdra/node-pipe-if-ci/blob/main/src/index.js) for full API implementation and details.

```js
import { pipeIfCI } from 'pipe-if-ci';

await pipeIfCI('tsc --noEmit', { pipe: 'reviewdog -f=tsc -reporter=github-check -fail-on-error' });
```

## License

MIT
