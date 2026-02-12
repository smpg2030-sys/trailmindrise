/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#ffffff",
        primary: {
          500: "#ffffff", // Main Action White
          600: "#e7e9ea", // Hover White
        },
        slate: {
          50: "#16181c", // Very dark gray for hover backgrounds
          100: "#181818",
          200: "#202327",
          300: "#2f3336", // X Border Color
          400: "#536471",
          500: "#71767b", // Secondary Text
          600: "#536471",
          700: "#333639",
          800: "#16181c",
          900: "#000000",
        },
        zinc: {
          // Mapping tailwind standard to X palette logic where possible
          800: "#16181c",
          900: "#000000",
          950: "#000000"
        },
        // Remove colorful accents or map them to grayscale
        emerald: {
          400: "#ffffff",
          500: "#ffffff",
          600: "#e7e9ea",
        },
        sky: {
          500: "#1d9bf0", // Keep X blue for links if needed, or white
        }
      },
      fontFamily: {
        sans: ['"Outfit"', 'sans-serif'], // Keep existing font or switch to system? User said "design style", usually implies font too but I'll keep Outfit for now to ensure "functionality/base" is intact.
      },
      boxShadow: {
        'none': 'none',
        'sm': 'none', // Remove shadows
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        'premium': 'none',
        'glass': 'none',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px', // User max request
        'lg': '6px', // cap at 6px
        'xl': '6px',
        '2xl': '6px',
        '3xl': '6px',
        'full': '9999px', // For pill buttons
      }
    },
  },
  plugins: [],
  darkMode: 'class',
};
