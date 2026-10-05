import type { Plugin } from '@toolsync/core/plugins';
import { readFile, writeFile } from 'node:fs/promises';
import { expandEnv } from './mcp-config';

declare global {
  namespace Toolsync {
    interface ConfigMap {
      '@workspace/toolsync-plugin': Record<string, never>;
    }
  }
}

const repoPlugin = {
  name: '@workspace/toolsync-plugin',
  loadConfig() {
    return {
      config: {
        '@workspace/toolsync-plugin': {},
        '@toolsync/builtin/github-actions': {
          workflows: {
            ci: {
              // The repository's default branch is `master`
              on: {
                push: { branches: ['master'] },
                pull_request: { branches: ['master'] },
              },
              jobs: {
                build: {
                  steps: [
                    {
                      '@update': {
                        id: 'checkout',
                        data: { uses: 'actions/checkout@v5' },
                      },
                    },
                    {
                      '@update': {
                        id: 'checks',
                        data: { run: 'bun turbo check lint test --continue' },
                      },
                    },
                    {
                      // TODO: Remove once @toolsync/builtin supports Changesets v3
                      '@update': {
                        id: 'changesets',
                        data: {
                          uses: 'changesets/action@v2',
                          with: {
                            'commit-message': 'chore: Update versions',
                            'pr-title': 'chore: Update versions',
                            'publish-script': 'bun run changesets:publish',
                            'version-script': 'bun run changesets:version',
                            'github-token': '${{ secrets.CHANGESETS_GITHUB_TOKEN }}',
                            commit: undefined,
                            title: undefined,
                            publish: undefined,
                            version: undefined,
                            commitMode: undefined,
                          },
                          env: { GITHUB_TOKEN: undefined },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };
  },
  async setupPackage(pkg) {
    if (!pkg.isRoot) return;

    // TODO: Remove once @toolsync/builtin supports Changesets v3
    pkg.packageJson.scripts ??= {};
    pkg.packageJson.scripts['changesets:publish'] =
      'for dir in packages/*; do (cd "$dir" && bun publish || exit 0); done && changeset git-tag';

    await writeFile(
      '.vscode/mcp.json',
      JSON.stringify(
        {
          servers: {
            'next-devtools': {
              command: 'npx',
              args: ['-y', 'next-devtools-mcp@latest'],
            },
          },
        },
        null,
        2,
      ),
    );

    // Generate the git-ignored .mcp.json (with secrets) from the committed template. Bun loads
    // `.env` and `.env.local` into the environment.
    const template = JSON.parse(await readFile('.mcp.template.json', 'utf8'));
    const { value, missing } = expandEnv(template);
    await writeFile('.mcp.json', `${JSON.stringify(value, null, 2)}\n`);
    if (missing.length > 0) {
      console.warn(
        `.mcp.json: unset variables (see "MCP servers" in AGENTS.md): ${missing.join(', ')}`,
      );
    }
  },
} satisfies Plugin<'@workspace/toolsync-plugin'>;

export default repoPlugin;
