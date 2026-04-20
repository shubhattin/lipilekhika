import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'binding/**',
      'wasm/target/**',
      'wasm/pkg/**',
      'a.js',
      'wasm/a.js'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.es2022,
        ...globals.nodeBuiltin,
        ...globals.browser
      }
    }
  },
  {
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off'
    }
  }
);
