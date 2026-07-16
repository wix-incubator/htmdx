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
  title: 'Components/shadcn',
  args: {
    htmdx: exampleFor('Card'),
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

export const Card: Story = story('Card');
export const CardWithRegularText: Story = {
  args: {
    htmdx:
      '<Card>\n  <CardContent>Regular text is padded inside the card content.</CardContent>\n</Card>',
  },
};
export const Badge: Story = {
  args: {
    htmdx:
      '<Card>\n  <CardHeader>\n    <CardTitle>Badge variants</CardTitle>\n    <CardDescription>Status and label treatments.</CardDescription>\n  </CardHeader>\n  <CardContent class="flex flex-wrap gap-2">\n    <Badge>Default</Badge>\n    <Badge variant="secondary">Secondary</Badge>\n    <Badge variant="destructive">Destructive</Badge>\n    <Badge variant="outline">Outline</Badge>\n  </CardContent>\n</Card>',
  },
};
export const Button: Story = {
  args: {
    htmdx:
      '<Card>\n  <CardHeader>\n    <CardTitle>Button variants</CardTitle>\n    <CardDescription>Available visual emphasis levels.</CardDescription>\n  </CardHeader>\n  <CardContent class="flex flex-wrap gap-2">\n    <Button>Default</Button>\n    <Button variant="secondary">Secondary</Button>\n    <Button variant="outline">Outline</Button>\n    <Button variant="ghost">Ghost</Button>\n    <Button variant="destructive">Destructive</Button>\n    <Button variant="link">Link</Button>\n  </CardContent>\n</Card>',
  },
};
export const Tabs: Story = story('Tabs');
export const Accordion: Story = story('Accordion');
export const Alert: Story = story('Alert');
export const AspectRatio: Story = story('AspectRatio');
export const Avatar: Story = story('Avatar');
export const Breadcrumb: Story = story('Breadcrumb');
export const Collapsible: Story = story('Collapsible');
export const Dialog: Story = story('Dialog');
export const HoverCard: Story = story('HoverCard');
export const Popover: Story = story('Popover');
export const Progress: Story = story('Progress');
export const Separator: Story = story('Separator');
export const Table: Story = story('Table');
export const Toggle: Story = story('Toggle');
export const ToggleGroup: Story = story('ToggleGroup');
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
