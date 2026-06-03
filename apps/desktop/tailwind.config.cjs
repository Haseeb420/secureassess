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
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['DM Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
        display: ['Syne', 'DM Sans', 'sans-serif'],
      },
      colors: {
        ...baseConfig.theme?.extend?.colors,
        editor: {
          bg:      '#1E1E2E',
          surface: '#262637',
          border:  '#383850',
          text:    '#CDD6F4',
        },
      },
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
        '250': '250ms',
      },
    },
  },
  plugins: [
    ...(baseConfig.plugins ?? []),
  ],
};
