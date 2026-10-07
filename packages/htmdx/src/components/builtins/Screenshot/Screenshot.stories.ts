import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createComponentStory, type ComponentStoryArgs } from '../../../storybook/component-story';
import { Screenshot } from './index';

const meta = {
  title: 'Components/Built-ins/Screenshot',
  ...createComponentStory(Screenshot),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
