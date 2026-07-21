import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  createComponentStory,
  createHtmdxHost,
  type ComponentStoryArgs,
} from '../../../storybook/component-story';
import { BulletList } from './index';

const meta = {
  title: 'Components/Built-ins/BulletList',
  ...createComponentStory(BulletList),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Each bullet link slugifies its text and scrolls to the matching `## section`.
// The filler paragraphs give the sections enough height that the smooth scroll
// is visible when a link is clicked.
const filler = Array.from(
  { length: 8 },
  () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
).join(' ');

export const WithSections: Story = {
  render: () =>
    createHtmdxHost(
      [
        '<BulletList>',
        '- Catalog V3 Modifiers - support only FREE_TEXT and choice types today',
        '- Media Manager - already exposes upload URLs the runtime can reuse',
        '- Storefront FileUploader - exists but is not wired into product options',
        '</BulletList>',
        '',
        '## Catalog V3 Modifiers',
        '',
        filler,
        '',
        '## Media Manager',
        '',
        filler,
        '',
        '## Storefront FileUploader',
        '',
        filler,
      ].join('\n'),
    ),
};
