const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");
const svgToDataUri = require("mini-svg-data-uri");
const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@shadcn/ui/react/**/*.js'
  ],
  theme: {
     container: {
       center: true,
       padding: "2rem",
       screens: {
         "2xl": "1400px",
       },
     },
     extend: {
       fontFamily: {
         sans: ["Inter var", ...defaultTheme.fontFamily.sans],
         mono: ["'JetBrains Mono'", ...defaultTheme.fontFamily.mono],
       },
       colors: {
         border: "hsl(var(--border))",
         input: "hsl(var(--input))",
         ring: "hsl(var(--ring))",
         background: "hsl(var(--background))",
         foreground: "hsl(var(--foreground))",
         primary: {
           DEFAULT: "hsl(var(--primary))",
           foreground: "hsl(var(--primary-foreground))",
         },
         secondary: {
           DEFAULT: "hsl(var(--secondary))",
           foreground: "hsl(var(--secondary-foreground))",
         },
         destructive: {
           DEFAULT: "hsl(var(--destructive))",
           foreground: "hsl(var(--destructive-foreground))",
         },
         muted: {
           DEFAULT: "hsl(var(--muted))",
           foreground: "hsl(var(--muted-foreground))",
         },
         accent: {
           DEFAULT: "hsl(var(--accent))",
           foreground: "hsl(var(--accent-foreground))",
         },
         popover: {
           DEFAULT: "hsl(var(--popover))",
           foreground: "hsl(var(--popover-foreground))",
         },
         card: {
           DEFAULT: "hsl(var(--card))",
           foreground: "hsl(var(--card-foreground))",
         },
       },
       borderRadius: {
         lg: "var(--radius)",
         md: "calc(var(--radius) - 2px)",
         sm: "calc(var(--radius) - 4px)",
       },
       keyframes: {
         "accordion-down": {
           from: { height: "0" },
           to: { height: "var(--radix-accordion-content-height)" },
         },
         "accordion-up": {
           from: { height: "var(--radix-accordion-content-height)" },
           to: { height: "0" },
         },
         "collapsible-down": {
           from: { height: "0" },
           to: { height: "var(--radix-collapsible-content-height)" },
         },
         "collapsible-up": {
           from: { height: "var(--radix-collapsible-content-height)" },
           to: { height: "0" },
         },
         scroll: {
           to: {
             transform: "translate(calc(-50% - 0.5rem))",
           },
         },
         marquee: {
           '0%': { transform: 'translateX(0%)' },
           '100%': { transform: 'translateX(-100%)' }
         },
         'marquee-reverse': {
           '0%': { transform: 'translateX(-100%)' },
           '100%': { transform: 'translateX(0%)' }
         },
         'bounce-subtle': {
           '0%, 100%': { transform: 'translateX(0)' },
           '50%': { transform: 'translateX(4px)' }
         },
         'blink': {
           '0%, 100%': { opacity: '1' },
           '50%': { opacity: '0' }
         },
         'scrollUp': {
            '0%': { transform: 'translateY(0)' },
            '100%': { transform: 'translateY(-50%)' },
         }
       },
       animation: {
         "accordion-down": "accordion-down 0.2s ease-out",
         "accordion-up": "accordion-up 0.2s ease-out",
         "collapsible-down": "collapsible-down 0.2s ease-out",
         "collapsible-up": "collapsible-up 0.2s ease-out",
         scroll: "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
         marquee: 'marquee 60s linear infinite',
         'marquee-reverse': 'marquee-reverse 60s linear infinite',
         'bounce-subtle': 'bounce-subtle 1.5s ease-in-out infinite',
         'blink': 'blink 1s step-start infinite',
         'vertical-scroll': 'scrollUp 30s linear infinite',
       },
     },
  },
  plugins: [
    require("tailwindcss-animate"),
    addVariablesForColors,
    function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "bg-grid": (value) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`
            )}")`,
          }),
          "bg-grid-small": (value) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="8" height="8" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`
            )}")`,
          }),
          "bg-dot": (value) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="none"><circle fill="${value}" id="pattern-circle" cx="10" cy="10" r="1.6257413380501518"></circle></svg>`
            )}")`,
          }),
        },
        { values: flattenColorPalette(theme("backgroundColor")), type: "color" }
      );
    },
  ],
}

/**
 * Adds CSS variables for colors.
 * @param {{ addBase: function, theme: function }} param0
 */
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );
 
  addBase({
    ":root": newVars,
  });
} 