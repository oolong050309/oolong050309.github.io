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

export const visibleSpaces = (text: string) => text.replaceAll(' ', '␠');
export const pieceKey = (piece: DemoPiece) => piece.start + ':' + piece.end;

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
