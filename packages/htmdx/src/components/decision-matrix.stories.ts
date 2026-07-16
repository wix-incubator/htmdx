import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { decisionMatrix } from './decision-matrix';

const meta = {
  title: 'Components/default/DecisionMatrix',
  ...createComponentStory(decisionMatrix),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
