import base from './base.js';

/** Camada da API: NestJS usa decorators e classes vazias por design. */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      // DTOs e entidades declaram propriedades sem inicializar; o Nest preenche.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
];
