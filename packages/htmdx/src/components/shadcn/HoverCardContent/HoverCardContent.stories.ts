import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { HoverCardContent as definition } from './index';

const meta = {
  id: 'components-shadcn-hovercardcontent',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const HoverCardContent: StoryObj = {};
