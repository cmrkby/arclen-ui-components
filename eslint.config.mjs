import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [{
 ignores:['node_modules/**','dist/**','coverage/**'],
},{
 files:['components/*/src/react/**/*.{ts,tsx,js,jsx}'],
 languageOptions:{parser:tseslint.parser},
 plugins:{'react-hooks':reactHooks},
 rules:reactHooks.configs.recommended.rules,
}];
