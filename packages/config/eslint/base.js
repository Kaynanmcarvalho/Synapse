import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Regras que valem para todo codigo TypeScript do monorepo.
 *  O limite de tamanho de arquivo e proposital: nenhum arquivo gigante (spec 70). */
export default tseslint.config(
  {
    ignores: ['dist/**', 'build/**', 'coverage/**', '.turbo/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',

      // spec 70: um arquivo, uma responsabilidade
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
    },
  },
  // Arquivo .cjs e CommonJS por definicao — `require` ali e a forma certa, nao
  // um deslize. E o caso do tailwind.config.cjs, que precisa desse formato para
  // o Tailwind recarregar o design system sem reiniciar o servidor.
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.tsx', '**/*.test.tsx'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
);
