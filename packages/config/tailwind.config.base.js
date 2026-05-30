/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          white:          '#FFFFFF',
          surface:        '#F7F8FA',
          border:         '#E8E9EE',
          navy:           '#2A2A47',
          'navy-light':   '#3A3A60',
          'navy-pale':    '#EEEEF5',
          orange:         '#DE5E1F',
          'orange-light': '#F06B28',
          'orange-pale':  '#FFF0E8',
        },
      },
    },
  },
  plugins: [],
};
