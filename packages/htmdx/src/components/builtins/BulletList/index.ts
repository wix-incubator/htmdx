import type { HtmdxComponent } from '../../../component-definition';
import { BulletList as Component } from './BulletList';

export const BulletList = {
  name: 'BulletList',
  purpose:
    'Present items as a bulleted list inside a card. Write one or more `- link - text` rows; the part before the first " - " renders as a primary-colored link, the rest as plain text.',
  example:
    '<BulletList>\n- Catalog V3 Modifiers - support only FREE_TEXT and choice types today\n- Media Manager - already exposes upload URLs the runtime can reuse\n- Storefront FileUploader - exists but is not wired into product options\n</BulletList>',
  body: 'markdown',
  Component,
} as const satisfies HtmdxComponent;
