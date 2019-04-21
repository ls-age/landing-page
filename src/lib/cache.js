import { join } from 'path';
import { readJSON, outputJSON } from 'fs-extra';
import fetch, { Headers } from 'node-fetch';

const githubApiToken = process.env.GITHUB_API_TOKEN;

export class ApiCache {

  constructor(path, { ttl = 1000 * 60 * 60 * 24 } = {}) {
    this.path = path;
    this.ttl = ttl;
  }

  async getCached(file) {
    const { timestamp, data } = await readJSON(file);

    if (Date.now() - (new Date(timestamp)).getTime() > this.ttl) {
      throw new Error('Cache invalidated');
    }

    return data;
  }

  async refetch({ query, variables }) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
      headers: new Headers({
        Authorization: `bearer ${githubApiToken}`,
        'Content-Type': 'application/json',
      }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error(`GitHub API responded with '${response.status} ${response.statusText}'`);
      throw new Error('Response is not okay');
    }

    const result = await response.json();

    if (result.errors) {
      // eslint-disable-next-line no-console
      console.error(`GitHub API responded with errors:
${JSON.stringify(result.errors, null, '  ')}`);

      throw new Error('GraphQL error');
    }

    return result;
  }

  get(key, { query, variables = {} }) {
    const file = join(this.path, `${key}.json`);

    return this.getCached(file)
      .catch(async () => {
        // No cached value available
        const data = await this.refetch({ query, variables });

        await outputJSON(file, { timestamp: Date.now(), data });

        return data;
      });
  }

}

export default new ApiCache(join(process.cwd(), './data/cache'));
