import type { Meta } from '@storybook/web-components-vite';
import { register } from '../index';
import { injectShadcnTheme } from '../components/shadcn';
import { createHtmdxHost } from './component-story';

export type ArtifactStoryArgs = {
  htmdx: string;
};

export function createArtifactStory(
  artifactHtml: string,
): Pick<Meta<ArtifactStoryArgs>, 'args' | 'argTypes' | 'parameters' | 'render'> {
  injectShadcnTheme();
  register();

  return {
    args: {
      htmdx: extractEmbeddedHtmdx(artifactHtml),
    },
    argTypes: {
      htmdx: {
        control: { type: 'text' },
        description: 'The editable HTMDX embedded in the standalone Artifact.',
      },
    },
    parameters: {
      layout: 'fullscreen',
    },
    render: ({ htmdx }) => createHtmdxHost(htmdx),
  };
}

function extractEmbeddedHtmdx(artifactHtml: string) {
  const artifact = new DOMParser().parseFromString(artifactHtml, 'text/html');
  const sourceElements = artifact.querySelectorAll(
    'script[type="text/htmdx"], template[type="text/htmdx"]',
  );

  if (sourceElements.length !== 1) {
    throw new Error(
      `expected the Artifact to contain one embedded HTMDX source, found ${sourceElements.length}`,
    );
  }

  const source = sourceElements[0];
  return source instanceof HTMLTemplateElement
    ? source.innerHTML.trim()
    : source.textContent?.trim() || '';
}
