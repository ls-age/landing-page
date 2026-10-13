import * as migration_20261005_070508_initial from './20261005_070508_initial';
import * as migration_20261005_072409_posts from './20261005_072409_posts';
import * as migration_20261005_075057_seo from './20261005_075057_seo';
import * as migration_20261005_083311_mcp from './20261005_083311_mcp';
import * as migration_20261013_080949_featured_image_dark from './20261013_080949_featured_image_dark';

export const migrations = [
  {
    up: migration_20261005_070508_initial.up,
    down: migration_20261005_070508_initial.down,
    name: '20261005_070508_initial',
  },
  {
    up: migration_20261005_072409_posts.up,
    down: migration_20261005_072409_posts.down,
    name: '20261005_072409_posts',
  },
  {
    up: migration_20261005_075057_seo.up,
    down: migration_20261005_075057_seo.down,
    name: '20261005_075057_seo',
  },
  {
    up: migration_20261005_083311_mcp.up,
    down: migration_20261005_083311_mcp.down,
    name: '20261005_083311_mcp',
  },
  {
    up: migration_20261013_080949_featured_image_dark.up,
    down: migration_20261013_080949_featured_image_dark.down,
    name: '20261013_080949_featured_image_dark'
  },
];
