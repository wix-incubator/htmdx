export type HtmdxBodyFormat =
  | 'markdown'
  | 'label-value-list'
  | 'label-number-list'
  | 'gfm-table'
  | 'markdown-list-cards';

export type HtmdxComponentRenderer = (name: string, body: string) => string;

export type HtmdxComponent = {
  name: string;
  body: HtmdxBodyFormat;
  purpose: string;
  example: string;
  renderer: HtmdxComponentRenderer;
  validate?: (body: string) => void;
};
