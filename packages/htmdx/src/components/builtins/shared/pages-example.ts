// The canonical example Pages and Page share.
export const pagesExample = `<Pages tilesLabel="Screens reviewed">

Two screens of the brand filter, one at a time.

<Page title="Empty state" group="Products page" description="Shown before any brand exists.">

<Variants name="Empty state">

<VariantTemplate>
<div style="padding: 24px; text-align: center"><h3><TextSlot name="title" /></h3></div>
</VariantTemplate>

<Variant current="true">
- title: No Brands
</Variant>

<Variant label="Sentence case">
- title: No brands yet
</Variant>

</Variants>

</Page>

<Page title="Filter label" group="Storefront">

The heading shoppers see above the brand list is **Brand**, matching the other filters.

</Page>

<Page title="Saved toast" nav="false" />

</Pages>`;
