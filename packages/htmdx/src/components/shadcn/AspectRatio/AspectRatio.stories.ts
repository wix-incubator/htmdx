import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../../index';
import { injectShadcnTheme } from '../shared/theme';
import { createHtmdxHost } from '../../../storybook/component-story';
import { AspectRatio as AspectRatioDefinition } from './index';

type AspectRatioStoryArgs = { htmdx: string };

injectShadcnTheme();
register();

const meta = {
  id: 'components-shadcn-aspect-ratio',
  title: 'Components/shadcn',
  args: { htmdx: AspectRatioDefinition.example },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the component catalog.',
    },
  },
  parameters: { layout: 'fullscreen' },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<AspectRatioStoryArgs>;

export default meta;
type Story = StoryObj<AspectRatioStoryArgs>;

export const AspectRatio: Story = {};
