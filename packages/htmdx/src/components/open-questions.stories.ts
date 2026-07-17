import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { openQuestions } from './open-questions';

const meta = {
  title: 'Components/default/OpenQuestions',
  ...createComponentStory(openQuestions),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
