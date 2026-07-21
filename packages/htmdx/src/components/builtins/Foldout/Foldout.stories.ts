import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  createComponentStory,
  createHtmdxHost,
  type ComponentStoryArgs,
} from '../../../storybook/component-story';
import { Foldout } from './index';

const meta = {
  title: 'Components/Built-ins/Foldout',
  ...createComponentStory(Foldout),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// Collapsed by default; click the header to expand the plain-text body.
export const Default: Story = {};

// The body is flexible — here it holds a nested chart to show it renders any
// registered component, not just text.
export const WithRichContent: Story = {
  render: () =>
    createHtmdxHost(
      [
        '<Foldout title="Quarterly revenue" open>',
        '<ChartBar>',
        '- Q1: 120',
        '- Q2: 150',
        '- Q3: 170',
        '- Q4: 210',
        '</ChartBar>',
        '</Foldout>',
      ].join('\n'),
    ),
};
