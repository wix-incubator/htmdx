import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { BodyContractError, parseComponentBody } from '../../body-contracts';
import { decodeHtmlEntities } from '../../rendering';
import { ReviewElement } from '../ReviewElement/ReviewElement';
import { ReviewMockup } from '../ReviewMockup/ReviewMockup';
import { ReviewScreen } from '../ReviewScreen/ReviewScreen';
import { ReviewVersion } from '../ReviewVersion/ReviewVersion';

// ContentReview receives its source as compiled React children. This module
// turns them into plain data the review draws from, and rejects the mistakes
// an author can make that would otherwise render a quietly wrong review.

export const CURRENT = 'current';
export type VersionRef = number | typeof CURRENT;

export type ReviewVersionModel = {
  ref: VersionRef;
  label: string;
  why: string;
  assumptions: string[];
  // Where wording the current text never said came from.
  sourced: string;
  updated: string;
  // The wording as authored, before inheriting Before's fields.
  authored: Record<string, string>;
  // What renders: Before's fields, then this version's, then the creator's
  // edits the agent wrote back.
  values: Record<string, string>;
  edited: Record<string, string>;
  fields: string[];
  mockup: ReactNode;
  // A version with its own mockup is a different component, so its fields
  // are not diffed against Before word by word.
  replaced: boolean;
};

export type ReviewElementModel = {
  name: string;
  key: string;
  description: string;
  group: string;
  screen?: ReviewScreenModel;
  highlight?: { x: number; y: number; w: number; h: number };
  changed: boolean;
  final: VersionRef | null;
  flag: string;
  flagAnchor: string;
  link?: { label: string; url: string };
  before?: ReviewVersionModel;
  versions: ReviewVersionModel[];
};

export type ReviewScreenModel = { name: string; src: string; alt: string };

export type ReviewModel = {
  overview: ReactNode[];
  elements: ReviewElementModel[];
};

type Props = Record<string, unknown> & { children?: ReactNode };

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<Props>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

function ofType(nodes: ReactNode[], type: unknown) {
  return nodes.filter(
    (node): node is ReactElement<Props> => isValidElement<Props>(node) && node.type === type,
  );
}

// Letters in any script are kept, so a Hebrew or Japanese element name still
// gets its own key instead of collapsing to a positional one.
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'element';

const text = (value: unknown) => (typeof value === 'string' ? value : '');

function stringRecord(value: unknown, where: string): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${where} must be a JSON object of field names to text`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([field, fieldText]) => {
      if (typeof fieldText !== 'string') {
        throw new Error(`${where} field "${field}" must be text`);
      }
      return [field, fieldText];
    }),
  );
}

function parseVersionRows(body: string) {
  const rows = parseComponentBody('ReviewVersion', 'label-value-list', body, (parsed) => {
    const seen = new Set<string>();
    parsed.forEach(({ label }, index) => {
      if (!FIELD_NAME.test(label) || seen.has(label)) {
        throw new BodyContractError(
          `"${label}" is not a usable field name; use each name once, letters and digits only`,
          "one '- field: text' row per CopyField, e.g. '- title: No brands yet'",
          { line: index + 1 },
        );
      }
      seen.add(label);
    });
  });
  return Object.fromEntries(rows.map(({ label, value }) => [label, decodeHtmlEntities(value)]));
}

function buildElement(
  element: ReactElement<Props>,
  screens: Map<string, ReviewScreenModel>,
  key: string,
): ReviewElementModel {
  const props = element.props;
  const name = text(props.name);
  const where = `<ReviewElement name="${name}">`;
  const nodes = flatten(props.children);

  const mockups = new Map<string, ReactNode>();
  for (const mockup of ofType(nodes, ReviewMockup)) {
    const id = text(mockup.props.name);
    if (mockups.has(id)) {
      throw new Error(
        `${where} has two <ReviewMockup>s${id ? ` named "${id}"` : ' without a name'}`,
      );
    }
    mockups.set(id, mockup.props.children);
  }

  let before: ReviewVersionModel | undefined;
  const versions: ReviewVersionModel[] = [];
  for (const version of ofType(nodes, ReviewVersion)) {
    const versionProps = version.props;
    const current = versionProps.current === true;
    const mockupId = text(versionProps.mockup);
    if (!mockups.has(mockupId)) {
      throw new Error(
        mockupId
          ? `${where}: no <ReviewMockup name="${mockupId}"> for a version to use`
          : `${where} needs a <ReviewMockup> to show its versions in`,
      );
    }
    if (current && before) {
      throw new Error(`${where} has more than one <ReviewVersion current>`);
    }
    const authored = parseVersionRows(text(versionProps.body));
    const edited = stringRecord(versionProps.edited, `${where} edited`);
    const replaced = !current && mockupId !== '';
    const inherited = !current && !replaced && before ? before.values : {};
    const values = { ...inherited, ...authored, ...edited };
    const assumptions = versionProps.assumptions ?? [];
    if (!Array.isArray(assumptions) || assumptions.some((item) => typeof item !== 'string')) {
      throw new Error(`${where} assumptions must be a JSON array of strings`);
    }
    const model: ReviewVersionModel = {
      ref: current ? CURRENT : versions.length,
      label: text(versionProps.label),
      why: text(versionProps.why),
      assumptions: assumptions as string[],
      sourced: text(versionProps.sourced),
      updated: text(versionProps.updated),
      authored,
      values,
      edited,
      fields: Object.keys(values),
      mockup: mockups.get(mockupId),
      replaced,
    };
    if (current) {
      if (versions.length) {
        throw new Error(`${where}: put <ReviewVersion current> before the other versions`);
      }
      before = model;
    } else {
      versions.push(model);
    }
  }

  const changed = props.changed !== false;
  if (changed && (!before || !versions.length)) {
    throw new Error(
      `${where} needs a <ReviewVersion current> and at least one version, or changed="false"`,
    );
  }

  // `final` is 1-based like the "Version N" caption, or "current".
  const finalProp = text(props.final);
  let final: VersionRef | null = null;
  if (finalProp === CURRENT) {
    final = CURRENT;
  } else if (finalProp) {
    final = Number(finalProp) - 1;
    if (!versions[final]) {
      throw new Error(`${where} final="${finalProp}" does not name a version`);
    }
  }

  const screenName = text(props.screen);
  const screen = screenName ? screens.get(screenName) : undefined;
  if (screenName && !screen) {
    throw new Error(`${where}: no <ReviewScreen name="${screenName}">`);
  }

  return {
    name,
    key,
    description: text(props.description),
    group: text(props.group),
    screen,
    highlight: props.highlight as ReviewElementModel['highlight'],
    changed,
    final,
    flag: text(props.flag),
    flagAnchor: text(props.flagAnchor),
    link: props.link as ReviewElementModel['link'],
    before,
    versions,
  };
}

export function buildReviewModel(children: ReactNode): ReviewModel {
  const nodes = flatten(children);
  const screens = new Map<string, ReviewScreenModel>();
  for (const screen of ofType(nodes, ReviewScreen)) {
    const name = text(screen.props.name);
    screens.set(name, { name, src: text(screen.props.src), alt: text(screen.props.alt) });
  }

  const names = new Set<string>();
  const keys = new Set<string>();
  const elements = ofType(nodes, ReviewElement).map((element) => {
    const name = text(element.props.name);
    if (names.has(name)) {
      throw new Error(`two <ReviewElement>s are named "${name}"; decisions are keyed by name`);
    }
    names.add(name);
    const base = slug(name);
    let key = base;
    for (let n = 2; keys.has(key); n += 1) {
      key = `${base}-${n}`;
    }
    keys.add(key);
    return buildElement(element, screens, key);
  });

  const overview = nodes.filter(
    (node) =>
      !(isValidElement(node) && (node.type === ReviewElement || node.type === ReviewScreen)) &&
      !(typeof node === 'string' && !node.trim()),
  );
  return { overview, elements };
}

// Changes whenever the reviewed content does, so the page can tell a comment
// that was sent and answered from one sent and not yet pasted. `revision` is
// raised by the agent on every republish, so a republish that changed no
// wording (a question answered) still counts.
export function reviewFingerprint(model: ReviewModel, revision: number) {
  const source = JSON.stringify(
    model.elements.map(({ name, final, before, versions }) => [
      name,
      final,
      [before, ...versions].map((version) => version && [version.label, version.values]),
    ]),
  );
  let hash = revision;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }
  return String(hash);
}
