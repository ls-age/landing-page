import cache from '../../lib/cache';
import { jsonErrors } from '../../lib/api';

export const query = `query {
  organization(login: "ls-age") {
    repositories(privacy: PUBLIC, first: 50, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        nameWithOwner
        url
        description
        pushedAt
        stargazers {totalCount}
        watchers {totalCount}
        primaryLanguage {
          color
          name
        }
      }
    }
  }
}`;

async function getRepos(req, res) {
  const repositories = (await cache.get('repos', { query })).data.organization.repositories;

  res.writeHead(200, {
    'Content-Type': 'application/json',
  });

  res.end(JSON.stringify({ repositories }));
}

export const get = jsonErrors(getRepos);
