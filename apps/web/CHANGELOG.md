# @ls-age/web

## 1.3.0

### Minor Changes

- [#100](https://github.com/ls-age/landing-page/pull/100) [`263d2c9`](https://github.com/ls-age/landing-page/commit/263d2c9dabbba1e00a6f9e8e23aa7b2197ecc0bd) - Show a post's featured image above its title

- [#99](https://github.com/ls-age/landing-page/pull/99) [`30bb493`](https://github.com/ls-age/landing-page/commit/30bb493f01d43c1912ccde61bedf0165a4b47f2c) - Zoom images in blog posts on click

- [#99](https://github.com/ls-age/landing-page/pull/99) [`30bb493`](https://github.com/ls-age/landing-page/commit/30bb493f01d43c1912ccde61bedf0165a4b47f2c) - Optimize images in blog posts with `next/image` and show them centered, at most 36rem wide and 32rem high

- [#97](https://github.com/ls-age/landing-page/pull/97) [`2fe4228`](https://github.com/ls-age/landing-page/commit/2fe4228b96b693f8d3897801402cceb1a2310c7b) - Make links in blog posts stand out: they're in the primary color, and links to other sites or to files get an icon (files are downloaded)

## 1.2.0

### Minor Changes

- [#82](https://github.com/ls-age/landing-page/pull/82) [`3a9280c`](https://github.com/ls-age/landing-page/commit/3a9280c485cef83f8355add02811e7bdd152ba71) - Link to the previous and next blog post, with their title and description, at the end of each post

- [#93](https://github.com/ls-age/landing-page/pull/93) [`671bfc2`](https://github.com/ls-age/landing-page/commit/671bfc2eada14766cb835c9286f68470e1c0b7d8) - Blog posts can have a second featured image that's shown in dark mode

- [#88](https://github.com/ls-age/landing-page/pull/88) [`ea06110`](https://github.com/ls-age/landing-page/commit/ea06110f3548c1a60542f76baa9f1b7a055b65c9) - Restyle the site header: the logo links home, the navigation is a button group, and the header fades out over a blurred gradient. Hechenbros is linked in the footer only

- [#93](https://github.com/ls-age/landing-page/pull/93) [`671bfc2`](https://github.com/ls-age/landing-page/commit/671bfc2eada14766cb835c9286f68470e1c0b7d8) - Show the posts' featured images in their cards on the home page and the blog

- [#85](https://github.com/ls-age/landing-page/pull/85) [`500b903`](https://github.com/ls-age/landing-page/commit/500b903c3b71c5946de39edd68b32b4f80852e7e) - Blog posts can embed tools that run in the browser (Tool blocks), and the blog marks posts with tools. The first one, SVG to STL, turns a colored SVG into one STL per color for multicolor 3D printing, also when shapes overlap

### Patch Changes

- [#95](https://github.com/ls-age/landing-page/pull/95) [`e89368d`](https://github.com/ls-age/landing-page/commit/e89368d48a56037099bc8b9870f16ab11b56fe99) - Update the sitemap, llms.txt and the blog's feed right away when posts change, instead of within an hour

## 1.1.1

### Patch Changes

- [#78](https://github.com/ls-age/landing-page/pull/78) [`7003bef`](https://github.com/ls-age/landing-page/commit/7003bef155e8ab103b441220fc40cfbaf197ead9) - Point the blog posts' structured data at a generated image that exists, instead of the un-hashed `opengraph-image` URL that returns 404 in production, and check every deployment for broken links

## 1.1.0

### Minor Changes

- [#74](https://github.com/ls-age/landing-page/pull/74) [`dbc73a3`](https://github.com/ls-age/landing-page/commit/dbc73a35e5f3f37313e177965f3446165bd8d180) - Refresh the home page: a new hero with a QRcard, selected work, rewritten skills, the latest posts and a shorter site description

- [#73](https://github.com/ls-age/landing-page/pull/73) [`e41f277`](https://github.com/ls-age/landing-page/commit/e41f2770707098a2e9f31e9bd1a73eea69b502f4) - Show the Open Source page as a timeline, including merged pull requests to other open source projects

### Patch Changes

- [#77](https://github.com/ls-age/landing-page/pull/77) [`d6e83af`](https://github.com/ls-age/landing-page/commit/d6e83af0c67bea6c871871915a9e4d8c24dff4bc) - Show the photo in the home page hero much larger, with my name as a caption, the QRcard smaller while it wraps below the text, and say "apps" instead of "web apps" in the headline and site description

## 1.0.1

### Patch Changes

- [#70](https://github.com/ls-age/landing-page/pull/70) [`b5f19af`](https://github.com/ls-age/landing-page/commit/b5f19afba95ac54cb156758bb5458468456c5db2) - Link the footer's imprint to hechenbros.com/impressum/.

- [#72](https://github.com/ls-age/landing-page/pull/72) [`a4e17b5`](https://github.com/ls-age/landing-page/commit/a4e17b5a64d440bd043a9068c3f84e4d8394289f) - Replace the "LH" monogram icons with the new "lh_" icon (favicon, Apple touch icon and web app manifest icons) and show it in the footer.

## 1.0.0

### Major Changes

- [#68](https://github.com/ls-age/landing-page/pull/68) [`b0d07c2`](https://github.com/ls-age/landing-page/commit/b0d07c2ad7248c0365524b9783d181f6691f2383) - Rebuild the site with Next.js, Tailwind CSS and shadcn/ui, rebrand it as "Lukas Hechenberger" for lukashechenberger.com, list the repositories of both GitHub accounts on the Open Source page, add a blog (Payload, with highlighted code blocks), and drop AdSense
