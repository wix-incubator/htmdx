# Component grammar

The runtime ships two catalogs: 24 report built-ins and a 65-component
shadcn/ui pack. Ask the CLI for a component's purpose, canonical example, body
mode, and props:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.11.0 components Callout DataTable   # the ones you plan to use
npx @wix/htmdx@4.11.0 components --used report.html  # the ones a file already uses
npx @wix/htmdx@4.11.0 components                     # every name with its purpose
```

<!-- x-release-please-end-version -->

Read the full list when writing something new — `--used` only reports what a
file already contains, so it cannot tell you about the component you should
have reached for. Use it when editing, where matching the file matters more.
It scans for tags rather than compiling, so it still answers for an artifact
that is mid-edit and does not compile yet.

This file covers the grammar a component's `body` field alone does not spell
out: the built-ins with a `markdown` body still parse that Markdown against a
fixed row or table shape, and an invalid body fails the artifact.

## Body modes

| Mode       | Accepts                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `markdown` | Markdown only, in the component's row/table shape. Nested component tags are rejected. |
| `htmdx`    | Markdown, allowlisted HTML, and nested registered components.                          |
| `none`     | An empty or self-closing tag.                                                          |

Every component accepts `class`, `id`, `aria-*`, and `data-*`. Any other
attribute must be declared for that component. Most report built-ins declare no
props: severity, tone, and variant live in the body text.

## Free Markdown bodies

`ExecutiveSummary`, `Callout`, `SourceQuote`, and `Foldout` take ordinary
Markdown. `Foldout` has an `htmdx` body, so components nest inside it.

<!-- prettier-ignore -->
```mdx
<ExecutiveSummary>
Migrate checkout in Q3. The legacy gateway reaches end-of-life in **November**.
</ExecutiveSummary>

<Callout>The freeze window blocks any rollout between **Nov 20** and **Dec 2**.</Callout>

<SourceQuote>
"We lost the cart twice before it went through." — merchant interview, June
</SourceQuote>

<Foldout title="Rollback plan" open>
Each merchant segment reverts independently.

<Timeline>
- **Trigger:** Error rate above 1% for 10 minutes
- **Owner:** On-call payments engineer
</Timeline>
</Foldout>
```

## `- label: value` rows

`MetricStrip`, `Stat`, `Timeline`, and `DecisionTable` split each row at its
first colon. Both sides must be non-empty.

In `MetricStrip`, a leading `↑` (green), `↓` (red), or `⊘` (amber guardrail)
colors the row, and an `—` or `·` in the value renders the remainder as a
muted caption.

<!-- prettier-ignore -->
```mdx
<MetricStrip>
- ↑ Conversion: **+1.8pp** — pilot cohort vs legacy
- ↓ Support tickets: **12/month** · was 340
- ⊘ Checkout completion: **guardrail** — hold at or above baseline
</MetricStrip>

<Stat>- Merchants migrated: **412**</Stat>

<Timeline>
- **Q3:** Migrate new merchants and the pilot cohort
- **Q4:** Move the remaining 80% in four waves
</Timeline>

<DecisionTable>
- Decision: Migrate in Q3
- Owner: Payments team
- Reversible: Yes, per merchant segment
</DecisionTable>
```

## `- label: number` rows

`ChartBar`, `ChartLine`, `ChartPie`, and `ChartArea` require finite,
non-negative decimal values — no units, currency symbols, or percent signs in
the value. All four currently render with the shared bar visualization, so
choose by intent.

<!-- prettier-ignore -->
```mdx
<ChartBar>
- Legacy: 4.2
- Pilot: 0.3
</ChartBar>
```

## GFM tables

`DataTable` and `DecisionMatrix` need a header row, a separator row, and at
least one data row of matching width.

`DecisionMatrix` puts options in columns and criteria in rows. A `✓` in an
option header highlights the chosen column, and a body cell may start with
`[blue]`, `[green]`, `[amber]`, `[red]`, `[gray]`, or `[purple]` for a colored
status dot.

<!-- prettier-ignore -->
```mdx
<DataTable>
| Segment | Merchants | Error rate |
| ------- | --------: | ---------: |
| Legacy  |     1,840 |       4.2% |
| Pilot   |       412 |       0.3% |
</DataTable>

<DecisionMatrix>
| Criterion     | Stay on legacy       | Migrate in Q3 ✓               |
| ------------- | -------------------- | ----------------------------- |
| Deadline risk | [red] Misses November | [green] One quarter of slack |
| Effort        | [green] None         | [amber] Two teams for a quarter |
</DecisionMatrix>
```

## `- item` card rows

`Compare`, `Evidence`, `Finding`, `BulletList`, `Sources`, `RiskTable`,
`Audience`, `IntentList`, `OpenQuestions`, and `SignalGrid` take Markdown list
rows and render one card per row. The general shape is `- **Title:** details`.

<!-- prettier-ignore -->
```mdx
<Compare>
- **Legacy gateway:** 4.2% error rate, end-of-life in November
- **New payments API:** 0.3% error rate, pilot-proven
</Compare>

<Evidence>- **Pilot telemetry:** 412 merchants, 90 days, no rollback triggered.</Evidence>

<Finding>- **Cart loss is the top complaint:** 61% of interviewed merchants raised it.</Finding>

<Sources>
- Merchant interviews, June 2026
- Payments telemetry dashboard
</Sources>
```

Rows with extra structure:

| Component       | Row format                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RiskTable`     | `- **<tier>:** text`, where tier is exactly `Must-have`, `Differentiator`, `Not now`, or `Won't do`, each used at most once                                   |
| `BulletList`    | `- link - text`; the part before the first `-` renders as a link                                                                                              |
| `Audience`      | `- **Persona — Type:** Description · metrics: value — caption · priority: High\|Medium\|Unmeasured`, Type being `Primary`, `Secondary`, or `Secondary · Risk` |
| `IntentList`    | `- **#id · Priority · Persona · Type:** quote followed by "negative, negative → positive, positive", plus an optional `· note: …`                             |
| `OpenQuestions` | `- **Assumption\|Risk\|Open:** note`                                                                                                                          |
| `SignalGrid`    | `- **Category \| tone:** Headline — body`, tone being blue/green/amber/red/gray/purple                                                                        |

<!-- prettier-ignore -->
```mdx
<RiskTable>
- **Must-have:** Instant per-segment rollback.
- **Differentiator:** Dual-running through the freeze window.
- **Not now:** Migrating the subscriptions gateway.
- **Won't do:** A big-bang cutover.
</RiskTable>
```

## shadcn/ui pack

`Card`, `Badge`, `Button`, `Tabs`, `Accordion`, `Alert`, `Avatar`,
`Breadcrumb`, `Collapsible`, `Dialog`, `HoverCard`, `Popover`, `Progress`,
`Separator`, `Table`, `Tooltip`, and `AspectRatio` come from the pack with
their Radix behavior and a bundled Tailwind theme. `Card` is provided only
here.

These are compound components: the parent is invalid without its children.

| Parent                                      | Required props                      | Required children                                                   |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `Tabs`                                      | `defaultValue` matching one trigger | `TabsList` > `TabsTrigger`, plus one `TabsContent` per trigger      |
| `Accordion`                                 | `type` (`single` or `multiple`)     | `AccordionItem` (`value`) > `AccordionTrigger` + `AccordionContent` |
| `Card`                                      | none                                | `CardContent`; `CardHeader` > `CardTitle` when titled               |
| `Dialog`, `Popover`, `HoverCard`, `Tooltip` | none                                | matching `*Trigger` + `*Content`                                    |

Frequently used props: `Badge` and `Alert` take `variant`; `Button` takes
`variant` and `size`; `Progress` takes `value` (0-100); `Separator` takes
`orientation`; `Accordion` takes `collapsible`; `AspectRatio` takes `ratio`.

<!-- prettier-ignore -->
```mdx
<Card>
  <CardHeader>
    <CardTitle>Recommendation</CardTitle>
    <CardDescription>Decision needed by Friday</CardDescription>
  </CardHeader>
  <CardContent>
    Migrate in Q3. <Badge variant="secondary">owner: payments</Badge>
  </CardContent>
</Card>

<Tabs defaultValue="q3">
  <TabsList>
    <TabsTrigger value="q3">Q3 — Migrate</TabsTrigger>
    <TabsTrigger value="q4">Q4 — Dual-run</TabsTrigger>
  </TabsList>
  <TabsContent value="q3">New merchants plus the pilot cohort.</TabsContent>
  <TabsContent value="q4">Four weekly waves, legacy stays warm.</TabsContent>
</Tabs>

<Accordion type="single" collapsible>
  <AccordionItem value="risks">
    <AccordionTrigger>What could go wrong</AccordionTrigger>
    <AccordionContent>Freeze-window overrun and partner API drift.</AccordionContent>
  </AccordionItem>
</Accordion>
```

## Reader self-checks

There is no quiz component. For reveal-on-click questions, use one
`AccordionItem` per question with a distinct `value`: the question in
`AccordionTrigger`, the answer in `AccordionContent`. Nothing records or scores
an answer, so do not present it as a graded quiz.

## Allowlisted HTML

The top level and every `htmdx` body accept a fixed set of HTML elements —
structural tags such as `div`, `section`, `table`, `details`, `figure`, and
inline tags such as `a`, `code`, `em`, `img`, `kbd` — with an allowlisted
attribute set. Use them for layout the components do not cover, not to smuggle
in behavior:

- an element outside the list is never rendered as markup; it stays literal
  text, so `<script>` and friends cannot execute;
- an event-handler attribute is an error (`event-handler-attribute`);
- URL attributes are scheme-checked and unsafe values are dropped;
- an `<img>` with no `alt` is a warning (`image-missing-alt`).
