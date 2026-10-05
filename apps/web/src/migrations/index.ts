import * as migration_20261005_070508_initial from './20261005_070508_initial';

export const migrations = [
  {
    up: migration_20261005_070508_initial.up,
    down: migration_20261005_070508_initial.down,
    name: '20261005_070508_initial'
  },
];
