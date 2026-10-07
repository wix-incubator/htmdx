// The canonical example the Variants parts share: none of them means anything
// outside a Variants, so each one's example is the whole shape.
export const variantsExample = `<Variants name="Empty state" flag="Nothing here lets the merchant add a brand." flagAnchor="cta">

<VariantTemplate>
<div style="max-width: 360px; padding: 24px; border: 1px solid #ddd; border-radius: 12px; text-align: center">
<h3><TextSlot name="title" /></h3>
<p><TextSlot name="body" /></p>
<button style="padding: 8px 16px; border-radius: 99px; background: #116dff; color: #fff; border: 0"><TextSlot name="cta" /></button>
</div>
</VariantTemplate>

<Variant current="true">
- title: No Brands
- body: You haven't created any brands.
- cta: Create Brand
</Variant>

<Variant label="Action first" why="Leads with what the merchant gets, then the step." assumptions='["Customers only see the filter once a brand exists."]'>
- title: No brands yet
- body: Add a brand to your products and customers can filter by it.
- cta: Add your first brand
</Variant>

<Variant label="Short and plain" why="The shortest wording that still names the next step.">
- title: No brands yet
- cta: Add brand
</Variant>

</Variants>`;
