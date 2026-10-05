import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createReviewPartStory } from '../shared/review-story';
import { ReviewVersion } from './index';

const meta = {
  title: 'Components/Built-ins/ReviewVersion',
  ...createReviewPartStory(ReviewVersion),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
