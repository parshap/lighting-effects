module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
  },
  plugins: ["jest"],
  rules: {},
  overrides: [
    {
      files: ["**/*test.js"],
      extends: ["plugin:jest/recommended"],
    },
  ],
};
