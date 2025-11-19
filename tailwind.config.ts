import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}", // Added contexts just in case
  ],
  theme: {
    extend: {
      colors: {
        primary: "#16a34a", // Custom Green
        secondary: "#1e293b", // Slate 800
      },
    },
  },
  plugins: [],
};
export default config;