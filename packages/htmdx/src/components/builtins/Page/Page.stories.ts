import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createPartStory } from '../shared/part-story';
import { Page } from './index';

const meta = {
  title: 'Components/Built-ins/Page',
  ...createPartStory(Page),
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {};
