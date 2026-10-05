// The canonical example every review component shares: none of them means
// anything outside a ContentReview, so each one's example is the whole shape.
export const contentReviewExample = `<ContentReview title="Brand filter">

<ReviewElement name="Empty state" description="Shown before any brand exists." flag="Nothing here lets the merchant add a brand." flagAnchor="cta">

<ReviewMockup>
<div style="max-width: 360px; padding: 24px; border: 1px solid #ddd; border-radius: 12px; text-align: center">
<h3><CopyField name="title" /></h3>
<p><CopyField name="body" /></p>
<button style="padding: 8px 16px; border-radius: 99px; background: #116dff; color: #fff; border: 0"><CopyField name="cta" /></button>
</div>
</ReviewMockup>

<ReviewVersion current="true">
- title: No Brands
- body: You haven't created any brands.
- cta: Create Brand
</ReviewVersion>

<ReviewVersion label="Action first" why="Leads with what the merchant gets, then the step." assumptions='["Customers only see the filter once a brand exists."]'>
- title: No brands yet
- body: Add a brand to your products and customers can filter by it.
- cta: Add your first brand
</ReviewVersion>

<ReviewVersion label="Short and plain" why="The shortest wording that still names the next step.">
- title: No brands yet
- cta: Add brand
</ReviewVersion>

</ReviewElement>

<ReviewElement name="Saved toast" changed="false" />

</ContentReview>`;
