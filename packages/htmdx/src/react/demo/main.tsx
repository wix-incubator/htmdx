import { createRoot } from 'react-dom/client';
import { Htmdx } from '../index';
import { shadcnComponents } from '../shadcn';

const source = `## Q3 Report

Narrative rendered from **markdown**, followed by real shadcn/ui components
driven from the same HTMDX source string.

<Card class="max-w-xl">
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>Audited quarterly numbers</CardDescription>
  </CardHeader>
  <CardContent>
    Revenue grew **12%** quarter over quarter.
    <Badge variant="secondary">audited</Badge>
    <Badge variant="destructive">one risk</Badge>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">Download report</Button>
  </CardFooter>
</Card>

<Tabs default-value="summary" class="max-w-xl">
  <TabsList>
    <TabsTrigger value="summary">Summary</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="summary">The summary panel: topline numbers only.</TabsContent>
  <TabsContent value="details">The details panel: full cost breakdown.</TabsContent>
</Tabs>

<Accordion type="single" collapsible class="max-w-xl">
  <AccordionItem value="risks">
    <AccordionTrigger>Key risks</AccordionTrigger>
    <AccordionContent>Vendor lock-in and churn concentration in two accounts.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="asks">
    <AccordionTrigger>Asks for the board</AccordionTrigger>
    <AccordionContent>Approve the hiring plan for the data team.</AccordionContent>
  </AccordionItem>
</Accordion>

Narrative after the components, still plain markdown.`;

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <Htmdx source={source} components={shadcnComponents} />
    </div>,
  );
}
