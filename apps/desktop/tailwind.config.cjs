const baseConfig = require("@secureassess/config/tailwind");

/** @type {import("tailwindcss").Config} */
module.exports = {
  ...baseConfig,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      colors: {
        ...baseConfig.theme?.extend?.colors,
        editor: {
          bg:      '#1E1E2E',
          surface: '#262637',
          border:  '#383850',
          text:    '#CDD6F4',
        },
      },
    },
  },
  plugins: [
    ...(baseConfig.plugins ?? []),
  ],
};
