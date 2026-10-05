import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createReviewPartStory } from '../shared/review-story';
import { ReviewElement } from './index';

const meta = {
  title: 'Components/Built-ins/ReviewElement',
  ...createReviewPartStory(ReviewElement),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
