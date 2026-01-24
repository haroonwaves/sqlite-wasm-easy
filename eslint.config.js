import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	{ ignores: ['dist', 'node_modules'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
			'@typescript-eslint/no-explicit-any': 'off',
		},
	}
);
