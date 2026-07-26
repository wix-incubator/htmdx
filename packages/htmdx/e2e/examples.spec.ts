import { expect, test } from '@playwright/test';

const EXAMPLES = [
  { path: '/index.html', heading: 'htmdx live examples' },
  { path: '/component-tour.html', heading: 'Component tour' },
  { path: '/decision-brief.html', heading: 'Checkout Migration' },
  { path: '/blank-layout.html', heading: 'Launch command center' },
  { path: '/diagrams.html', heading: 'Diagrams' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { htmdxReady: Promise<void> }).htmdxReady = new Promise((resolve) => {
      window.addEventListener('htmdx:ready', () => resolve(), { once: true });
    });
  });
});

for (const { path, heading } of EXAMPLES) {
  test(path, async ({ page }) => {
    const htmlErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /cannot be a child|cannot be a descendant/.test(msg.text())) {
        htmlErrors.push(msg.text());
      }
    });

    await page.goto(path);
    await page.evaluate(() => (window as Window & { htmdxReady: Promise<void> }).htmdxReady);

    await expect(page.getByText(heading, { exact: false }).first()).toBeVisible();
    expect(htmlErrors, 'HTML validity errors').toEqual([]);
  });
}

// The only test that needs the network: mermaid is fetched from a CDN, and the
// point of the assertion is that a fence really does become a drawn graphic.
test('/diagrams.html draws its mermaid fences', async ({ page }) => {
  await page.goto('/diagrams.html');
  await page.evaluate(() => (window as Window & { htmdxReady: Promise<void> }).htmdxReady);

  const diagrams = page.locator('.htmdx-mermaid svg');
  await expect(diagrams).toHaveCount(4, { timeout: 15_000 });
  await expect(diagrams.first()).toBeVisible();
  // `<text>`, not `<foreignObject>`: the labels are drawn by the SVG the
  // allowlist let through, not by HTML mermaid smuggled inside it.
  await expect(diagrams.first().locator('text', { hasText: 'Source fence' }).first()).toBeVisible();
  await expect(page.locator('.htmdx-mermaid foreignObject')).toHaveCount(0);

  // The click-bearing diagram draws, and mermaid binds nothing to it.
  const clickable = page.locator('.htmdx-mermaid [onclick], .htmdx-mermaid a');
  await expect(clickable).toHaveCount(0);
});
