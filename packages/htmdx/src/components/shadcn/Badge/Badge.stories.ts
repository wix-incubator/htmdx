import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../../index';
import { injectShadcnTheme } from '../../../react/shadcn';
import { createHtmdxHost } from '../../../storybook/component-story';
import { Badge as BadgeDefinition } from './index';

type BadgeStoryArgs = {
  htmdx: string;
};

injectShadcnTheme();
register();

const meta = {
  // Keep the flat shadcn navigation while distinguishing this colocated meta
  // from the transitional aggregate that owns the remaining components.
  id: 'components-shadcn-badge',
  title: 'Components/shadcn',
  args: {
    htmdx: BadgeDefinition.example,
  },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the component catalog.',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<BadgeStoryArgs>;

export default meta;

type Story = StoryObj<BadgeStoryArgs>;

export const Badge: Story = {
  args: {
    htmdx:
      '<Card>\n  <CardHeader>\n    <CardTitle>Badge variants</CardTitle>\n    <CardDescription>Status and label treatments.</CardDescription>\n  </CardHeader>\n  <CardContent class="flex flex-wrap gap-2">\n    <Badge>Default</Badge>\n    <Badge variant="secondary">Secondary</Badge>\n    <Badge variant="destructive">Destructive</Badge>\n    <Badge variant="outline">Outline</Badge>\n  </CardContent>\n</Card>',
  },
};
