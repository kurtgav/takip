import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'public/**', 'node_modules/**', 'logs/**', '.orchestrator/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' } } },
);
