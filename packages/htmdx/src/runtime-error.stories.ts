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
