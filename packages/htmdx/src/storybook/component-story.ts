import type { Meta } from '@storybook/web-components-vite';
import { register } from '../index';
import type { HtmdxComponent } from '../component-definition';
import { injectShadcnTheme } from '../components/shadcn/shared/theme';

export type ComponentStoryArgs = {
  body: string;
};

export function createComponentStory(
  component: HtmdxComponent,
): Pick<Meta<ComponentStoryArgs>, 'args' | 'argTypes' | 'parameters' | 'render'> {
  injectShadcnTheme();
  register();

  const { openingTag, body: defaultBody, closingTag } = splitExample(component);
  return {
    args: {
      body: defaultBody,
    },
    argTypes: {
      body: {
        control: { type: 'text' },
        description: `The editable body of <${component.name}>.`,
      },
    },
    parameters: {
      layout: 'fullscreen',
    },
    // Reuse the example's real opening tag so any props on it (e.g. Foldout's
    // `title`) survive; the body remains the editable Storybook control.
    render: ({ body }) =>
      createHtmdxHost(closingTag ? `${openingTag}\n${body}\n${closingTag}` : openingTag),
  };
}

// The canonical example may carry attributes on the opening tag
// (e.g. `<Foldout title="...">`), so slice on the first `>` rather than assume
// a bare `<Name>`; everything between the opening and closing tags is the body.
function splitExample(component: HtmdxComponent): {
  openingTag: string;
  body: string;
  closingTag: string;
} {
  const { example, name } = component;
  const openEnd = example.indexOf('>');
  const openingTag = example.slice(0, openEnd + 1);
  const closingTag = openingTag.endsWith('/>') ? '' : `</${name}>`;
  const body = closingTag
    ? example.slice(openEnd + 1, example.length - closingTag.length).trim()
    : '';
  return { openingTag, body, closingTag };
}

export function createHtmdxHost(htmdx: string) {
  const host = document.createElement('htmdx-code');
  const source = document.createElement('script');
  source.type = 'text/htmdx';
  source.textContent = htmdx;
  host.append(source);
  return host;
}
