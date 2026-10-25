import { defineConfig } from '@lhechenberger/check-links';

export default defineConfig({
  // The local dev server
  url: 'http://localhost:3001',
  skip: [
    // Answers automated requests with 403
    String.raw`^https://crates\.io/`,
    // Rate-limits automated requests (429)
    String.raw`^https://www\.instagram\.com/`,
  ],
  // The GitHub READMEs shown on the open-source pages aren't mine to fix here
  isWarningOnly: (link, { origin, url }) =>
    !link.url.startsWith(origin) &&
    new URL(link.parent ?? url).pathname.startsWith('/open-source/'),
  warningTitle: 'Broken links in GitHub READMEs',
});
