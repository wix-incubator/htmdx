import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createPartStory } from '../shared/part-story';
import { Variant } from './index';

const meta = {
  title: 'Components/Built-ins/Variant',
  ...createPartStory(Variant),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
