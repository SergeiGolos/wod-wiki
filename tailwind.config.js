/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}", 
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Solarized color palette
        'solarized': {
          'base03': '#002b36',
          'base02': '#073642',
          'base01': '#586e75',
          'base00': '#657b83',
          'base0': '#839496',
          'base1': '#93a1a1',
          'base2': '#eee8d5',
          'base3': '#fdf6e3',
          'yellow': '#b58900',
          'orange': '#cb4b16',
          'red': '#dc322f',
          'magenta': '#d33682',
          'violet': '#6c71c4',
          'blue': '#268bd2',
          'cyan': '#2aa198',
          'green': '#859900',
        },
        'journal': {
          'paper': '#f5f1e4',
          'paper-dark': '#1e2021',
          'ink': '#333333',
          'ink-light': '#f0f0f0',
        }
      },
      backgroundImage: {
        'paper-texture': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmZmZmNjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw0IDRaTTQgMEwwIDRaIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlPSIjZjVmMWU0MzAiPjwvcGF0aD4KPC9zdmc+Cg==')",
        'paper-texture-dark': "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjAyMDIwNjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw0IDRaTTQgMEwwIDRaIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlPSIjMjAyMDIwMzAiPjwvcGF0aD4KPC9zdmc+Cg==')",
      },
      boxShadow: {
        'journal': '0 2px 6px rgba(0, 0, 0, 0.1)',
        'journal-dark': '0 2px 6px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'journal': '0.5rem',
      }
    },
  },
  plugins: [],
}
