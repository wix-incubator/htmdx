import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { register } from '../../../index';
import { injectShadcnTheme } from '../shared/theme';
import { createHtmdxHost } from '../../../storybook/component-story';
import { Button as ButtonDefinition } from './index';

type ButtonStoryArgs = { htmdx: string };

injectShadcnTheme();
register();

const meta = {
  id: 'components-shadcn-button',
  title: 'Components/shadcn',
  args: { htmdx: ButtonDefinition.example },
  argTypes: {
    htmdx: {
      control: { type: 'text' },
      description: 'Editable HTMDX rendered through the component catalog.',
    },
  },
  parameters: { layout: 'fullscreen' },
  render: ({ htmdx }) => createHtmdxHost(htmdx),
} satisfies Meta<ButtonStoryArgs>;

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Button: Story = {
  args: {
    htmdx:
      '<Card>\n  <CardHeader>\n    <CardTitle>Button variants</CardTitle>\n    <CardDescription>Available visual emphasis levels.</CardDescription>\n  </CardHeader>\n  <CardContent class="flex flex-wrap gap-2">\n    <Button>Default</Button>\n    <Button variant="secondary">Secondary</Button>\n    <Button variant="outline">Outline</Button>\n    <Button variant="ghost">Ghost</Button>\n    <Button variant="destructive">Destructive</Button>\n    <Button variant="link">Link</Button>\n  </CardContent>\n</Card>',
  },
};
