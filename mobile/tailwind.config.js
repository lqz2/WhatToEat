/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6B35",
        secondary: "#F7C59F",
        accent: "#EFEFD0",
        dark: "#004E89",
      },
    },
  },
  plugins: [],
};
