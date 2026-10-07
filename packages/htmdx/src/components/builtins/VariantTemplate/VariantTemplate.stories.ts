import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createPartStory } from '../shared/part-story';
import { VariantTemplate } from './index';

const meta = {
  title: 'Components/Built-ins/VariantTemplate',
  ...createPartStory(VariantTemplate),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
