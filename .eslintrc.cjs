'use strict';

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json', './tsconfig.test.json'],
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'jsdoc'],
  settings: {
    jsdoc: {
      tagNamePreference: {
        file: 'fileoverview',
      },
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:jsdoc/recommended-typescript',
  ],
  rules: {
    'max-depth': ['error', 4],
    'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', 50],
    complexity: ['warn', 10],
    'no-console': 'error',
    'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': 'error',
    'jsdoc/check-tag-names': ['warn', { definedTags: ['fileoverview'] }],
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
        },
      },
    ],
    'jsdoc/require-description': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TSEnumDeclaration',
        message: 'Use string literal unions or as const instead of enums.',
      },
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs', '*.mjs'],
};
