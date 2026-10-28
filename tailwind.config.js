/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F172A",
          secondary: "#38BDF8",
          accent: "#8B5CF6",
        },
        neutral: {
          background: "#FFFFFF",
          surface: "#F8FAFC",
          text_main: "#0F172A",
          text_muted: "#64748B",
          border: "#E2E8F0",
        },
        feedback: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
