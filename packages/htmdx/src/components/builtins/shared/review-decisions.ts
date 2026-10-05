import { CURRENT, type ReviewElementModel, type VersionRef } from './review-model';

// What the reader decided on the page: one entry per element, keyed by the
// element's name so a republish that adds or reorders elements keeps it.
// Every entry remembers the wording it was made on; when the agent rewrites
// that wording, the entry no longer applies and quietly drops.

type FieldEdit = { text: string; from: string };
type Comment = { text: string; from: string; sentOn?: string };
type VersionRequest = { text: string; versions: number };

export type ElementDecision = {
  pick?: VersionRef | null;
  pickFrom?: string;
  edits?: Record<string, Record<string, FieldEdit>>;
  comments?: Record<string, Comment>;
  requests?: VersionRequest[];
};

export type Decisions = Record<string, ElementDecision>;

export function versionAt(element: ReviewElementModel, ref: VersionRef) {
  return ref === CURRENT ? element.before : element.versions[ref];
}

export function wordingOf(element: ReviewElementModel, ref: VersionRef) {
  return ref === CURRENT ? '' : JSON.stringify(versionAt(element, ref)?.values ?? {});
}

// null when nothing valid is chosen, including a pick of a version a
// republish removed. An element nobody has touched falls back to its Final.
export function pickOf(decisions: Decisions, element: ReviewElementModel): VersionRef | null {
  const decision = decisions[element.name];
  if (!decision || !('pick' in decision)) {
    return element.final;
  }
  const { pick } = decision;
  if (pick === null || pick === undefined) {
    return null;
  }
  if (pick === CURRENT) {
    return CURRENT;
  }
  if (!element.versions[pick]) {
    return null;
  }
  // Selected text the agent has since rewritten: the creator confirms the
  // new wording with a click of their own.
  return decision.pickFrom !== wordingOf(element, pick) ? element.final : pick;
}

export function liveEdits(decisions: Decisions, element: ReviewElementModel, ref: VersionRef) {
  const version = versionAt(element, ref);
  const edits = decisions[element.name]?.edits?.[String(ref)];
  if (!version || !edits) {
    return {};
  }
  const live: Record<string, string> = {};
  for (const [field, edit] of Object.entries(edits)) {
    if (version.values[field] === edit.from) {
      live[field] = edit.text;
    }
  }
  return live;
}

export function liveComment(
  decisions: Decisions,
  element: ReviewElementModel,
  ref: VersionRef,
  fingerprint: string,
) {
  const comment = decisions[element.name]?.comments?.[String(ref)];
  if (!comment || comment.from !== wordingOf(element, ref)) {
    return '';
  }
  // Sent, and the page was republished since: the agent has acted on it,
  // even if the wording did not change.
  if (comment.sentOn && comment.sentOn !== fingerprint) {
    return '';
  }
  return comment.text;
}

// A request remembers how many versions there were; once a republish adds
// versions, it has been answered.
export function liveRequests(decisions: Decisions, element: ReviewElementModel) {
  return (decisions[element.name]?.requests ?? []).filter(
    (request) => request.versions >= element.versions.length,
  );
}

export function hasNews(decisions: Decisions, element: ReviewElementModel, fingerprint: string) {
  const pick = pickOf(decisions, element);
  if (liveRequests(decisions, element).some((request) => request.text.trim())) {
    return true;
  }
  if (pick === null) {
    return element.final !== null;
  }
  if (pick !== element.final) {
    return true;
  }
  if (Object.keys(liveEdits(decisions, element, pick)).length) {
    return true;
  }
  return !!liveComment(decisions, element, pick, fingerprint).trim();
}

const oneLine = (value: string) => value.trim().replace(/\s*\n\s*/g, ' / ');

// The text the reader pastes to their agent. It writes the chosen wording out
// in full, because by the time it is pasted the agent may no longer have the
// page in context. Its shape is a contract: agents parse it.
export function decisionsMessage(
  title: string,
  elements: ReviewElementModel[],
  decisions: Decisions,
  fingerprint: string,
) {
  const lines = [`Content review decisions: ${title}`];
  const pending: string[] = [];
  for (const element of elements) {
    const pick = pickOf(decisions, element);
    if (!hasNews(decisions, element, fingerprint)) {
      if (element.changed && pick === null) {
        pending.push(element.name);
      }
      continue;
    }
    lines.push('');
    if (pick === null && element.final !== null) {
      lines.push(`${element.name}: no longer final`);
    } else if (pick === CURRENT) {
      lines.push(`${element.name}: keep the current text`);
    } else if (pick === null) {
      lines.push(`${element.name}: no version chosen`);
    } else {
      const version = element.versions[pick];
      const edits = liveEdits(decisions, element, pick);
      const edited = Object.keys(edits).length ? ', with my edits' : '';
      const label = version.label ? ` "${version.label}"` : '';
      lines.push(`${element.name}: Version ${pick + 1}${label}${edited}`);
      for (const field of version.fields) {
        const value = edits[field] ?? version.values[field];
        if (value) {
          lines.push(`  ${field}: ${value}${field in edits ? '  (my edit)' : ''}`);
        }
      }
    }
    const comment = pick === null ? '' : liveComment(decisions, element, pick, fingerprint);
    if (comment.trim()) {
      lines.push(`  Comments: ${oneLine(comment)}`);
    }
    for (const request of liveRequests(decisions, element)) {
      if (request.text.trim()) {
        lines.push(`  Add another version: ${oneLine(request.text)}`);
      }
    }
  }
  if (pending.length) {
    lines.push('', `Not selected yet: ${pending.join(', ')}`);
  }
  return lines.join('\n');
}

// --- updates: each returns a new Decisions object -------------------------

const entry = (decisions: Decisions, name: string): ElementDecision =>
  structuredClone(decisions[name] ?? {});

export function setPick(
  decisions: Decisions,
  element: ReviewElementModel,
  ref: VersionRef,
  on: boolean,
): Decisions {
  const decision = entry(decisions, element.name);
  if (on) {
    decision.pick = ref;
    decision.pickFrom = wordingOf(element, ref);
  } else if (pickOf(decisions, element) === ref) {
    decision.pick = null;
  }
  return { ...decisions, [element.name]: decision };
}

// Editing a version is choosing it: nobody rewords the one they don't want.
// Typing the original wording back drops the edit.
export function setEdit(
  decisions: Decisions,
  element: ReviewElementModel,
  ref: number,
  field: string,
  value: string,
): Decisions {
  const version = element.versions[ref];
  const original = version.values[field] ?? '';
  const decision = entry(decisions, element.name);
  const edits = { ...decision.edits?.[String(ref)] };
  if (value === original) {
    delete edits[field];
  } else {
    edits[field] = { text: value, from: original };
  }
  decision.edits = { ...decision.edits, [String(ref)]: edits };
  if (!Object.keys(edits).length) {
    delete decision.edits[String(ref)];
  } else if (pickOf(decisions, element) !== ref) {
    decision.pick = ref;
    decision.pickFrom = wordingOf(element, ref);
  }
  return { ...decisions, [element.name]: decision };
}

export function setComment(
  decisions: Decisions,
  element: ReviewElementModel,
  ref: VersionRef,
  value: string,
): Decisions {
  const decision = entry(decisions, element.name);
  decision.comments = {
    ...decision.comments,
    [String(ref)]: { text: value, from: wordingOf(element, ref) },
  };
  return { ...decisions, [element.name]: decision };
}

export function setRequests(
  decisions: Decisions,
  element: ReviewElementModel,
  texts: string[],
): Decisions {
  const decision = entry(decisions, element.name);
  decision.requests = texts.map((value) => ({ text: value, versions: element.versions.length }));
  return { ...decisions, [element.name]: decision };
}

export function markCommentsSent(
  decisions: Decisions,
  elements: ReviewElementModel[],
  fingerprint: string,
): Decisions {
  const next = structuredClone(decisions);
  for (const element of elements) {
    const pick = pickOf(decisions, element);
    const comment = pick === null ? undefined : next[element.name]?.comments?.[String(pick)];
    if (comment && liveComment(decisions, element, pick!, fingerprint).trim()) {
      comment.sentOn = fingerprint;
    }
  }
  return next;
}

// Saved per browser, under the page's path and the review's title. Where
// storage is blocked (a data: URL, a private window) decisions live in
// memory for as long as the page is open.
export function storageKey(title: string) {
  const path =
    typeof location === 'undefined' || location.protocol === 'data:' ? '' : location.pathname;
  return `htmdx-content-review:${path}|${title}`;
}

export function loadDecisions(key: string): Decisions {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(key) ?? 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export function saveDecisions(key: string, decisions: Decisions) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(decisions));
  } catch {
    // Memory only.
  }
}
