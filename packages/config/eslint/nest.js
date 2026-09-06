import base from './base.js';

/** Camada da API: NestJS usa decorators e classes vazias por design. */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // O Nest resolve dependencias pelo metadado que `emitDecoratorMetadata` gera a
      // partir do tipo do parametro. Trocar por `import type` apaga o import do JS
      // emitido e a injecao passa a receber undefined em runtime — o lint estaria
      // "certo" na sintaxe e errado no comportamento.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
