import assert from 'node:assert/strict';
import test from 'node:test';
import { readBodyWithLimit, RequestBodyTooLargeError } from './bodyReader.ts';

function bodyFrom(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(Uint8Array.from(chunk));
      controller.close();
    },
  });
}

test('reads a streamed body up to the inclusive limit', async () => {
  const bytes = await readBodyWithLimit(
    bodyFrom([
      [1, 2],
      [3, 4],
    ]),
    4,
  );
  assert.deepEqual([...bytes], [1, 2, 3, 4]);
});

test('cancels and rejects as soon as a streamed body exceeds the limit', async () => {
  await assert.rejects(
    () =>
      readBodyWithLimit(
        bodyFrom([
          [1, 2, 3],
          [4, 5],
        ]),
        4,
      ),
    RequestBodyTooLargeError,
  );
});

test('treats a missing request body as empty', async () => {
  assert.equal((await readBodyWithLimit(null, 4)).byteLength, 0);
});
