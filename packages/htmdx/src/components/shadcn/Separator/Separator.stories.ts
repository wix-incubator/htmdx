import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../../index';
import { injectShadcnTheme } from '../../../react/shadcn';
import { createHtmdxHost } from '../../../storybook/component-story';
import { Separator as SeparatorDefinition } from './index';

type SeparatorStoryArgs = { htmdx: string };

injectShadcnTheme();
register();

const meta = {
  id: 'components-shadcn-separator',
  title: 'Components/shadcn',
  args: { htmdx: SeparatorDefinition.example },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the component catalog.',
    },
  },
  parameters: { layout: 'fullscreen' },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<SeparatorStoryArgs>;

export default meta;
type Story = StoryObj<SeparatorStoryArgs>;

export const Separator: Story = {};
