import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { BreadcrumbSeparator as definition } from './index';

const meta = {
  id: 'components-shadcn-breadcrumbseparator',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const BreadcrumbSeparator: StoryObj = {};
