import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

for (const path of ['/', '/en/', '/404.html']) {
  test(`${path}: security policy preserves normal use and blocks injected scripts`, async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as typeof window & { cspViolations: string[] };
      state.cspViolations = [];
      window.addEventListener('securitypolicyviolation', (event) => {
        state.cspViolations.push(event.effectiveDirective);
      });
    });
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const policy = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
    for (const directive of ["default-src 'self'", "base-uri 'none'", "object-src 'none'", "form-action 'none'", "connect-src 'none'", "frame-src 'none'"]) {
      expect(policy).toContain(directive);
    }
    expect(policy).toContain('sha256-');
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    const violations = () => page.evaluate(() => (window as typeof window & { cspViolations: string[] }).cspViolations);
    expect(await violations()).toEqual([]);
    const unsafeLinks = await page.locator('a[target="_blank"]').evaluateAll((links) => links
      .filter((link) => !['noopener', 'noreferrer'].every((token) => (link as HTMLAnchorElement).relList.contains(token)))
      .map((link) => link.getAttribute('href')));
    expect(unsafeLinks).toEqual([]);
    // Test only in the local preview: this script is deliberately not in Astro's hash allowlist.
    await page.evaluate(() => {
      const injected = document.createElement('script');
      injected.textContent = "document.documentElement.dataset.untrustedScript = 'executed'";
      document.body.append(injected);
    });
    await expect.poll(violations).toContain('script-src-elem');
    await expect(page.locator('html')).not.toHaveAttribute('data-untrusted-script');
  });
}

test('published assets and CI configuration exclude common accidental exposures', async () => {
  expect((await readdir('public')).sort()).toEqual([
    'CV_Francisco_Javier_Martinez_EN-public.pdf',
    'CV_Francisco_Javier_Martinez_ES-public.pdf',
    'Carta-recomendacion-Odin-publica.pdf',
    'favicon.ico',
  ].sort());
  const files = await readdir('dist', { recursive: true });
  expect(files.filter((file) => /(?:^|[/\\])\.env|(?:^|[/\\])\.git(?:[/\\]|$)|\.(?:map|docx|pem|key)$/i.test(file))).toEqual([]);
  const workflow = await readFile('.github/workflows/deploy.yml', 'utf8');
  const actions = [...workflow.matchAll(/uses:\s+(\S+)/g)].map((match) => match[1]);
  expect(actions).toHaveLength(5);
  for (const action of actions) expect(action).toMatch(/^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
  expect(workflow).toContain('persist-credentials: false');
  expect(workflow).not.toContain('pull_request_target');
  const ignored = execFileSync('git', ['check-ignore', '--no-index', '.env.local', '.env.staging', '.env.production.local'], { encoding: 'utf8' });
  expect(ignored.trim().split(/\r?\n/)).toHaveLength(3);
});
