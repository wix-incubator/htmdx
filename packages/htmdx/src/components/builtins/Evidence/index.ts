import type { HtmdxComponent } from '../../../component-definition';
import { Evidence as Component, bodyFormat } from './Evidence';

export const Evidence = {
  name: 'Evidence',
  purpose:
    'List evidence that supports the surrounding analysis. Write one or more `- item` rows; use `**Title:** details` to label an evidence card.',
  example:
    '<Evidence>\n- **Runtime:** The allowlist currently lives in implementation code.\n</Evidence>',
  body: 'markdown',
  bodyFormat,
  Component,
} as const satisfies HtmdxComponent;
