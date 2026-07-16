import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { chartLine } from './chart-line';

const meta = {
  title: 'Components/default/ChartLine',
  ...createComponentStory(chartLine),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
