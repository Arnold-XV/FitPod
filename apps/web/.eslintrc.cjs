module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    // AR-02: Only L4 and L5/auth can import RDF/Solid libraries
    {
      files: [
        'src/presentation/**',
        'src/application/**',
        'src/domain/**',
        'src/infrastructure/!(auth)/**',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['n3', '@rdfjs/*', '@inrupt/*'],
                message: 'AR-02: Only L4/data and L5/auth can import RDF/Solid libraries',
              },
            ],
          },
        ],
      },
    },
    // AR-03: Only L5/http can call fetch
    {
      files: ['src/**', '!src/infrastructure/http/**'],
      rules: {
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'AR-03: Only L5/http can call fetch. Use PodHttp instead.',
          },
        ],
      },
    },
    // AR-15: No console.log except in logger
    {
      files: ['src/**', '!src/infrastructure/logging/**'],
      rules: {
        'no-console': ['warn', { allow: ['error'] }],
      },
    },
  ],
};
