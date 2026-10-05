import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  createComponentStory,
  createHtmdxHost,
  type ComponentStoryArgs,
} from '../../../storybook/component-story';
import { ContentReview } from './index';

const meta = {
  title: 'Components/Built-ins/ContentReview',
  ...createComponentStory(ContentReview),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// Open "Empty state" to select, edit, comment on, or ask for a version; the
// Copy to agent pill appears once there is something to send.
export const Default: Story = {};

// A settled element: the Final version sits under Before, the rest fold away,
// and a rewritten version carries an Updated tag until it is selected again.
export const Settled: Story = {
  render: () =>
    createHtmdxHost(
      ContentReview.example
        .replace(
          '<ContentReview title="Brand filter">',
          '<ContentReview title="Brand filter (settled)" revision="2">',
        )
        .replace('flagAnchor="cta">', 'flagAnchor="cta" final="1">')
        .replace(
          '<ReviewVersion label="Short and plain"',
          '<ReviewVersion label="Short and plain" updated="Dropped the body line, as you asked."',
        )
        .replace(
          'assumptions=\'["Customers only see the filter once a brand exists."]\'>',
          'assumptions=\'["Customers only see the filter once a brand exists."]\' edited=\'{"cta":"Add a brand"}\'>',
        ),
    ),
};
