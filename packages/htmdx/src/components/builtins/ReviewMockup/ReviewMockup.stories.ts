import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createReviewPartStory } from '../shared/review-story';
import { ReviewMockup } from './index';

const meta = {
  title: 'Components/Built-ins/ReviewMockup',
  ...createReviewPartStory(ReviewMockup),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
