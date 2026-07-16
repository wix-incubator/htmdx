import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { evidence } from './evidence';

const meta = {
  title: 'Components/default/Evidence',
  ...createComponentStory(evidence),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
