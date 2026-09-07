import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

for (const lang of ['es', 'en'] as const) {
  const path = lang === 'en' ? '/en/' : '/';

  test(`${lang}: static content, SEO, documents and local assets`, async ({ page, request }) => {
    const errors: string[] = [];
    const thirdParty: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (req) => { if (!req.url().startsWith('http://127.0.0.1:43210/')) thirdParty.push(req.url()); });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page).toHaveTitle(lang === 'en' ? 'Javi | Software engineer' : 'Javi | Ingeniero de software');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://fjaviermmdev.github.io${path}`);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', 'https://fjaviermmdev.github.io/en/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', await page.title());
    expect((await response!.text())).toContain(lang === 'en' ? 'Backend, systems and security.' : 'Backend, sistemas y seguridad.');
    expect(await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id)))
      .toEqual(['inicio', 'sobre-mi', 'experiencia', 'educacion', 'proyectos', 'contacto']);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(schema.mainEntity.name).toBe('Francisco Javier Martínez Martínez');
    await expect(page.locator('.hero-image')).toHaveJSProperty('complete', true);
    expect(await page.locator('.hero-image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    for (const link of await page.locator('[data-cv-link]').all()) {
      await expect(link).toHaveAttribute('href', `/CV_Javi-${lang.toUpperCase()}-public.pdf`);
    }
    for (const pdf of ['ES', 'EN']) {
      const document = await request.get(`/CV_Javi-${pdf}-public.pdf`);
      expect(document.ok()).toBeTruthy();
      expect((await document.body()).subarray(0, 5).toString()).toBe('%PDF-');
    }
    const reference = page.locator('.recommendation a');
    await expect(reference).toHaveAttribute('href', '/Carta-recomendacion-Odin-publica.pdf');
    await expect(reference).toContainText(lang === 'en' ? 'public copy' : 'copia pública');
    const letter = await request.get((await reference.getAttribute('href'))!);
    expect(letter.ok()).toBeTruthy();
    expect((await letter.body()).subarray(0, 5).toString()).toBe('%PDF-');
    await expect(page.locator('#lynx-tech .role-details')).toHaveAttribute('open', '');
    await expect(page.locator('#lynx-tech .role-details')).toContainText(lang === 'en'
      ? 'Developing and maintaining AWS Lambda functions'
      : 'Desarrollo y mantenimiento de funciones AWS Lambda');
    for (const technology of ['AWS ECS', 'AWS Lambda', 'Amazon S3', 'OpenSearch']) {
      await expect(page.locator('#lynx-tech .technology-list')).toContainText(technology);
    }
    const missingTargets = await page.locator('a[href^="#"]').evaluateAll((links) => links
      .map((link) => (link as HTMLAnchorElement).hash.slice(1)).filter((id) => !document.getElementById(id)));
    expect(missingTargets).toEqual([]);
    expect(errors).toEqual([]);
    expect(thirdParty).toEqual([]);
  });

  test(`${lang}: responsive layout and accessibility`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.goto(path);
    for (const width of [320, 375, 390, 480, 760, 768, 980, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          if (!el.getClientRects().length || el.closest('dialog:not([open])') || el.classList.contains('skip-link')) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        }).map((el) => `${el.tagName}.${el.className}`));
      expect(overflow, `Overflow at ${width}px`).toEqual([]);
      const header = await page.locator('.site-header').boundingBox();
      expect(header!.height).toBeLessThanOrEqual(width <= 760 ? 65 : 73);
      const portrait = await page.locator('.hero-image').boundingBox();
      expect(portrait!.height).toBeLessThanOrEqual(width <= 760 ? 270 : 340);
      expect(portrait!.width).toBeLessThanOrEqual(width <= 760 ? 240 : 300);
      if (width === 390 || width === 1440) {
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        expect(scan.violations).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath(`${lang}-${width}.png`), fullPage: true });
      }
    }
  });

  test(`${lang}: mobile menu, focus, escape and navigation`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const button = page.locator('#menu-button');
    const dialog = page.locator('#mobile-menu');
    await button.click();
    await expect(dialog).toBeVisible();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.locator('.menu-close')).toBeFocused();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBeTruthy();
    }
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${lang}-menu.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
    await button.click();
    await dialog.locator('a[href="#proyectos"]').click();
    await expect(page).toHaveURL(`${path}#proyectos`);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('#proyectos')).toBeFocused();
    await button.click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  });

  test(`${lang}: complete content without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:43210${path}`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('.nav-links')).toBeVisible();
    await expect(page.locator('#menu-button')).not.toBeVisible();
    await page.locator('.skills-details summary').click();
    await expect(page.getByText('Pentesting', { exact: true })).toBeVisible();
    for (const section of await page.locator('main > section').all()) {
      await expect(section).toBeVisible();
      await expect(section).toHaveCSS('opacity', '1');
    }
    await expect(page.locator('.role-details').first()).toHaveAttribute('open', '');
    await page.locator('.role-details summary').first().click();
    await expect(page.locator('.role-details').first()).not.toHaveAttribute('open');
    await page.locator('.role-details summary').first().click();
    await expect(page.locator('.role-details').first()).toHaveAttribute('open', '');
    await page.locator('.global-actions [data-language-link]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', lang === 'en' ? 'es' : 'en');
    await context.close();
  });
}

test('language switch preserves the section and tolerates unavailable storage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.goto('/#proyectos');
  await page.locator('.global-actions [data-language-link]').click();
  await expect(page).toHaveURL('/en/#proyectos');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.nav-links a[href="#proyectos"]')).toHaveAttribute('aria-current', 'location');
  await page.locator('.nav-links a[href="#educacion"]').click();
  await expect(page.locator('.nav-links a[href="#educacion"]')).toHaveAttribute('aria-current', 'location');
  expect(errors).toEqual([]);
});

test('keyboard skip link, disclosure and reduced motion', async ({ page, browserName }) => {
  await page.goto('/');
  // WebKit's default OS preference skips links when tabbing; still verify activation.
  if (browserName === 'webkit') await page.locator('.skip-link').focus();
  else await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  const summary = page.locator('.role-details summary').last();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.role-details').last()).toHaveAttribute('open', '');
  await page.locator('.skills-details summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.skills-details')).toHaveAttribute('open', '');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('expanded technologies remain accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.locator('.skills-details summary').click();
  await expect(page.getByText('Pentesting', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('mobile menu remains usable in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/');
  await page.locator('#menu-button').click();
  const dialog = page.locator('#mobile-menu');
  for (let index = 0; index < 7; index++) await page.keyboard.press('Tab');
  const language = dialog.locator('[data-language-link]');
  await expect(language).toBeFocused();
  await expect(language).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu-button')).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
});

test('print includes collapsed content without the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.skills-details')).not.toHaveAttribute('open');
  await expect(page.locator('#odin-solutions .role-details')).not.toHaveAttribute('open');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).not.toBeVisible();
  await expect(page.getByText('Pentesting', { exact: true })).toBeVisible();
  await expect(page.locator('#odin-solutions .role-details ol')).toBeVisible();
  await expect(page.locator('.experience-section')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.skills-details')).not.toHaveAttribute('open');
  await expect(page.locator('#odin-solutions .role-details')).not.toHaveAttribute('open');
  await expect(page.locator('#lynx-tech .role-details')).toHaveAttribute('open', '');
});

test('experience links to its projects and language changes preserve the project', async ({ page }) => {
  await page.goto('/');
  await page.locator('.role-project-links a[href="#proyecto-mqtt"]').click();
  await expect(page).toHaveURL('/#proyecto-mqtt');
  await expect(page.locator('#proyecto-mqtt')).toBeFocused();
  const top = await page.locator('#proyecto-mqtt').evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(72);
  await page.locator('.global-actions [data-language-link]').click();
  await expect(page).toHaveURL('/en/#proyecto-mqtt');
  await expect(page.locator('.nav-links a[href="#proyectos"]')).toHaveAttribute('aria-current', 'location');
});

test('production assets stay within the static-site size budget', async () => {
  const files = await readdir('dist/_astro');
  let scriptBytes = 0;
  let styleBytes = 0;
  for (const file of files) {
    if (!/\.(js|css)$/.test(file)) continue;
    const compressed = gzipSync(await readFile(`dist/_astro/${file}`)).byteLength;
    if (file.endsWith('.js')) scriptBytes += compressed;
    else styleBytes += compressed;
  }
  // Astro inlines small scripts; include those rather than assuming .js files exist.
  const html = await readFile('dist/index.html', 'utf8');
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!attributes.includes('application/ld+json') && body.trim()) scriptBytes += gzipSync(body).byteLength;
  }
  for (const [, body] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) styleBytes += gzipSync(body).byteLength;
  expect(scriptBytes).toBeGreaterThan(0);
  expect(scriptBytes).toBeLessThan(12_000);
  expect(styleBytes).toBeLessThan(12_000);
  expect(Buffer.byteLength(html)).toBeLessThan(65_000);
  expect(await readdir('public')).toEqual(expect.arrayContaining([
    'CV_Javi-ES-public.pdf', 'CV_Javi-EN-public.pdf', 'Carta-recomendacion-Odin-publica.pdf',
  ]));
});

test('sitemap, robots and a useful 404', async ({ request, page }) => {
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<loc>https://fjaviermmdev.github.io/en/</loc>');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://fjaviermmdev.github.io/sitemap.xml');
  await page.goto('/404.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Portfolio in English' }).click();
  await expect(page).toHaveURL('/en/');
});
