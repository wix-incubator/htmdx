import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createArtifactStory, type ArtifactStoryArgs } from '../storybook/artifact-story';
import executiveDecisionReportHtml from './executive-decision-report.html?raw';

const meta = {
  title: 'Artifacts/Executive Decision Report',
  ...createArtifactStory(executiveDecisionReportHtml),
} satisfies Meta<ArtifactStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
