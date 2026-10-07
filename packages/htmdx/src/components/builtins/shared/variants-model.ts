import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { BodyContractError, parseComponentBody } from '../../body-contracts';
import { decodeHtmlEntities } from '../../rendering';
import { Variant } from '../Variant/Variant';
import { VariantTemplate } from '../VariantTemplate/VariantTemplate';

// Variants receives its source as compiled React children. This module turns
// them into plain data, and rejects the mistakes an author can make that would
// otherwise render a quietly wrong comparison.

export const CURRENT = 'current';
export type VariantRef = number | typeof CURRENT;

export type VariantModel = {
  ref: VariantRef;
  label: string;
  why: string;
  assumptions: string[];
  // Where wording the current text never said came from.
  sourced: string;
  badge: string;
  badgeTip: string;
  // The text as authored, before inheriting the current variant's slots.
  authored: Record<string, string>;
  // What renders: the current variant's slots, then this variant's, then its
  // overrides.
  values: Record<string, string>;
  overrides: Record<string, string>;
  slots: string[];
  template: ReactNode;
  // A variant with its own template is a different component, so its slots
  // are not diffed against the current text word by word.
  replaced: boolean;
};

export type VariantsModel = {
  name: string;
  chosen: VariantRef | null;
  chosenLabel: string;
  flag: string;
  flagAnchor: string;
  flagLabel: string;
  current?: VariantModel;
  variants: VariantModel[];
};

type Props = Record<string, unknown> & { children?: ReactNode };

const SLOT_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<Props>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

export function ofType(nodes: ReactNode[], type: unknown) {
  return nodes.filter(
    (node): node is ReactElement<Props> => isValidElement<Props>(node) && node.type === type,
  );
}

// Letters in any script are kept, so a Hebrew or Japanese title still gets its
// own key instead of collapsing to a positional one.
export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'item';

export const text = (value: unknown) => (typeof value === 'string' ? value : '');

function stringRecord(value: unknown, where: string): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${where} must be a JSON object of slot names to text`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([slot, slotText]) => {
      if (typeof slotText !== 'string') {
        throw new Error(`${where} slot "${slot}" must be text`);
      }
      return [slot, slotText];
    }),
  );
}

function parseRows(body: string) {
  const rows = parseComponentBody('Variant', 'label-value-list', body, (parsed) => {
    const seen = new Set<string>();
    parsed.forEach(({ label }, index) => {
      if (!SLOT_NAME.test(label) || seen.has(label)) {
        throw new BodyContractError(
          `"${label}" is not a usable slot name; use each name once, letters and digits only`,
          "one '- slot: text' row per TextSlot, e.g. '- title: No brands yet'",
          { line: index + 1 },
        );
      }
      seen.add(label);
    });
  });
  return Object.fromEntries(rows.map(({ label, value }) => [label, decodeHtmlEntities(value)]));
}

export function readVariants(props: Props): VariantsModel {
  const name = text(props.name);
  const where = name ? `<Variants name="${name}">` : '<Variants>';
  const nodes = flatten(props.children);

  const templates = new Map<string, ReactNode>();
  for (const template of ofType(nodes, VariantTemplate)) {
    const id = text(template.props.name);
    if (templates.has(id)) {
      throw new Error(
        `${where} has two <VariantTemplate>s${id ? ` named "${id}"` : ' without a name'}`,
      );
    }
    templates.set(id, template.props.children);
  }

  let current: VariantModel | undefined;
  const variants: VariantModel[] = [];
  for (const variant of ofType(nodes, Variant)) {
    const variantProps = variant.props;
    const isCurrent = variantProps.current === true;
    const templateName = text(variantProps.template);
    if (!templates.has(templateName)) {
      throw new Error(
        templateName
          ? `${where}: no <VariantTemplate name="${templateName}"> for a variant to use`
          : `${where} needs a <VariantTemplate> to draw its variants with`,
      );
    }
    if (isCurrent && current) {
      throw new Error(`${where} has more than one <Variant current>`);
    }
    if (isCurrent && variants.length) {
      throw new Error(`${where}: put <Variant current> before the other variants`);
    }
    const authored = parseRows(text(variantProps.body));
    const overrides = stringRecord(variantProps.overrides, `${where} overrides`);
    const replaced = !isCurrent && templateName !== '';
    const inherited = !isCurrent && !replaced && current ? current.values : {};
    const values = { ...inherited, ...authored, ...overrides };
    const assumptions = variantProps.assumptions ?? [];
    if (!Array.isArray(assumptions) || assumptions.some((item) => typeof item !== 'string')) {
      throw new Error(`${where} assumptions must be a JSON array of strings`);
    }
    const model: VariantModel = {
      ref: isCurrent ? CURRENT : variants.length,
      label: text(variantProps.label),
      why: text(variantProps.why),
      assumptions: assumptions as string[],
      sourced: text(variantProps.sourced),
      badge: text(variantProps.badge),
      badgeTip: text(variantProps.badgeTip),
      authored,
      values,
      overrides,
      slots: Object.keys(values),
      template: templates.get(templateName),
      replaced,
    };
    if (isCurrent) {
      current = model;
    } else {
      variants.push(model);
    }
  }

  if (!current && !variants.length) {
    throw new Error(`${where} needs at least one <Variant>`);
  }

  // `chosen` is 1-based like the "Version N" caption, or "current".
  const chosenProp = text(props.chosen);
  let chosen: VariantRef | null = null;
  if (chosenProp === CURRENT) {
    if (!current) {
      throw new Error(`${where} chosen="current" needs a <Variant current>`);
    }
    chosen = CURRENT;
  } else if (chosenProp) {
    chosen = Number(chosenProp) - 1;
    if (!variants[chosen]) {
      throw new Error(`${where} chosen="${chosenProp}" does not name a variant`);
    }
  }

  return {
    name,
    chosen,
    chosenLabel: text(props.chosenLabel) || 'Chosen',
    flag: text(props.flag),
    flagAnchor: text(props.flagAnchor),
    flagLabel: text(props.flagLabel) || 'Flag',
    current,
    variants,
  };
}

export function variantAt(model: VariantsModel, ref: VariantRef) {
  return ref === CURRENT ? model.current : model.variants[ref];
}
