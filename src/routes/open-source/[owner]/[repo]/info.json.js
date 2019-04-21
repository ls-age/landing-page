
import { processMarkdown } from '../../../../lib/markdown';
import cache from '../../../../lib/cache';
import { jsonErrors } from '../../../../lib/api';

export const query = `query RepoInfo($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    nameWithOwner
    url
    description
    pushedAt
    stargazers {totalCount}
    releases(last: 1) {
      nodes {
        tagName
      }
    }
    readme: object(expression: "master:README.md") {
      ... on Blob {
        text
      }
    }
  }
}`;

async function getInfo(req, res) {
  const variables = { owner: req.params.owner, repo: req.params.repo };
  const repo = (await cache.get(`info/${variables.owner}/${variables.repo}`, {
    query,
    variables,
  })).data.repository;
  const readme = repo.readme ? processMarkdown(repo.readme.text) : null;

  res.writeHead(200, {
    'Content-Type': 'application/json',
  });

  res.end(JSON.stringify({
    ...repo,
    readme,
  }));
}

export const get = jsonErrors(getInfo);
