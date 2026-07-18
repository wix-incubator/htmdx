import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../../index';
import { injectShadcnTheme } from '../../../react/shadcn';
import { createHtmdxHost } from '../../../storybook/component-story';
import { Progress as ProgressDefinition } from './index';

type ProgressStoryArgs = { htmdx: string };

injectShadcnTheme();
register();

const meta = {
  id: 'components-shadcn-progress',
  title: 'Components/shadcn',
  args: { htmdx: ProgressDefinition.example },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the component catalog.',
    },
  },
  parameters: { layout: 'fullscreen' },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<ProgressStoryArgs>;

export default meta;
type Story = StoryObj<ProgressStoryArgs>;

export const Progress: Story = {};
