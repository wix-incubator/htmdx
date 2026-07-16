export type HtmdxBodyFormat =
  | 'markdown'
  | 'label-value-list'
  | 'label-number-list'
  | 'gfm-table'
  | 'markdown-list-cards';

import type { GfmTable, LabelNumber, LabelValue, MarkdownListCards } from './body-contracts';
import type { ComponentType } from 'react';

// oxlint-disable-next-line no-explicit-any -- built-in prop shapes vary by body contract
export type HtmdxBuiltInComponent = ComponentType<any>;

export type ParsedBodyByFormat = {
  markdown: string;
  'label-value-list': LabelValue[];
  'label-number-list': LabelNumber[];
  'gfm-table': GfmTable;
  'markdown-list-cards': MarkdownListCards;
};

export type HtmdxParsedBody = ParsedBodyByFormat[HtmdxBodyFormat];

export type HtmdxComponentForFormat<F extends HtmdxBodyFormat> = {
  name: string;
  body: F;
  purpose: string;
  example: string;
  component: HtmdxBuiltInComponent;
  validate?: (body: ParsedBodyByFormat[F]) => void;
};

export type HtmdxComponent = {
  [F in HtmdxBodyFormat]: HtmdxComponentForFormat<F>;
}[HtmdxBodyFormat];
