import type { Meta } from '@storybook/web-components-vite';
import { register } from '../../../index';
import type { HtmdxComponent } from '../../../component-definition';
import { injectShadcnTheme } from '../../shadcn/shared/theme';
import { createHtmdxHost } from '../../../storybook/component-story';

// A part means nothing outside its parent, so its story renders the whole
// canonical example rather than the part alone.
export function createPartStory(component: HtmdxComponent): Pick<Meta, 'parameters' | 'render'> {
  injectShadcnTheme();
  register();
  return {
    parameters: { layout: 'fullscreen' },
    render: () => createHtmdxHost(component.example),
  };
}
