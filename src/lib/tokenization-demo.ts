import data from '../config/tokenization-demo.json' with { type: 'json' };

export const tokenizationTrace = data;
export type DemoPiece = { text: string; start: number; end: number; id?: number; byte?: number };
export type DemoPhase = 'text' | 'segments' | 'bytes' | 'merges' | 'ids' | 'decode';
export type DemoFrame = {
  phase: DemoPhase;
  pieces: DemoPiece[][];
  merge?: typeof data.merges[number];
  mergeIndex?: number;
};

export const visibleSpaces = (text: string) => text.replaceAll(' ', '␣');
export const pieceKey = (piece: DemoPiece) => piece.start + ':' + piece.end;

export type TokenizationMode = 'word' | 'bpe';
export type AnimationFrame = {
  phase: number;
  groups: DemoPiece[][];
  merge?: typeof data.merges[number];
  lookupIndex?: number;
};

// A small, fixed teaching vocabulary. These IDs are illustrative, not o200k IDs.
export const wordLevelVocabulary = [
  { text: 'I', id: 1 },
  { text: ' ', id: 2 },
  { text: 'miss', id: 3 },
  { text: 'you', id: 4 },
  { text: ',', id: 5 },
  { text: 'Larry', id: 6 },
  { text: '.', id: 7 },
];

export const wordLevelTokens = [...data.text.matchAll(/[A-Za-z]+|\s+|[^A-Za-z\s]/g)].map(match => {
  const entry = wordLevelVocabulary.find(token => token.text === match[0]);
  if (!entry) throw new Error('Word is missing from the example vocabulary');
  return { text: match[0], start: match.index, end: match.index + match[0].length, id: entry.id };
});

export function makeTokenizationAnimation(mode: TokenizationMode) {
  const tokens = mode === 'word' ? wordLevelTokens : data.tokens;
  const phases: DemoPhase[] = ['text', 'segments', 'bytes', 'merges', 'ids', 'decode'];
  const frames: AnimationFrame[] = mode === 'word' ? [
    { phase: 0, groups: [[{ text: data.text, start: 0, end: data.bytes.length }]] },
    { phase: 1, groups: tokens.map(token => [{ ...token }]) },
  ] : makeTokenizationFrames().filter(frame => frame.phase !== 'ids' && frame.phase !== 'decode').map(frame => ({
    phase: phases.indexOf(frame.phase), groups: frame.pieces, merge: frame.merge,
  }));
  const lookupStart = frames.length;
  tokens.forEach((_token, lookupIndex) => frames.push({
    phase: 4, groups: tokens.map(token => [{ ...token }]), lookupIndex,
  }));
  frames.push({ phase: 5, groups: tokens.map(token => [{ ...token }]) });
  return {
    frames, tokens, lookupStart,
    vocabulary: mode === 'word' ? wordLevelVocabulary : data.tokens,
  };
}

// Byte ranges let the UI animate the official encoder's recorded merges
// without confusing byte values with vocabulary IDs.
export function makeTokenizationFrames(): DemoFrame[] {
  let groups: DemoPiece[][] = data.segments.map(segment =>
    data.bytes.slice(segment.start, segment.end).map((byte, index) => ({
      text: String.fromCharCode(byte), byte,
      start: segment.start + index, end: segment.start + index + 1,
    })),
  );
  const copyGroups = () => groups.map(group => group.map(piece => ({ ...piece })));
  const frames: DemoFrame[] = [
    { phase: 'text', pieces: [[{ text: data.text, start: 0, end: data.bytes.length }]] },
    { phase: 'segments', pieces: data.segments.map(segment => [{ ...segment }]) },
    { phase: 'bytes', pieces: copyGroups() },
  ];
  data.merges.forEach((merge, mergeIndex) => {
    const group = groups[merge.segment];
    const index = group.findIndex(piece => piece.start === merge.left.start && piece.end === merge.left.end);
    if (index < 0 || group[index + 1]?.end !== merge.right.end) {
      throw new Error('Invalid tokenization merge trace');
    }
    group.splice(index, 2, { ...merge.result });
    frames.push({ phase: 'merges', pieces: copyGroups(), merge, mergeIndex });
  });
  groups = data.tokens.map(token => [{ ...token }]);
  frames.push({ phase: 'ids', pieces: copyGroups() });
  frames.push({ phase: 'decode', pieces: copyGroups() });
  return frames;
}
