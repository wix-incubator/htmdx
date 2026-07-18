import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { renderShadcnStory } from '../shared/story';
import { AccordionTrigger as definition } from './index';

const meta = {
  id: 'components-shadcn-accordiontrigger',
  title: 'Components/shadcn',
  parameters: { layout: 'fullscreen' },
  render: () => renderShadcnStory(definition),
} satisfies Meta;
export default meta;
export const AccordionTrigger: StoryObj = {};
