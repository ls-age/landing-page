/* eslint-disable no-console, unicorn/no-process-exit -- A command-line script */
/**
 * Crawls the site and reports broken links: `bun run integration:broken-links [url]`, by default
 * against the local dev server. Fails on broken links of my own pages; broken links inside the
 * GitHub READMEs shown on the open-source pages are only warnings, since their content isn't mine
 * to fix here. Links that work on a second request are warnings too: Fresh deployments answer
 * some first requests with an error (e.g. image optimizations from a function that just started).
 */
import { check, type LinkResult, LinkState } from 'linkinator';

const url = process.argv[2] ?? 'http://localhost:3001';
const { origin } = new URL(url);

// Lets the crawler through Vercel's deployment protection
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET; // eslint-disable-line turbo/no-undeclared-env-vars -- not run through turbo
const headers: Record<string, string> = bypassSecret
  ? { 'x-vercel-protection-bypass': bypassSecret }
  : {};

// A protected deployment redirects to Vercel's login page, which linkinator would happily check
// instead of the site
const start = await fetch(url, { headers, redirect: 'manual' });
if (!start.ok) {
  console.error(
    `${url} answered with ${start.status} ${start.headers.get('location') ?? ''}`.trim() +
      (bypassSecret
        ? ''
        : '\nIf the deployment is protected, set VERCEL_AUTOMATION_BYPASS_SECRET.'),
  );
  process.exit(1);
}

const { links } = await check({
  path: url,
  recurse: true,
  concurrency: 20,
  timeout: 30_000,
  // Retries 5xx responses and network errors, which are mostly temporary
  retryErrors: true,
  retryErrorsCount: 2,
  retry: true,
  headers,
  linksToSkip: [
    // Answers automated requests with 403
    String.raw`^https://crates\.io/`,
    // Rate-limits automated requests (429)
    String.raw`^https://www\.instagram\.com/`,
  ],
});

const isThirdParty = (link: LinkResult) =>
  !link.url.startsWith(origin) && new URL(link.parent ?? url).pathname.startsWith('/open-source/');

/** Whether `link` works when requested again, a while after the crawl */
async function recovers(link: LinkResult) {
  try {
    const response = await fetch(link.url, {
      headers: link.url.startsWith(origin) ? headers : {},
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

const broken = links.filter((link) => link.state === LinkState.BROKEN);
const warnings = broken.filter((link) => isThirdParty(link));
const errors: LinkResult[] = [];
const flaky: LinkResult[] = [];
if (broken.length > warnings.length) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  for (const link of broken) {
    if (isThirdParty(link)) continue;
    ((await recovers(link)) ? flaky : errors).push(link);
  }
}

const print = (title: string, results: LinkResult[]) => {
  if (results.length === 0) return;
  console.log(`\n${title}`);
  for (const link of results) {
    console.log(`  [${link.status ?? 'error'}] ${link.url}\n    on ${link.parent}`);
  }
};

print('Broken links in GitHub READMEs (warnings):', warnings);
print('Links that worked on a second request (warnings):', flaky);
print('Broken links:', errors);
console.log(
  `\nChecked ${links.length} links on ${origin}: ${errors.length} broken, ${warnings.length + flaky.length} warnings`,
);

if (errors.length > 0) process.exit(1);
