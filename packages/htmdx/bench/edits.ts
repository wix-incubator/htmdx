import { diffWordsWithSpace } from 'diff';
import { measure, type Measure } from './tokenize';

export type EditPair = { oldString: string; newString: string };

// One content change expressed per format as the oldString/newString pair an
// agent would pass to an Edit tool. null = not expressible in that format.
export type EditTask = {
  id: string;
  description: string;
  htmdx: EditPair;
  hand: EditPair | null;
  jsx: EditPair | null;
  md: EditPair | null;
};

export function applyEdit(text: string, edit: EditPair, label: string): string {
  const count = countOccurrences(text, edit.oldString);
  if (count !== 1) {
    throw new Error(`${label}: oldString matches ${count} times, expected exactly 1`);
  }
  return text.replace(edit.oldString, edit.newString);
}

export function editCost(edits: EditPair[]): Measure {
  let tokens = 0;
  let chars = 0;
  for (const edit of edits) {
    const oldMeasure = measure(edit.oldString);
    const newMeasure = measure(edit.newString);
    tokens += oldMeasure.tokens + newMeasure.tokens;
    chars += oldMeasure.chars + newMeasure.chars;
  }
  return { tokens, chars };
}

// Derive the Edit-tool pairs needed to turn compiled `before` HTML into
// `after`: hunks from a word diff, neighbors merged, each hunk expanded with
// surrounding context until its oldString matches `before` exactly once.
export function deriveEditPairs(before: string, after: string): EditPair[] {
  const hunks = mergeHunks(collectHunks(before, after));
  return hunks.map((hunk) => expandToUniquePair(before, after, hunk));
}

type Hunk = { beforeStart: number; beforeEnd: number; afterStart: number; afterEnd: number };

function collectHunks(before: string, after: string): Hunk[] {
  const hunks: Hunk[] = [];
  let beforePos = 0;
  let afterPos = 0;
  let open: Hunk | null = null;

  for (const part of diffWordsWithSpace(before, after)) {
    if (!part.added && !part.removed) {
      open = null;
      beforePos += part.value.length;
      afterPos += part.value.length;
      continue;
    }
    if (!open) {
      open = {
        beforeStart: beforePos,
        beforeEnd: beforePos,
        afterStart: afterPos,
        afterEnd: afterPos,
      };
      hunks.push(open);
    }
    if (part.removed) {
      beforePos += part.value.length;
      open.beforeEnd = beforePos;
    } else {
      afterPos += part.value.length;
      open.afterEnd = afterPos;
    }
  }
  return hunks;
}

const MERGE_GAP = 24;

function mergeHunks(hunks: Hunk[]): Hunk[] {
  const merged: Hunk[] = [];
  for (const hunk of hunks) {
    const last = merged[merged.length - 1];
    if (last && hunk.beforeStart - last.beforeEnd < MERGE_GAP) {
      last.beforeEnd = hunk.beforeEnd;
      last.afterEnd = hunk.afterEnd;
      continue;
    }
    merged.push({ ...hunk });
  }
  return merged;
}

function expandToUniquePair(before: string, after: string, hunk: Hunk): EditPair {
  let context = 16;
  for (;;) {
    const start = Math.max(0, hunk.beforeStart - context);
    const end = Math.min(before.length, hunk.beforeEnd + context);
    const oldString = before.slice(start, end);
    if (oldString && countOccurrences(before, oldString) === 1) {
      const newString =
        before.slice(start, hunk.beforeStart) +
        after.slice(hunk.afterStart, hunk.afterEnd) +
        before.slice(hunk.beforeEnd, end);
      return { oldString, newString };
    }
    if (start === 0 && end === before.length) {
      return { oldString: before, newString: after };
    }
    context *= 2;
  }
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}
