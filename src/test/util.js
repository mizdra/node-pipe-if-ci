/**
 * @template T
 * @param {T} value
 * @returns {value is Exclude<T, false>}
 */
export function notFalse(value) {
  return value !== false;
}

/**
 * @param {import('node:stream').Readable} stream
 * @returns {Promise<string>}
 */
export async function readAll(stream) {
  return new Promise((resolve) => {
    let result = '';
    stream.on('data', (data) => {
      result += data;
    });
    stream.on('close', () => resolve(result));
  });
}
