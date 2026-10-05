import { config } from '@workspace/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    rules: {
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            utils: true,
            props: true,
          },
        },
      ],
    },
  },
];
