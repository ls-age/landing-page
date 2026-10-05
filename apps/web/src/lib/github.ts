import 'server-only';

/** GitHub accounts whose public repositories are listed on the Open Source page. */
const owners = ['ls-age', 'LukasHechenberger'];

/** Cache GitHub responses for a day: the old site rebuilt nightly for the same reason. */
const revalidate = 86_400;

interface GitHubRepository {
  name: string;
  full_name: string;
  owner: { login: string };
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
}

export interface Repository {
  owner: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | undefined;
  createdAt: string;
  pushedAt: string;
  stars: number;
  language: string | undefined;
  defaultBranch: string;
}

class GitHubNotFoundError extends Error {}

async function github(path: string, accept = 'application/vnd.github+json') {
  // Optional: unauthenticated requests are limited to 60 per hour and IP
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate },
  });

  if (response.status === 404) throw new GitHubNotFoundError(`GitHub: ${path} not found`);
  if (!response.ok) throw new Error(`GitHub: ${path} responded with ${response.status}`);

  return response;
}

function toRepository(repo: GitHubRepository): Repository {
  return {
    owner: repo.owner.login,
    name: repo.name,
    nameWithOwner: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? undefined,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    stars: repo.stargazers_count,
    language: repo.language ?? undefined,
    defaultBranch: repo.default_branch,
  };
}

/** The public, non-fork, non-archived repositories (except GitHub Pages sites) of all owners, most recently pushed first. */
export async function getRepositories() {
  const lists = await Promise.all(
    owners.map(async (owner) => {
      const response = await github(`/users/${owner}/repos?type=owner&sort=pushed&per_page=100`);
      return (await response.json()) as GitHubRepository[];
    }),
  );

  return (
    lists
      .flat()
      // GitHub Pages repositories only hold the old site's build output
      .filter((repo) => !repo.fork && !repo.archived && !repo.name.endsWith('.github.io'))
      .map((repo) => toRepository(repo))
      .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))
  );
}

const isRelative = (url: string) => !/^(?:[a-z][\d+.a-z-]*:|\/\/|#)/i.test(url);

/** Rewrites relative links and images in GitHub's rendered README to absolute GitHub URLs. */
function absolutizeReadme(html: string, repo: Repository) {
  const blob = `https://github.com/${repo.nameWithOwner}/blob/${repo.defaultBranch}/`;
  const raw = `https://raw.githubusercontent.com/${repo.nameWithOwner}/${repo.defaultBranch}/`;

  return html
    .replaceAll(/(<img[^>]*\ssrc=")([^"]+)"/g, (match, prefix: string, url: string) =>
      isRelative(url) ? `${prefix}${new URL(url, raw).href}"` : match,
    )
    .replaceAll(/(<a[^>]*\shref=")([^"]+)"/g, (match, prefix: string, url: string) =>
      isRelative(url) ? `${prefix}${new URL(url, blob).href}"` : match,
    );
}

/** Resolves to `undefined` instead of rejecting when GitHub responds with 404. */
async function unlessNotFound<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof GitHubNotFoundError) return;
    throw error;
  }
}

/** A repository with its latest release and rendered README, or `undefined` if it isn't listed. */
export async function getRepository(owner: string, name: string) {
  if (!owners.some((o) => o.toLowerCase() === owner.toLowerCase())) return;

  const data = await unlessNotFound(
    github(`/repos/${owner}/${name}`).then(async (r) => (await r.json()) as GitHubRepository),
  );
  if (!data || data.fork) return;
  const repository = toRepository(data);

  const [release, readme] = await Promise.all([
    unlessNotFound(
      github(`/repos/${owner}/${name}/releases/latest`).then(
        async (r) => ((await r.json()) as { tag_name: string }).tag_name,
      ),
    ),
    // GitHub renders (and sanitizes) the README for us
    unlessNotFound(
      github(`/repos/${owner}/${name}/readme`, 'application/vnd.github.html+json').then(async (r) =>
        absolutizeReadme(await r.text(), repository),
      ),
    ),
  ]);

  return { ...repository, release, readme };
}

/** GitHub user whose pull requests to other projects are listed as contributions. */
const author = 'LukasHechenberger';

/** Organizations whose pull requests are work, not listed as open source contributions. */
const workOrganizations = ['atSCM', 'atvise', 'hechenbros'];

interface GitHubPullRequest {
  repository_url: string;
  pull_request: { merged_at: string | null };
}

export interface Contribution extends Pick<
  Repository,
  'nameWithOwner' | 'url' | 'description' | 'language'
> {
  pullRequests: number;
  /** URL of the merged pull requests on GitHub */
  pullRequestsUrl: string;
  firstMergedAt: string;
  lastMergedAt: string;
}

/** Repositories of other projects with merged pull requests by the author, most recently started first. */
export async function getContributions() {
  const excluded = [...owners, ...workOrganizations].map((owner) => `-user:${owner}`).join(' ');
  const query = encodeURIComponent(`is:pr is:merged author:${author} ${excluded}`);

  const pullRequests: GitHubPullRequest[] = [];
  // The search API returns at most 1000 results
  for (let page = 1; page <= 10; page++) {
    const response = await github(`/search/issues?q=${query}&per_page=100&page=${page}`);
    const { items } = (await response.json()) as { items: GitHubPullRequest[] };
    pullRequests.push(...items);
    if (items.length < 100) break;
  }

  const mergedAtByRepository = new Map<string, string[]>();
  for (const { repository_url, pull_request } of pullRequests) {
    if (!pull_request.merged_at) continue;
    const nameWithOwner = repository_url.replace('https://api.github.com/repos/', '');
    mergedAtByRepository.set(nameWithOwner, [
      ...(mergedAtByRepository.get(nameWithOwner) ?? []),
      pull_request.merged_at,
    ]);
  }

  const contributions = await Promise.all(
    [...mergedAtByRepository].map(async ([nameWithOwner, dates]): Promise<Contribution> => {
      const mergedAt = [...dates].sort();
      const repo = await unlessNotFound(
        github(`/repos/${nameWithOwner}`).then(async (r) => (await r.json()) as GitHubRepository),
      );
      const pullRequestsQuery = encodeURIComponent(`is:pr is:merged author:${author}`);

      return {
        nameWithOwner,
        url: `https://github.com/${nameWithOwner}`,
        description: repo?.description ?? undefined,
        language: repo?.language ?? undefined,
        pullRequests: mergedAt.length,
        pullRequestsUrl: `https://github.com/${nameWithOwner}/pulls?q=${pullRequestsQuery}`,
        firstMergedAt: mergedAt[0]!,
        lastMergedAt: mergedAt.at(-1)!,
      };
    }),
  );

  return contributions.sort((a, b) => b.firstMergedAt.localeCompare(a.firstMergedAt));
}
