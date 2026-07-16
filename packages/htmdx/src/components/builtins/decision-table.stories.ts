import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../storybook/component-story';
import { decisionTable } from './tables';

const meta = {
  title: 'Components/default/DecisionTable',
  ...createComponentStory(decisionTable),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
