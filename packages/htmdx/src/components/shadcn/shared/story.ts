import type { HtmdxComponent } from '../../../component-definition';
import { register } from '../../../index';
import { injectShadcnTheme } from '../shared/theme';
import { createHtmdxHost } from '../../../storybook/component-story';

injectShadcnTheme();
register();

export function renderShadcnStory(definition: HtmdxComponent) {
  return createHtmdxHost(definition.example);
}
