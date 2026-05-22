/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/consistent-type-imports": "warn",
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
};
