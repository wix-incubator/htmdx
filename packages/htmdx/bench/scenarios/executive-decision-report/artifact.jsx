import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";

const metrics = [
  { label: "Annual savings", value: "$1.2M" },
  { label: "Resolution time", value: "18% faster" },
  { label: "Agent adoption", value: "84%" },
  { label: "Payback period", value: "9 months" },
];

const evidence = [
  {
    title: "Service quality",
    text: "Median resolution time fell from 31 to 25 hours across 18,400 pilot cases, while customer satisfaction held at 4.6 out of 5.",
  },
  {
    title: "Agent readiness",
    text: "84% of pilot agents completed core workflows without assistance by week three; the remaining gap was concentrated in billing escalations.",
  },
  {
    title: "Financial case",
    text: "Finance validated $1.2M in annualized license and support savings against $870K of one-time migration cost.",
  },
  {
    title: "Operational resilience",
    text: "Peak queue throughput improved 12%, but one identity-provider incident exposed a need for a documented fallback process.",
  },
];

const options = [
  {
    title: "Consolidate now",
    text: "Captures the full renewal-cycle savings and removes duplicate workflows, with migration risk managed through staged cohorts.",
  },
  {
    title: "Extend both platforms",
    text: "Avoids near-term disruption, but adds approximately $1.4M in duplicate annual cost and leaves transfer delays unresolved.",
  },
  {
    title: "Renegotiate and revisit",
    text: "Could improve contract terms, but postpones the operating-model decision and makes a 2027 migration more expensive.",
  },
];

const risks = [
  {
    tier: "Must-have",
    variant: "default",
    text: "Protect service levels with cohort gates, rollback criteria, and daily queue monitoring during migration.",
  },
  {
    tier: "Differentiator",
    variant: "secondary",
    text: "Use Northstar's unified routing to reduce transfers and give agents one customer history.",
  },
  {
    tier: "Not now",
    variant: "outline",
    text: "Move regulated accounts before security and legal complete their control review.",
  },
  {
    tier: "Won't do",
    variant: "destructive",
    text: "Run both platforms indefinitely as a permanent fallback.",
  },
];

const gates = [
  ["Decision", "Approve phased consolidation"],
  ["Initial funding", "$420K for cohort one"],
  ["Service gate", "CSAT at or above 4.5/5"],
  ["Performance gate", "Median resolution time at or below 28 hours"],
  ["Reliability gate", "No unresolved severity-one incident"],
  ["Final review", "30 days after cohort one"],
];

export default function ExecutiveDecisionReport() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2 border-b-2 pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Executive Decision Report</h1>
        <h2 className="text-xl font-semibold">Consolidate customer support onto Northstar</h2>
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          <li>
            <strong>Decision owner:</strong> Customer Operations
          </li>
          <li>
            <strong>Decision date:</strong> 15 September 2026
          </li>
          <li>
            <strong>Scope:</strong> North America support operations
          </li>
        </ul>
      </header>

      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent>
          Approve a phased consolidation of customer support onto <strong>Northstar</strong>{" "}
          beginning in Q4. The pilot indicates that one platform can reduce operating cost and time
          to resolution without lowering customer satisfaction. Release the remaining budget only
          after the first migration cohort meets the agreed service and reliability gates.
        </CardContent>
      </Card>

      <dl className="grid grid-cols-2 gap-px border-y-2 bg-border sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-background px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </dt>
            <dd className="text-2xl font-bold">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Why decide now</h2>
        <p>
          The current operation splits 420 agents across two systems. Duplicate licensing,
          reporting, and workflow maintenance add cost, while transfers between platforms delay
          complex cases. Both vendor contracts renew in December, creating a practical window to
          consolidate without early-termination fees.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Evidence from the eight-week pilot</h2>
        <ul className="space-y-2">
          {evidence.map((item) => (
            <li key={item.title} className="border-b pb-2 last:border-none">
              <strong>{item.title}:</strong> {item.text}
            </li>
          ))}
        </ul>
        <p>
          The pilot covered three general-support teams and one escalation team. It did not include
          regulated accounts or the holiday traffic peak, so those workloads remain explicit rollout
          gates rather than assumed benefits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Options considered</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => (
            <Card key={option.title} className="border-t-2 border-t-primary">
              <CardContent className="space-y-1">
                <h3 className="font-semibold">{option.title}</h3>
                <p className="text-sm">{option.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Risks and controls</h2>
        <ul>
          {risks.map((risk) => (
            <li key={risk.tier} className="flex gap-4 border-b py-3 last:border-none">
              <Badge variant={risk.variant} className="self-start">
                {risk.tier}
              </Badge>
              <span>{risk.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recommendation</h2>
        <p>
          Proceed with Northstar using a three-cohort rollout. Customer Operations should own
          delivery, Finance should validate realized savings after each cohort, and the steering
          group should pause expansion if either service or reliability falls below the approved
          thresholds.
        </p>
        <Table>
          <TableBody>
            {gates.map(([label, value]) => (
              <TableRow key={label}>
                <TableHead className="w-1/3">{label}</TableHead>
                <TableCell>{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Alert>
        <AlertTitle>Executive action requested</AlertTitle>
        <AlertDescription>
          Approve cohort-one funding and authorize contract notice by{" "}
          <strong>30 September 2026</strong>. Expansion funding remains conditional on the service,
          performance, and reliability gates above.
        </AlertDescription>
      </Alert>
    </article>
  );
}
