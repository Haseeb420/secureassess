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
          navy:           '#2A2A47',
          'navy-light':   '#3A3A60',
          'navy-pale':    '#EEEEF5',
          'navy-dark':    '#1A1A30',
          'navy-mid':     '#22223A',
          orange:         '#DE5E1F',
          'orange-light': '#F06B28',
          'orange-pale':  '#FFF0E8',
        },
      },
    },
  },
  plugins: [],
};
