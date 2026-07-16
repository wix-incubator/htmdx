import { describe, expect, test } from 'vitest';
import { registerReact } from '../src/react/register';
import { shadcnComponents } from '../src/react/shadcn';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountArtifact(tagName: string, source: string) {
  registerReact({ tagName, components: shadcnComponents, tailwind: false });
  const host = document.createElement(tagName);
  const script = document.createElement('script');
  script.type = 'text/htmdx';
  script.textContent = source;
  host.append(script);
  document.body.append(host);
  return host;
}

describe('registerReact', () => {
  test('renders shadcn components from an embedded script source', async () => {
    const host = mountArtifact(
      'htmdx-react-a',
      `## Findings

<Card>
  <CardContent>
    <Badge variant="secondary">ok</Badge>
  </CardContent>
</Card>`,
    );
    await flush();

    expect(host.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="badge"]')?.textContent).toBe('ok');
    expect(host.querySelector('h2')?.textContent).toContain('Findings');
    host.remove();
  });

  test('dispatches htmdx:rendered with the component list', async () => {
    const events: CustomEvent[] = [];
    document.addEventListener('htmdx:rendered', (event) => events.push(event as CustomEvent), {
      once: true,
    });
    const host = mountArtifact('htmdx-react-b', '<Badge>one</Badge>\n\n<Card>two</Card>');
    await flush();

    expect(events).toHaveLength(1);
    expect(events[0].detail.components).toEqual(['Badge', 'Card']);
    host.remove();
  });

  test('renders the error fallback for unclosed components', async () => {
    const host = mountArtifact('htmdx-react-c', '<Card>never closed');
    await flush();

    expect(host.querySelector('.htmdx-error')?.textContent).toContain('unclosed component');
    expect(host.querySelector('.htmdx-raw-source')?.textContent).toContain('never closed');
    host.remove();
  });

  test('unmounts the React root when the host disconnects', async () => {
    const host = mountArtifact('htmdx-react-d', '<Badge>bye</Badge>');
    await flush();
    expect(host.querySelector('[data-slot="badge"]')).not.toBeNull();

    host.remove();
    await flush();
    expect(host.querySelector('[data-slot="badge"]')).toBeNull();
  });
});
