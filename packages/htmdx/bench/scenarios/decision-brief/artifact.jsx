import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DecisionBrief() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Checkout Migration — Decision Brief</h1>
        <p>
          Prepared for the platform review, <strong>July 16</strong>. An agent wrote this file as a
          single React artifact; everything below is JSX rendered through shadcn/ui.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recommendation</CardTitle>
          <CardDescription>Migrate checkout to the new payments API in Q3</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            The legacy gateway reaches end-of-life in <strong>November</strong>. Migrating in Q3
            gives us one full quarter of dual-running before the deadline.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>approved-pending-budget</Badge>
            <Badge variant="secondary">owner: payments team</Badge>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Numbers that matter</h2>
        <Card>
          <CardContent className="space-y-3">
            <p>
              Conversion on the legacy flow dropped <strong>1.8pp</strong> since January while the
              new API pilot held steady. Support tickets tell the same story:{" "}
              <strong>340/month</strong> on legacy vs <strong>12/month</strong> on the pilot cohort.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive">legacy: 4.2% error rate</Badge>
              <Badge variant="secondary">pilot: 0.3% error rate</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Migration plan</h2>
        <Tabs defaultValue="q3">
          <TabsList>
            <TabsTrigger value="q3">Q3 — Migrate</TabsTrigger>
            <TabsTrigger value="q4">Q4 — Dual-run</TabsTrigger>
            <TabsTrigger value="q1">Q1 — Decommission</TabsTrigger>
          </TabsList>
          <TabsContent value="q3">
            Move 100% of new merchants plus the 20% pilot cohort. Weekly conversion review; instant
            rollback per merchant segment.
          </TabsContent>
          <TabsContent value="q4">
            Remaining 80% migrate in four weekly waves. Legacy stays warm as fallback. Freeze window
            during peak season, <strong>Nov 20 – Dec 2</strong>.
          </TabsContent>
          <TabsContent value="q1">
            Legacy gateway decommissioned. Contract savings of <strong>$38k/month</strong> start
            February.
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Risks and open questions</h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="refunds">
            <AccordionTrigger>Refund flows are not API-compatible</AccordionTrigger>
            <AccordionContent>
              Legacy refunds reference internal transaction ids the new API does not know. We need
              the mapping table live <strong>before</strong> wave one, or refunds on migrated
              merchants fail silently.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="peak">
            <AccordionTrigger>Peak season overlap</AccordionTrigger>
            <AccordionContent>
              Wave four lands two weeks before the freeze. If wave three slips, we either compress
              testing or carry legacy through December at <strong>$38k</strong> extra cost.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="team">
            <AccordionTrigger>Payments team capacity</AccordionTrigger>
            <AccordionContent>
              Two of five engineers are committed to the tax project until August. The plan assumes
              they return; confirm with their lead this week.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Decision needed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Approve the Q3 migration budget (<strong>$120k</strong>, mostly the mapping-table work)
            by <strong>July 25</strong> so wave one starts on schedule.
          </p>
          <Badge variant="outline">decision by: July 25</Badge>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm">Approve budget</Button>
          <Button variant="ghost" size="sm">
            Request revision
          </Button>
        </CardFooter>
      </Card>

      <p>
        Edit this file's JSX to change the report — the rendering updates on rebuild. That is the
        whole artifact contract.
      </p>
    </article>
  );
}
