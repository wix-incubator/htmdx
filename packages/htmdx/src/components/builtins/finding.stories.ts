import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../storybook/component-story';
import { finding } from './cards';

const meta = {
  title: 'Components/default/Finding',
  ...createComponentStory(finding),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
