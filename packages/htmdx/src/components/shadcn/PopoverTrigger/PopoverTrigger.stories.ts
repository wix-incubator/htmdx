import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { PopoverTrigger as definition } from './index';

const meta = {
  id: 'components-shadcn-popovertrigger',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const PopoverTrigger: StoryObj = {};
