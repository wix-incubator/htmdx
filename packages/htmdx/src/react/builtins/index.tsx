// The built-in catalog as React components.
//
// Markdown-bodied built-ins (ExecutiveSummary, Callout, SourceQuote) are
// composable shells: their children come from the renderer, so nested
// components (shadcn included) work inside them. Structured-bodied built-ins
// (metrics, charts, tables, card lists) own their body — they parse it through
// the body contracts and render native shadcn/Tailwind JSX.
import type { ReactNode } from 'react';
import { builtInComponents } from '../../components/catalog';
import type { HtmdxReactComponent, HtmdxReactComponents } from '../index';
import { ChartArea, ChartBar, ChartLine, ChartPie } from './charts';
import { Audience } from './audience';
import { Compare, Evidence, Finding, RiskTable, Sources, Timeline } from './cards';
import { DecisionMatrix } from './decision-matrix';
import { IntentList } from './intents';
import { OpenQuestions } from './open-questions';
import { SignalGrid } from './signal-grid';
import { DataTable, DecisionTable } from './tables';
import { MetricStrip, Stat } from './metrics';

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function MarkdownShell({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <section className={`htmdx-component htmdx-${kebab(name)}`} data-htmdx-component={name}>
      <div className="htmdx-component-header">{name}</div>
      <div className="htmdx-component-body">{children}</div>
    </section>
  );
}

function markdownBuiltIn(name: string): HtmdxReactComponent {
  const Component = (props: { children?: ReactNode }) => (
    <MarkdownShell name={name}>{props.children}</MarkdownShell>
  );
  Component.displayName = name;
  return Component;
}

const structured: HtmdxReactComponents = {
  MetricStrip,
  Stat,
  ChartBar,
  ChartArea,
  ChartLine,
  ChartPie,
  DataTable,
  Compare,
  Finding,
  Evidence,
  Sources,
  Audience,
  IntentList,
  SignalGrid,
  DecisionMatrix,
  OpenQuestions,
  RiskTable,
  DecisionTable,
  Timeline,
};

export const builtInReactComponents: HtmdxReactComponents = Object.fromEntries(
  builtInComponents.map((component) => {
    if (component.body === 'markdown') {
      return [component.name, markdownBuiltIn(component.name)];
    }
    const view = structured[component.name];
    if (!view) {
      throw new Error(`no React view registered for built-in <${component.name}>`);
    }
    return [component.name, view];
  }),
);
