import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createReviewPartStory } from '../shared/review-story';
import { ReviewScreen } from './index';

const meta = {
  title: 'Components/Built-ins/ReviewScreen',
  ...createReviewPartStory(ReviewScreen),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
