import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Pure logic must stay DOM-free so it runs in the worker and in Vitest.
    files: ['src/lib/**/*.ts'],
    languageOptions: { globals: globals['shared-node-browser'] },
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage'],
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', 'react/*'] }],
    },
  },
  {
    files: ['src/workers/**/*.ts'],
    languageOptions: { globals: globals.worker },
  },
)
