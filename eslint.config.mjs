import base from './packages/config/eslint/base.js';

/** Config raiz: cobre apenas arquivos soltos na raiz do monorepo.
 *  Cada workspace tem o seu proprio eslint.config.mjs. */
export default [
  {
    ignores: [
      'apps/**',
      'packages/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
  ...base,
];
