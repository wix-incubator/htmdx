import type { Meta } from '@storybook/web-components-vite';
import { register } from '../index';
import type { HtmdxComponent } from '../components/types';
import { injectShadcnTheme } from '../react/shadcn';

export type ComponentStoryArgs = {
  body: string;
};

export function createComponentStory(
  component: HtmdxComponent,
): Pick<Meta<ComponentStoryArgs>, 'args' | 'argTypes' | 'parameters' | 'render'> {
  injectShadcnTheme();
  register();

  return {
    args: {
      body: canonicalBody(component),
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
    render: ({ body }) => createHtmdxHost(`<${component.name}>\n${body}\n</${component.name}>`),
  };
}

function canonicalBody(component: HtmdxComponent) {
  const openingTag = `<${component.name}>`;
  const closingTag = `</${component.name}>`;
  return component.example.slice(openingTag.length, -closingTag.length).trim();
}

export function createHtmdxHost(htmdx: string) {
  const host = document.createElement('htmdx-code');
  const source = document.createElement('script');
  source.type = 'text/htmdx';
  source.textContent = htmdx;
  host.append(source);
  return host;
}
