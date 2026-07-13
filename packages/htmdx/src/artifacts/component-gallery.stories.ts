import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createArtifactStory, type ArtifactStoryArgs } from '../storybook/artifact-story';
import componentGalleryHtml from './component-gallery.html?raw';

const meta = {
  title: 'Artifacts/Component Gallery',
  ...createArtifactStory(componentGalleryHtml),
} satisfies Meta<ArtifactStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
