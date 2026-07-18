import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../../storybook/component-story';
import { SignalGrid } from './index';

const meta = {
  title: 'Components/Built-ins/SignalGrid',
  ...createComponentStory(SignalGrid),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
