import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../storybook/component-story';
import { chartArea } from './charts';

const meta = {
  title: 'Components/default/ChartArea',
  ...createComponentStory(chartArea),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
