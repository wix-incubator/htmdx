import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createPartStory } from '../shared/part-story';
import { TextSlot } from './index';

const meta = {
  title: 'Components/Built-ins/TextSlot',
  ...createPartStory(TextSlot),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
