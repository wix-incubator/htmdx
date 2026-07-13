import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { executiveSummary } from './executive-summary';

const meta = {
  title: 'Components/ExecutiveSummary',
  ...createComponentStory(executiveSummary),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
