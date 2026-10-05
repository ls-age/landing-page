import * as migration_20261005_070508_initial from './20261005_070508_initial';
import * as migration_20261005_072409_posts from './20261005_072409_posts';

export const migrations = [
  {
    up: migration_20261005_070508_initial.up,
    down: migration_20261005_070508_initial.down,
    name: '20261005_070508_initial',
  },
  {
    up: migration_20261005_072409_posts.up,
    down: migration_20261005_072409_posts.down,
    name: '20261005_072409_posts'
  },
];
