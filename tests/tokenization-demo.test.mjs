import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTokenizationFrames, tokenizationTrace as trace, pieceKey } from '../src/lib/tokenization-demo.ts';

test('the demo preserves the original bytes, spaces and punctuation at every step', () => {
  const bytes = new TextEncoder().encode(trace.text);
  assert.equal(trace.text, 'I miss you, Larry.');
  assert.deepEqual([...bytes], trace.bytes);
  for (const frame of makeTokenizationFrames()) {
    const pieces = frame.pieces.flat();
    assert.equal(pieces.map(piece => piece.text).join(''), trace.text);
    assert.equal(pieces[0].start, 0);
    assert.equal(pieces.at(-1).end, bytes.length);
    for (let index = 0; index < pieces.length; index++) {
      const piece = pieces[index];
      assert.equal(new TextDecoder().decode(bytes.slice(piece.start, piece.end)), piece.text);
      if (index) assert.equal(piece.start, pieces[index - 1].end);
    }
    assert.equal(new Set(pieces.map(pieceKey)).size, pieces.length);
  }
});

test('each BPE step merges one adjacent pair within its pre-tokenized segment', () => {
  const frames = makeTokenizationFrames();
  const previousBytes = frames.findIndex(frame => frame.phase === 'bytes');
  let previous = frames[previousBytes];
  for (const frame of frames.filter(frame => frame.phase === 'merges')) {
    const { merge } = frame;
    assert.equal(frame.pieces.flat().length, previous.pieces.flat().length - 1);
    assert.equal(merge.left.end, merge.right.start);
    assert.equal(merge.result.text, merge.left.text + merge.right.text);
    assert.equal(merge.result.start, merge.left.start);
    assert.equal(merge.result.end, merge.right.end);
    for (let group = 0; group < frame.pieces.length; group++) {
      if (group !== merge.segment) assert.deepEqual(frame.pieces[group], previous.pieces[group]);
    }
    const bounds = trace.segments[merge.segment];
    assert.ok(merge.result.start >= bounds.start && merge.result.end <= bounds.end);
    previous = frame;
  }
});

test('final IDs match the official o200k_base fixture and cannot be confused with byte values', () => {
  const frames = makeTokenizationFrames();
  const final = frames.find(frame => frame.phase === 'ids');
  assert.deepEqual(final.pieces.flat(), trace.tokens);
  assert.deepEqual(trace.tokens.map(token => token.id), [40, 5141, 481, 11, 55320, 13]);
  assert.deepEqual(trace.tokens.map(token => token.text), ['I', ' miss', ' you', ',', ' Larry', '.']);
  assert.equal(trace.bytes[0], 73);
  assert.equal(trace.tokens[0].id, 40);
  assert.equal(frames.at(-1).phase, 'decode');
  assert.deepEqual(frames.at(-1).pieces, final.pieces);
});
