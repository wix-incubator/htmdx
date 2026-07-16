export type HtmdxBodyFormat =
  | 'markdown'
  | 'label-value-list'
  | 'label-number-list'
  | 'gfm-table'
  | 'markdown-list-cards';

import type { GfmTable, LabelNumber, LabelValue, MarkdownListCards } from './body-contracts';

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
  validate?: (body: ParsedBodyByFormat[F]) => void;
};

export type HtmdxComponent = {
  [F in HtmdxBodyFormat]: HtmdxComponentForFormat<F>;
}[HtmdxBodyFormat];
