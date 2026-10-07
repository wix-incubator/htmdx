import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createPartStory } from '../shared/part-story';
import { Pages } from './index';

const meta = {
  title: 'Components/Built-ins/Pages',
  ...createPartStory(Pages),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
