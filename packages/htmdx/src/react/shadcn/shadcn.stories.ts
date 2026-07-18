import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../index';
import { createHtmdxHost } from '../../storybook/component-story';
import { injectShadcnTheme } from './theme';
import { shadcnManifestComponents } from './manifest';

type ReactComponentStoryArgs = {
  htmdx: string;
};

injectShadcnTheme();
register();

const meta = {
  // Keep the flat shadcn navigation while distinguishing this transitional
  // aggregate from colocated component metas.
  id: 'components-shadcn-legacy',
  title: 'Components/shadcn',
  args: {
    htmdx: exampleFor('Tabs'),
  },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the React component registry.',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<ReactComponentStoryArgs>;

export default meta;

type Story = StoryObj<ReactComponentStoryArgs>;

export const Dialog: Story = story('Dialog');
export const HoverCard: Story = story('HoverCard');
export const Popover: Story = story('Popover');
export const Tooltip: Story = story('Tooltip');

function story(name: string): Story {
  return {
    args: {
      htmdx: exampleFor(name),
    },
  };
}

function exampleFor(name: string) {
  const component = shadcnManifestComponents.find((candidate) => candidate.name === name);
  if (!component?.example) {
    throw new Error(`React component "${name}" does not have a canonical example`);
  }
  return component.example;
}
