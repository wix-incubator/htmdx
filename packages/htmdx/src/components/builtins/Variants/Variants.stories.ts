import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  createComponentStory,
  createHtmdxHost,
  type ComponentStoryArgs,
} from '../../../storybook/component-story';
import { Variants } from './index';

const meta = {
  title: 'Components/Built-ins/Variants',
  ...createComponentStory(Variants),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// A settled comparison: the chosen variant sits under the current one and the
// rest fold away; a badge marks a variant that changed.
export const Chosen: Story = {
  render: () =>
    createHtmdxHost(
      Variants.example
        .replace('flagAnchor="cta">', 'flagAnchor="cta" chosen="1" chosenLabel="Final">')
        .replace(
          '<Variant label="Short and plain"',
          '<Variant label="Short and plain" badge="Updated" badgeTip="Dropped the body line."',
        ),
    ),
};
