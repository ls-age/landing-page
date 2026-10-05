export const site = {
  name: 'Lukas Hechenberger',
  url: 'https://lukashechenberger.com',
  description:
    'Software developer building web apps end to end, from the database schema to the deploy.',
  email: 'hello@ls-age.com',
  // The primary color of the shadcn Rose theme (light mode)
  themeColor: '#c70036',
  author: {
    name: 'Lukas Hechenberger',
    github: 'https://github.com/LukasHechenberger',
  },
} as const;

/** The absolute URL of a path on the (production) site */
export const absoluteUrl = (path: string) => new URL(path, site.url).href;
