import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { CardContent as definition } from './index';

const meta = {
  id: 'components-shadcn-cardcontent',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const CardContent: StoryObj = {};
