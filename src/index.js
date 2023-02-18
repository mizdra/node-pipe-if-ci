import { isCI } from 'ci-info';
import { spawnCommand, waitExit } from './util.js';

const USAGE = `
Run pipeline only when in a CI environment.

pipe-if-ci <command> [--pipe|-p <command-for-ci>]

Options:
  -p, --pipe     run your program                            [string] [required]
  -h, --help     Show help                                             [boolean]

Examples:
      pipe-if-ci 'tsc --noEmit' --pipe 'reviewdog -f=tsc -reporter=github-check -fail-on-error'
`.trim();

/**
 * @typedef {[command: string, options: PipeIfCIOptions]} PipeIfCIArgs
 * @typedef {{ pipe: string }} PipeIfCIOptions
 */

/**
 * @param {string[]} argv
 * @returns {PipeIfCIArgs}
 */
export function parseArgv(argv) {
  const [command, pipeOption, commandForCI, ...rest] = argv.slice(2);
  if (command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  try {
    if (command === undefined) {
      throw new Error(`<command> is not passed.`);
    }
    if (pipeOption !== '--pipe' && pipeOption !== '-p') {
      throw new Error(`Expected \`--pipe\` or \`-p\`, but got \`${pipeOption}\`.`);
    }
    if (commandForCI === undefined) {
      throw new Error(`<command-for-ci> is not passed.`);
    }
    if (rest.length > 0) {
      throw new Error(`Many arguments are passed.`);
    }
    return [command, { pipe: commandForCI }];
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error(USAGE);
    process.exit(1);
  }
}

/**
 * @param {PipeIfCIArgs[0]} command
 * @param {PipeIfCIArgs[1]} options
 */
export async function pipeIfCI(command, options) {
  const fullCommand = isCI ? `${command} | ${options.pipe}` : command;

  // Use `spawn` instead of `exec` for the following reasons
  //
  // - `exec` is not accepted for stdin
  //   - `spawn` is accepted
  // - `exec` buffers the stdout and stderr of a command until the command execution completes, so they cannot be displayed to the user during the command execution.
  //   - `spawn` processes stdout and stderr as a stream, so they can be displayed to the user during command execution.
  const childProcess = spawnCommand(fullCommand, { stdio: 'inherit', shell: true });

  // Forwards signals received by the parent process to the child process.
  // ref: https://github.com/kentcdodds/cross-env/blob/3edefc7b450fe273655664f902fd03d9712177fe/src/index.js#L24-L27
  //
  // TODO: Should we forward other signals as well ...?
  process.on('SIGTERM', () => childProcess.kill('SIGTERM'));
  process.on('SIGINT', () => childProcess.kill('SIGINT'));
  process.on('SIGBREAK', () => childProcess.kill('SIGBREAK'));
  process.on('SIGHUP', () => childProcess.kill('SIGHUP'));

  const { code, signal } = await waitExit(childProcess);

  // When a process is killed by SIGINT, the exit code is 130 in bash for Linux and 2 in Git Bash for Windows.
  // The exit code for each signal is shell-specific. Anyway, when `childProcess` exits with SIGINT,
  // the exit code of the parent process should be the shell-specific exit code.
  //
  // However, code is (probably) always null when a childProcess exits on a signal.
  // This means that we have no way of knowing the shell-specific exit code.This means
  // that we have no way of knowing the shell-specific exit code. This means that
  // we have no way of knowing the shell-specific exit code.
  //
  // Instead, we decided to send the signal received by the child process to the parent process.
  // This way, we should be able to exit the parent process with a shell-specific exit code,
  // as the shell handles the signal directly.
  //
  // ref: https://stackoverflow.com/a/66323375
  // ref: https://github.com/entropitor/dotenv-cli/blob/master/cli.js#L90-L97
  if (code !== null) {
    process.exit(code);
  } else if (signal !== null) {
    process.removeAllListeners(); // Remove all listeners so that the signal to be sent next is not handled.
    process.kill(process.pid, signal);
  } else {
    throw new Error('unreachable: Either `code` or `signal` should be non-null.');
  }
}
