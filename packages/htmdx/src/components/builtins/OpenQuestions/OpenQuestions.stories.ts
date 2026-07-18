import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../../storybook/component-story';
import { OpenQuestions } from './index';

const meta = {
  title: 'Components/Built-ins/OpenQuestions',
  ...createComponentStory(OpenQuestions),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
