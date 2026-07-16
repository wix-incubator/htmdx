import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../storybook/component-story';
import { audience } from './audience';

const meta = {
  title: 'Components/default/Audience',
  ...createComponentStory(audience),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
