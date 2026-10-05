import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createReviewPartStory } from '../shared/review-story';
import { CopyField } from './index';

const meta = {
  title: 'Components/Built-ins/CopyField',
  ...createReviewPartStory(CopyField),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
