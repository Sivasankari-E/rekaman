import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Prevent untyped errors
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Force consistent imports
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Modules can only import from their own folder, shared/, or middleware/
    // (Enforced by convention here; consider eslint-plugin-import for stricter rules later)
    files: ['src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/repository*'],
              message: 'Cross-module imports must go through service layer, not repository.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/**'],
  }
);
