import { expect, test } from '@playwright/test';

const EXAMPLES = [
  { path: '/index.html', heading: 'htmdx live examples' },
  { path: '/component-tour.html', heading: 'Component tour' },
  { path: '/decision-brief.html', heading: 'Checkout Migration' },
  { path: '/blank-layout.html', heading: 'Launch command center' },
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
