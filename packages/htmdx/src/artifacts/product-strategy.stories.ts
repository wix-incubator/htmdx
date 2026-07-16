import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createArtifactStory, type ArtifactStoryArgs } from '../storybook/artifact-story';
import productStrategyHtml from './product-strategy.html?raw';

const meta = {
  title: 'Artifacts/Product Strategy',
  ...createArtifactStory(productStrategyHtml),
} satisfies Meta<ArtifactStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
