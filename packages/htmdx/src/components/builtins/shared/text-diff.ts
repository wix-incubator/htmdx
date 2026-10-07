// Word-level diff between a field's current text and a proposed version,
// shaped for a copy reviewer rather than for a patch: phrases that changed
// together read as one mark, a capitalization fix is told apart from a
// rewrite, and words that were only cut still leave a visible trace.

export type DiffSegment =
  | { kind: 'same'; text: string }
  | { kind: 'changed'; text: string }
  | { kind: 'cased'; text: string }
  | { kind: 'cut'; text: string };

type Token = { text: string; changed?: boolean; cased?: boolean; cut?: string };

// Unchanged words that may sit inside one mark. Two absorbs "your"/"the"/
// "and" between two edits without swallowing a clause; lower it and a
// rewritten sentence comes back as confetti.
const MERGE_GAP = 2;

const tokenize = (value: string) => value.match(/\S+|\s+/g) || [];
const isSpace = (value: string) => /^\s+$/.test(value);

function diffTokens(before: string[], after: string[]): Token[] {
  const m = before.length;
  const n = after.length;
  const same = (i: number, j: number) => before[i].toLowerCase() === after[j].toLowerCase();
  const lcs = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] = same(i, j) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: Token[] = [];
  let cut: string[] = [];
  // Words dropped from the old text leave nothing in the new text to mark, so
  // a pure cut ("Select a gender" -> "Select") would render as no change at
  // all. A cut next to inserted words is a replacement, and the insertion's
  // mark already shows it.
  const flushCut = (nextIsInsert: boolean) => {
    const text = cut.join('').trim();
    const previous = out[out.length - 1];
    if (text && !nextIsInsert && !previous?.changed) {
      out.push({ text: '', cut: text });
    }
    cut = [];
  };

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    // Matched case-insensitively so alignment never fragments on a
    // capitalization fix, with the case change recorded so it still shows.
    if (same(i, j)) {
      flushCut(false);
      out.push({ text: after[j], cased: before[i] !== after[j] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      cut.push(before[i]);
      i += 1;
    } else {
      flushCut(true);
      out.push({ text: after[j], changed: true });
      j += 1;
    }
  }
  while (i < m) {
    cut.push(before[i]);
    i += 1;
  }
  flushCut(j < n);
  while (j < n) {
    out.push({ text: after[j], changed: true });
    j += 1;
  }
  return out;
}

export function diffWords(before: string, after: string): DiffSegment[] {
  const tokens = diffTokens(tokenize(before), tokenize(after));
  type Kind = DiffSegment['kind'] | 'space';
  const kinds: Kind[] = tokens.map((token) =>
    token.cut !== undefined
      ? 'cut'
      : token.changed
        ? 'changed'
        : isSpace(token.text)
          ? 'space'
          : token.cased
            ? 'cased'
            : 'same',
  );

  // Whitespace joins the run on both sides, so "Order Status" -> "order
  // status" is one mark rather than two with a gap between them.
  for (let k = 1; k < kinds.length - 1; k += 1) {
    const around = kinds[k - 1];
    if (
      kinds[k] === 'space' &&
      around === kinds[k + 1] &&
      (around === 'changed' || around === 'cased')
    ) {
      kinds[k] = around;
    }
  }

  // Swallow short unchanged gaps between two changed runs. Never across a
  // case mark or a cut.
  for (let k = 0; k < kinds.length; k += 1) {
    if (kinds[k] !== 'changed') {
      continue;
    }
    let words = 0;
    let next = k + 1;
    for (; next < kinds.length && kinds[next] !== 'changed'; next += 1) {
      if (kinds[next] === 'cased' || kinds[next] === 'cut') {
        words = Infinity;
        break;
      }
      if (!isSpace(tokens[next].text)) {
        words += 1;
      }
      if (words > MERGE_GAP) {
        break;
      }
    }
    if (next < kinds.length && kinds[next] === 'changed' && words > 0 && words <= MERGE_GAP) {
      for (let fill = k + 1; fill < next; fill += 1) {
        kinds[fill] = 'changed';
      }
    }
  }

  const segments: DiffSegment[] = [];
  tokens.forEach((token, index) => {
    const kind = kinds[index] === 'space' ? 'same' : (kinds[index] as DiffSegment['kind']);
    const text = kind === 'cut' ? token.cut || '' : token.text;
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && kind !== 'cut') {
      last.text += text;
    } else {
      segments.push({ kind, text } as DiffSegment);
    }
  });
  return segments;
}
