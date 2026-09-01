// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Architectural layers (plan B2). Dependency direction is enforced mechanically:
 * lib <- data <- domain <- share/persistence <- state <- features <- app.
 * `components` are store-agnostic primitives and may only see lib/data.
 */
const LAYER_ELEMENTS = [
  { type: 'lib', pattern: 'src/lib/**' },
  { type: 'data', pattern: 'src/data/**' },
  { type: 'config', pattern: 'src/config/**' },
  { type: 'domain', pattern: 'src/domain/**' },
  { type: 'share', pattern: 'src/share/**' },
  { type: 'persistence', pattern: 'src/persistence/**' },
  { type: 'state', pattern: 'src/state/**' },
  { type: 'components', pattern: 'src/components/**' },
  { type: 'results', pattern: 'src/results/**' },
  { type: 'features', pattern: 'src/features/**' },
  { type: 'app', pattern: 'src/app/**' },
  { type: 'test', pattern: 'src/test/**' },
];

const LAYER_RULES = [
  { from: 'data', allow: ['lib'] },
  { from: 'config', allow: ['lib', 'data'] },
  { from: 'domain', allow: ['lib', 'data', 'config'] },
  { from: 'share', allow: ['lib', 'data', 'domain'] },
  { from: 'persistence', allow: ['lib', 'data', 'domain'] },
  { from: 'state', allow: ['lib', 'data', 'config', 'domain', 'share', 'persistence'] },
  { from: 'components', allow: ['lib', 'data'] },
  { from: 'results', allow: ['lib', 'data', 'domain', 'components'] },
  {
    from: 'features',
    allow: [
      'lib',
      'data',
      'config',
      'domain',
      'share',
      'persistence',
      'state',
      'components',
      'results',
    ],
  },
  {
    from: 'app',
    allow: [
      'lib',
      'data',
      'config',
      'domain',
      'share',
      'persistence',
      'state',
      'components',
      'results',
      'features',
    ],
  },
  {
    from: 'test',
    allow: [
      'lib',
      'data',
      'config',
      'domain',
      'share',
      'persistence',
      'state',
      'components',
      'results',
      'features',
      'app',
    ],
  },
];

const BLOCK_LIKE = ['block-like'];

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/data/generated/**', '.claude/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': LAYER_ELEMENTS,
      'boundaries/ignore': ['src/main.tsx', 'src/styles/**'],
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      // House style: braces everywhere, blank lines around block statements.
      curly: ['error', 'all'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: BLOCK_LIKE },
        { blankLine: 'always', prev: BLOCK_LIKE, next: '*' },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use `as const` object unions instead of enums.',
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: LAYER_RULES,
        },
      ],
    },
  },
  {
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
