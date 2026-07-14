import type { Preview } from '@storybook/web-components-vite';
import { THEME_IDS } from '../src/themes';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'htmdx color theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [...THEME_IDS],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'purple' },
  decorators: [
    (story, context) => {
      const theme = (context.globals.theme as string) || 'purple';
      const el = story() as HTMLElement;
      // The runtime renders asynchronously and stamps the frontmatter theme
      // during render; re-apply the toolbar choice on its 'htmdx:rendered'
      // event so the dropdown always wins in preview.
      el.addEventListener?.('htmdx:rendered', () => {
        el.querySelector('.htmdx-app')?.setAttribute('data-htmdx-theme', theme);
      });
      return el;
    },
  ],
  parameters: {
    viewport: {
      options: {
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
};

export default preview;
