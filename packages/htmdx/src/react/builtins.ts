// Bridges the string built-in catalog (ExecutiveSummary, MetricStrip, charts,
// ...) into the React path. Each bridge receives the raw component body and
// renders through the existing string renderer, so body contracts, validation,
// and markup stay identical to the string runtime — no catalog fork.
import { createElement } from 'react';
import { builtInComponents, createBuiltInRenderer } from '../components/catalog';
import type { HtmdxReactComponents } from './index';

export type RawBodyProps = { body?: string };

// Marks a component as wanting the raw HTMDX body string instead of parsed
// React children. The renderer checks this flag before body parsing.
export const RAW_BODY_FLAG = 'htmdxRawBody';

export function bridgeStringComponent(
  name: string,
  render: (name: string, body: string) => string,
) {
  const Bridge = (props: RawBodyProps) =>
    createElement('div', {
      dangerouslySetInnerHTML: { __html: render(name, props.body || '') },
    });
  Bridge.displayName = `HtmdxBridge(${name})`;
  return Object.assign(Bridge, { [RAW_BODY_FLAG]: true as const });
}

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => [
    component.name,
    bridgeStringComponent(component.name, createBuiltInRenderer(component)),
  ]),
);
