import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../storybook/component-story';
import { callout } from './markdown';

const meta = {
  title: 'Components/default/Callout',
  ...createComponentStory(callout),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
