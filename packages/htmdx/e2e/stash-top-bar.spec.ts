import { expect, type Page, test } from '@playwright/test';

// The rule Wix Stash renders last in the served <head> while its 44px top bar is shown. The bar
// itself is position: fixed over the window, so the page must keep its pinned chrome below it.
const STASH_OFFSET_STYLE =
  '<style data-stash-top-bar-offset>html { --stash-top-bar-height: 44px; margin-top: var(--stash-top-bar-height) !important; scroll-padding-top: var(--stash-top-bar-height); }</style>';
const BAR_HEIGHT = 44;

async function openDecisionBrief(page: Page, { underStashBar }: { underStashBar: boolean }) {
  await page.addInitScript(() => {
    (window as Window & { htmdxReady: Promise<void> }).htmdxReady = new Promise((resolve) => {
      window.addEventListener('htmdx:ready', () => resolve(), { once: true });
    });
  });
  if (underStashBar) {
    await page.route('**/decision-brief.html', async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace('</head>', `${STASH_OFFSET_STYLE}</head>`);
      await route.fulfill({ response, body: html });
    });
  }
  await page.goto('/decision-brief.html');
  await page.evaluate(() => (window as Window & { htmdxReady: Promise<void> }).htmdxReady);
}

async function scrollHeroBottomTo(page: Page, y: number) {
  await page.evaluate((target) => {
    const hero = document.querySelector('.htmdx-hero')!;
    window.scrollBy({ top: hero.getBoundingClientRect().bottom - target, behavior: 'instant' });
  }, y);
}

const box = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const { top, bottom } = element.getBoundingClientRect();
    return { top, bottom, viewport: window.innerHeight };
  });

test.describe('under the Stash top bar', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('the sticky title header shows below the bar once the hero is hidden behind it', async ({
    page,
  }) => {
    await openDecisionBrief(page, { underStashBar: true });

    // The hero's last 20px are still on the page but behind the bar, so the reader no longer sees it.
    await scrollHeroBottomTo(page, 20);

    const header = page.locator('.htmdx-sticky-header-inner');
    await expect(page.locator('.htmdx-sticky-header')).toHaveClass(/is-visible/);
    await expect
      .poll(async () => (await box(page, '.htmdx-sticky-header-inner')).top)
      .toBeGreaterThanOrEqual(BAR_HEIGHT);
    await expect(header).toBeVisible();
  });

  test('the section nav fills the window below the bar after scrolling', async ({ page }) => {
    await openDecisionBrief(page, { underStashBar: true });
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));

    const nav = await box(page, '.htmdx-toc');
    expect(nav.top).toBe(BAR_HEIGHT);
    expect(nav.bottom).toBe(nav.viewport);
  });

  test('a short page does not scroll just because of the bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 4000 });
    await openDecisionBrief(page, { underStashBar: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('without the Stash top bar', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('the pinned chrome keeps its original positions', async ({ page }) => {
    await openDecisionBrief(page, { underStashBar: false });
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));

    const nav = await box(page, '.htmdx-toc');
    expect(nav.top).toBe(0);
    expect(nav.bottom).toBe(nav.viewport);
    await expect(page.locator('.htmdx-sticky-header')).toHaveClass(/is-visible/);
    await expect.poll(async () => (await box(page, '.htmdx-sticky-header-inner')).top).toBe(8);
  });
});
