/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'airbnb'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./**/tsconfig.json'],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    "import/prefer-default-export": "off",
    "import/extensions": "off",
    "import/no-extraneous-dependencies": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ],
    "no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ],
    "no-underscore-dangle": "off",
    "no-new": "off",
    "no-param-reassign": "off",
    "no-restricted-syntax": "off",
    "new-cap": "off",
    "no-continue": "off",
    "max-len": ["warn", { "code": 140 }],
    "no-await-in-loop": "off",
    "no-mixed-operators": "off",
    "no-console": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": false
      }
    ],
    "no-use-before-define": "off",
    "@typescript-eslint/no-floating-promises": "off"
  },

  settings: {
    "import/resolver": {
      typescript: {} // this loads <rootdir>/tsconfig.json to eslint
    },
  },
  root: true,
};