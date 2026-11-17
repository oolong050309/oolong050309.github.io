import { fromHtml } from 'hast-util-from-html';
import { toText } from 'hast-util-to-text';

// Build-time extraction retains readable article text and code examples
// without copying HTML markup or highlighting styles into the index.
export function extractSearchText(html: string): string {
  return toText(fromHtml(html, { fragment: true })).replace(/\s+/gu, ' ').trim();
}
