import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist', 'node_modules', '.sst', 'client/src/sst-env.d.ts'] },
  // Server and shared packages (Node.js)
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['server/src/**/*.ts', 'shared/src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
  // Client package (Browser + React)
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
)
