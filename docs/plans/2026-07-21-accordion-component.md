# Accordion Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in `Accordion` component — a single collapsible panel (titled header + purple chevron) that expands on click to reveal flexible nested content.

**Architecture:** A React component wrapping native `<details>`/`<summary>` (zero JS; works in both the live runtime and `compile()` static snapshots). `body: 'htmdx'`, so nested content arrives as `children`. `title` and `open` are declared props. Registered by exporting from the built-ins barrel, which auto-wires the runtime registry and manifest.

**Tech Stack:** TypeScript, React, Tailwind utilities (browser CDN), Vitest (jsdom), Storybook (web-components-vite).

## Global Constraints

- PR title / release type for this work: `feat(components): add Accordion built-in` (a `feat` — adds public behavior).
- Never edit package versions, release tags, or generated changelogs.
- Styling is Tailwind utilities only — no new runtime CSS (consistent with `BulletList`, `Stat`).
- The purple is `var(--md-sys-color-primary)`; its contrast color is `var(--md-sys-color-on-primary)`.
- Component/prop names match `/^[A-Za-z][A-Za-z0-9]*$/`; props cannot be `class`/`id`/`aria-*`/`data-*`/`on*`.

---

### Task 1: Accordion component, definition, and registration

**Files:**
- Create: `packages/htmdx/src/components/builtins/Accordion/Accordion.tsx`
- Create: `packages/htmdx/src/components/builtins/Accordion/index.ts`
- Modify: `packages/htmdx/src/components/builtins/index.ts` (add one export, alphabetical — before `Audience`)
- Test: `packages/htmdx/test/react-builtins.spec.ts` (add a `describe('Accordion', ...)` block)

**Interfaces:**
- Consumes: `StructuredBlock`, `InlineMarkdown` from `../shared/structured`; `HtmdxComponent` from `../../../component-definition`.
- Produces: `export const Accordion` (an `HtmdxComponent` definition) from `./Accordion/index.ts`, re-exported by the built-ins barrel. Public tag: `<Accordion title="..." [open]>...children...</Accordion>`.

- [ ] **Step 1: Write the failing tests**

Add to the end of `packages/htmdx/test/react-builtins.spec.ts`, inside the existing top-level `describe('bundled definitions in the React path', ...)` block (i.e. before its closing `});`). It already imports `renderToStaticMarkup`, `compileToReact`, and `definitions`.

```ts
  describe('Accordion', () => {
    test('renders collapsed by default with the title in the summary', () => {
      const html = renderToStaticMarkup(
        compileToReact('<Accordion title="Title of accordion">\nHidden body text.\n</Accordion>', {
          definitions,
        }),
      );
      expect(html).toContain('<details');
      // Collapsed: no `open` attribute on the details element.
      expect(html).not.toContain('<details open');
      expect(html).toContain('Title of accordion');
      expect(html).toContain('Hidden body text.');
    });

    test('renders expanded when open is set', () => {
      const html = renderToStaticMarkup(
        compileToReact('<Accordion title="Shown" open>\nBody.\n</Accordion>', { definitions }),
      );
      expect(html).toContain('<details open');
    });

    test('renders nested registered components as content', () => {
      const html = renderToStaticMarkup(
        compileToReact(
          `<Accordion title="With a metric">
<MetricStrip>
- Format: **HTML**
</MetricStrip>
</Accordion>`,
          { definitions },
        ),
      );
      expect(html).toContain('data-htmdx-component="Accordion"');
      // The nested MetricStrip rendered inside the accordion body.
      expect(html).toContain('<strong>HTML</strong>');
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn workspace @wix/htmdx test -- react-builtins`
Expected: FAIL — the Accordion cases throw `unknown component <Accordion>` (the tag isn't registered yet).

- [ ] **Step 3: Create the component**

Create `packages/htmdx/src/components/builtins/Accordion/Accordion.tsx`:

```tsx
import type { ReactNode } from 'react';
import { InlineMarkdown, StructuredBlock } from '../shared/structured';

type AccordionProps = {
  title?: string;
  open?: boolean;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

export function Accordion({ title = '', open, className, children, ...attributes }: AccordionProps) {
  return (
    <StructuredBlock name="Accordion" className={className} {...attributes}>
      <details open={open} className="group w-full overflow-hidden rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-bold text-card-foreground">
            <InlineMarkdown text={title} />
          </span>
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] transition-transform group-open:rotate-180"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </summary>
        <div className="border-t px-4 py-3 text-sm text-card-foreground">{children}</div>
      </details>
    </StructuredBlock>
  );
}
```

- [ ] **Step 4: Create the definition**

Create `packages/htmdx/src/components/builtins/Accordion/index.ts`:

```ts
import type { HtmdxComponent } from '../../../component-definition';
import { Accordion as Component } from './Accordion';

export const Accordion = {
  name: 'Accordion',
  purpose:
    'A collapsible panel: a titled header that expands on click to reveal flexible content (text, tables, charts, or any nested component). Collapsed by default; stack multiple for a group.',
  example:
    '<Accordion title="Title of accordion">\nAny content — text, a table, a chart, or any nested component.\n</Accordion>',
  body: 'htmdx',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'The header text shown in the summary row. Supports inline markdown.',
    },
    {
      name: 'open',
      type: 'boolean',
      default: false,
      description: 'Render the panel expanded on load. Defaults to collapsed.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
```

- [ ] **Step 5: Register in the built-ins barrel**

In `packages/htmdx/src/components/builtins/index.ts`, add this line as the FIRST export (alphabetical, before `export { Audience } from './Audience';`):

```ts
export { Accordion } from './Accordion';
```

- [ ] **Step 6: Run the Accordion tests to verify they pass**

Run: `yarn workspace @wix/htmdx test -- react-builtins`
Expected: PASS (all three Accordion cases green).

- [ ] **Step 7: Run the full package suite + typecheck**

Run: `yarn workspace @wix/htmdx test && yarn workspace @wix/htmdx exec tsc --noEmit -p tsconfig.json`
Expected: All tests pass (the canonical-example-validation and component-manifest specs pick up Accordion automatically), `tsc` exits 0.

- [ ] **Step 8: Commit**

```bash
git add packages/htmdx/src/components/builtins/Accordion packages/htmdx/src/components/builtins/index.ts packages/htmdx/test/react-builtins.spec.ts
git commit -m "feat(components): add Accordion built-in

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Storybook stories

**Files:**
- Create: `packages/htmdx/src/components/builtins/Accordion/Accordion.stories.ts`

**Interfaces:**
- Consumes: `createComponentStory`, `createHtmdxHost`, `ComponentStoryArgs` from `../../../storybook/component-story`; the `Accordion` definition from `./index`.
- Produces: a Storybook `Components/Built-ins/Accordion` entry with `Default` and `WithRichContent` stories.

- [ ] **Step 1: Create the stories file**

Create `packages/htmdx/src/components/builtins/Accordion/Accordion.stories.ts`:

```ts
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import {
  createComponentStory,
  createHtmdxHost,
  type ComponentStoryArgs,
} from '../../../storybook/component-story';
import { Accordion } from './index';

const meta = {
  title: 'Components/Built-ins/Accordion',
  ...createComponentStory(Accordion),
} satisfies Meta<ComponentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// Collapsed by default; click the header to expand the plain-text body.
export const Default: Story = {};

// The body is flexible — here it holds a nested chart to show it renders any
// registered component, not just text.
export const WithRichContent: Story = {
  render: () =>
    createHtmdxHost(
      [
        '<Accordion title="Quarterly revenue" open>',
        '<ChartBar>',
        '- Q1: 120',
        '- Q2: 150',
        '- Q3: 170',
        '- Q4: 210',
        '</ChartBar>',
        '</Accordion>',
      ].join('\n'),
    ),
};
```

- [ ] **Step 2: Verify the stories typecheck**

Run: `yarn workspace @wix/htmdx exec tsc --noEmit -p tsconfig.json`
Expected: exits 0.

- [ ] **Step 3: Verify in Storybook (manual)**

Run (if not already running): `yarn storybook`
Open: `http://localhost:6006/?path=/story/components-built-ins-accordion--default`
Expected: a card showing "Title of accordion" with a purple down-chevron button, collapsed. Clicking the header expands it (chevron flips to point up) and reveals the body text. The `WithRichContent` story starts expanded and shows a bar chart inside, with no error box. (The chart body uses `ChartBar`'s `- Label: value` row format, verified against its definition's `example`.)

- [ ] **Step 4: Commit**

```bash
git add packages/htmdx/src/components/builtins/Accordion/Accordion.stories.ts
git commit -m "test(components): add Accordion storybook stories

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the implementer

- **Why `<details>` and not `useState`:** it toggles with no JavaScript, so the component behaves identically in the live runtime and in `compile()`'s static HTML snapshot, and is keyboard/screen-reader accessible for free. Do not convert it to a stateful component.
- **Chevron flip:** the single down-chevron SVG rotates 180° via `group-open:rotate-180`; the `<details class="group">` gains `[open]` when expanded, which drives the variant. No second icon needed.
- **Manifest/registry:** exporting from the barrel is all that's needed — `component-manifest.ts` and the runtime registry both derive from `components/builtins`. Do not hand-edit any manifest.
