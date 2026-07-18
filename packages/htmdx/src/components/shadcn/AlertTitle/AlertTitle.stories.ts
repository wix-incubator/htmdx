import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { AlertTitle as definition } from './index';

const meta = {
  id: 'components-shadcn-alerttitle',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const AlertTitle: StoryObj = {};
