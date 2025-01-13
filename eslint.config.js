export default [
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
    },
  },
  {
    files: ['*.test.js'],
    plugins: {
      jest: require('eslint-plugin-jest'),
    },
    env: {
      jest: true,
    },
    rules: {
      ...require('eslint-plugin-jest').configs.recommended.rules,
    },
  },
];
