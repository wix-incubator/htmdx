import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createArtifactStory, type ArtifactStoryArgs } from '../storybook/artifact-story';
import productSpecDatePickerHtml from './product-spec-datepicker-component.html?raw';

const meta = {
  title: 'Artifacts/Product Spec · DatePicker Component',
  ...createArtifactStory(productSpecDatePickerHtml),
} satisfies Meta<ArtifactStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
