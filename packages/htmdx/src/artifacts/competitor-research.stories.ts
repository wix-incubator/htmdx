import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { createArtifactStory, type ArtifactStoryArgs } from '../storybook/artifact-story';
import competitorResearchHtml from './competitor-research.html?raw';

function extractEnhancers(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('script[data-ck-enhancer]'))
    .map((s) => s.textContent ?? '')
    .join('\n');
}

const base = createArtifactStory(competitorResearchHtml);
const enhancerCode = extractEnhancers(competitorResearchHtml);
const ENHANCER_ID = 'ck-competitor-research-enhancer';

const meta = {
  title: 'Artifacts/Competitor Research',
  ...base,
  render: (args: ArtifactStoryArgs) => {
    // Clean up any previous enhancer injection before re-render
    document.getElementById(ENHANCER_ID)?.remove();
    document.getElementById('ck-artifact-base-styles')?.remove();
    document.getElementById('ck-matrix-filter-styles')?.remove();

    const host = (base.render as (args: ArtifactStoryArgs) => Element)(args);

    // The enhancer uses a MutationObserver so injecting it now is safe —
    // it will fire as htmdx renders its content into the DOM.
    const script = document.createElement('script');
    script.id = ENHANCER_ID;
    script.textContent = enhancerCode;
    document.body.appendChild(script);

    return host;
  },
} satisfies Meta<ArtifactStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
