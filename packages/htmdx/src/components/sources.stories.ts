import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { sources } from './sources';

const meta = {
  title: 'Components/default/Sources',
  ...createComponentStory(sources),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
