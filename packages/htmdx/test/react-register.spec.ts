import { describe, expect, test } from 'vitest';
import { register } from '../src';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountArtifact(tagName: string, source: string) {
  register({ tagName, tailwind: false });
  const host = document.createElement(tagName);
  const script = document.createElement('script');
  script.type = 'text/htmdx';
  script.textContent = source;
  host.append(script);
  document.body.append(host);
  return host;
}

describe('register (React runtime)', () => {
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

    expect(host.textContent).toContain('Findings');
    expect(host.textContent).toContain('ok');
    host.remove();
  });

  test('renders built-ins without any extra registration', async () => {
    const host = mountArtifact(
      'htmdx-react-e',
      `<ExecutiveSummary>
Built-ins ship in the default runtime.
</ExecutiveSummary>`,
    );
    await flush();

    expect(host.textContent).toContain('Built-ins ship in the default runtime.');
    host.remove();
  });

  test('dispatches htmdx:rendered with the component list', async () => {
    const events: CustomEvent[] = [];
    document.addEventListener('htmdx:rendered', (event) => events.push(event as CustomEvent), {
      once: true,
    });
    const host = mountArtifact('htmdx-react-b', '<Badge>one</Badge>\n\n<Callout>two</Callout>');
    await flush();

    expect(events).toHaveLength(1);
    expect(events[0].detail.components).toEqual(['Badge', 'Callout']);
    host.remove();
  });

  test('renders the error fallback for unclosed components', async () => {
    const host = mountArtifact('htmdx-react-c', '<Card>never closed');
    await flush();

    expect(host.textContent).toContain('unclosed component');
    expect(host.textContent).toContain('never closed');
    host.remove();
  });

  test('unmounts the React root when the host disconnects', async () => {
    const host = mountArtifact('htmdx-react-d', '<Badge>bye</Badge>');
    await flush();
    expect(host.textContent).toContain('bye');

    host.remove();
    await flush();
    expect(host.textContent).toBe('');
  });
});
