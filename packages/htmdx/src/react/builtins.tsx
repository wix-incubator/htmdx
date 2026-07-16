// The built-in catalog as React components.
//
// Markdown-bodied components (ExecutiveSummary, Callout, ...) are fully
// composable: their children come from the renderer, so nested components
// (shadcn included) work inside them. Structured-bodied components (metric
// strips, charts, tables) keep their body contracts: they receive the raw
// HTMDX body, parse it with the existing contract parsers, and render
// through the existing content helpers — markup identical to the previous
// string runtime.
import { createElement, type ReactNode } from 'react';
import { builtInComponents, createBuiltInRenderer } from '../components/catalog';
import type { HtmdxComponent } from '../components/types';
import type { HtmdxReactComponent, HtmdxReactComponents } from './index';

export type RawBodyProps = { body?: string };

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function Shell(props: { name: string; children?: ReactNode }) {
  return createElement(
    'section',
    {
      className: `htmdx-component htmdx-${kebab(props.name)}`,
      'data-htmdx-component': props.name,
    },
    createElement('div', { className: 'htmdx-component-header' }, props.name),
    createElement('div', { className: 'htmdx-component-body' }, props.children),
  );
}

// Markdown-bodied built-ins compose children like any React component.
function markdownBuiltIn(name: string): HtmdxReactComponent {
  const Component = (props: { children?: ReactNode }) =>
    createElement(Shell, { name }, props.children);
  Component.displayName = name;
  return Component;
}

// Structured-bodied built-ins own their body: contract parsing and content
// markup stay in the existing string pipeline helpers.
function structuredBuiltIn(component: HtmdxComponent): HtmdxReactComponent {
  const render = createBuiltInRenderer(component);
  const Component = (props: RawBodyProps) =>
    createElement(
      Shell,
      { name: component.name },
      createElement('div', {
        // Content helpers escape all interpolated values; the body contract
        // has already validated the shape.
        dangerouslySetInnerHTML: { __html: contentOf(render(component.name, props.body || '')) },
      }),
    );
  Component.displayName = component.name;
  return Object.assign(Component, { htmdxRawBody: true as const });
}

// The string renderers wrap content in their own shell; strip it so the
// React Shell is the single wrapper.
function contentOf(shellHtml: string) {
  const match = shellHtml.match(/<div class="htmdx-component-body">([\s\S]*)<\/div>\s*<\/section>/);
  return match ? match[1] : shellHtml;
}

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => [
    component.name,
    component.body === 'markdown' ? markdownBuiltIn(component.name) : structuredBuiltIn(component),
  ]),
);
