import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from './index';
import { createHtmdxHost } from './storybook/component-story';

type RuntimeErrorStoryArgs = {
  htmdx: string;
};

register();

const meta = {
  title: 'Feedback/Error',
  args: {
    htmdx: '<Card>never closed',
  },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Invalid HTMDX used to trigger the runtime error feedback.',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<RuntimeErrorStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SyntaxError: Story = {};

// Everything that compiles still renders; the two failures become cards in
// place, under a banner that copies a fix request for both at once.
export const DegradedBlocks: StoryObj<RuntimeErrorStoryArgs> = {
  args: {
    htmdx: `# Importer Rollout

<ExecutiveSummary>
Ship the bulk importer to the remaining **80%** of stores in four weekly waves.
</ExecutiveSummary>

## Priorities

<RiskTable>
- **Must-have:** Publish the field-mapping table before wave one.
- Ship a dry-run mode
</RiskTable>

## Rollout by wave

<ChartBar unit="stores">
- Wave 1: 120
- Wave 2: 240
</ChartBar>

<Callout>
**Owner:** platform team.
</Callout>`,
  },
};
