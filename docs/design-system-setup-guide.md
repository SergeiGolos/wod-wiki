# Design System Setup Guide

## Overview

This guide provides step-by-step instructions for migrating WOD Wiki to use the modern design system based on shadcn/ui components and the unified styling from the reference implementation.

## Prerequisites

- Node.js 18+
- npm or yarn package manager
- Existing WOD Wiki project

## Step 1: Install Required Dependencies

### Core UI Dependencies
```bash
# Install shadcn/ui required packages
npm install class-variance-authority clsx tailwind-merge

# Install Radix UI primitives
npm install @radix-ui/react-slot @radix-ui/react-progress @radix-ui/react-label

# Install icon library
npm install @phosphor-icons/react

# Additional UI components (as needed)
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-alert-dialog
npm install @radix-ui/react-tooltip @radix-ui/react-separator
```

### Development Dependencies
```bash
# Install for better TypeScript support
npm install -D @types/node

# Install for shadcn/ui CLI
npm install -D @shadcn/ui
```

## Step 2: Set Up shadcn/ui

### Initialize shadcn/ui
```bash
npx shadcn-ui@latest init
```

During initialization, configure:
- **TypeScript**: Yes
- **Tailwind CSS**: Yes
- **src/**: Yes (for component location)
- **CSS variables**: Yes
- **Default color**: Slate (or choose your preference)

### Install Required Components
```bash
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add label
npx shadcn-ui@latest add input
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add skeleton
```

## Step 3: Configure Tailwind CSS

### Update tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### Install Tailwind CSS Animation Plugin
```bash
npm install -D tailwindcss-animate
```

## Step 4: Update CSS Variables

### Add to globals.css (or main CSS file)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Step 5: Create Utility Functions

### Create src/lib/utils.ts
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Create src/lib/constants.ts
```typescript
export const TIMER_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  muted: "hsl(var(--muted))",
  destructive: "hsl(var(--destructive))",
} as const;

export const WORKOUT_TYPES = {
  AMRAP: "AMRAP",
  FOR_TIME: "For Time",
  EMOM: "EMOM",
  TABATA: "Tabata",
} as const;

export const HEART_RATE_ZONES = {
  ZONE_1: { min: 0, max: 120, color: "bg-blue-500", label: "Active Recovery" },
  ZONE_2: { min: 120, max: 140, color: "bg-green-500", label: "Aerobic Base" },
  ZONE_3: { min: 140, max: 160, color: "bg-yellow-500", label: "Aerobic Threshold" },
  ZONE_4: { min: 160, max: 175, color: "bg-orange-500", label: "Lactate Threshold" },
  ZONE_5: { min: 175, max: 999, color: "bg-red-500", label: "Neuromuscular Power" },
} as const;
```

## Step 6: Project Structure Updates

### New Directory Structure
```
src/
├── components/
│   └── ui/              # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── progress.tsx
│       ├── badge.tsx
│       ├── label.tsx
│       ├── input.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       ├── alert.tsx
│       ├── separator.tsx
│       ├── tooltip.tsx
│       └── skeleton.tsx
├── lib/
│   ├── utils.ts         # Utility functions
│   └── constants.ts     # App constants
├── clock/
│   ├── components/      # Updated clock components
│   └── anchors/         # Updated clock anchors
├── editor/
│   └── components/      # Updated editor components
└── components/
    └── fragments/       # Updated fragment components
```

## Step 7: Import Path Updates

### Update tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/ui/*": ["./src/components/ui/*"]
    }
  }
}
```

### Update Component Imports
```typescript
// Before
import { SomeComponent } from '../components/SomeComponent'

// After
import { SomeComponent } from '@/components/SomeComponent'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
```

## Step 8: Migration Checklist

### Phase 1: Foundation
- [ ] Install all dependencies
- [ ] Set up shadcn/ui
- [ ] Configure Tailwind CSS
- [ ] Create utility functions
- [ ] Update project structure

### Phase 2: Core Components
- [ ] Update ClockAnchor.tsx
- [ ] Update TimeDisplay.tsx
- [ ] Update TimeUnit.tsx
- [ ] Update EnhancedTimerHarness.tsx
- [ ] Update TimerMemoryVisualization.tsx

### Phase 3: Editor & Fragments
- [ ] Update WodWiki.tsx
- [ ] Update FragmentVisualizer.tsx
- [ ] Update all fragment visualization components

### Phase 4: Stories & Tests
- [ ] Update all Storybook stories
- [ ] Update test mocks and expectations
- [ ] Validate all functionality works

### Phase 5: Polish
- [ ] Review consistency across all components
- [ ] Optimize bundle size
- [ ] Test accessibility
- [ ] Update documentation

## Step 9: Common Migration Patterns

### Card Migration
```typescript
// Before
<div className="bg-white rounded-lg shadow-sm p-8">
  {/* content */}
</div>

// After
<Card>
  <CardContent className="p-8">
    {/* content */}
  </CardContent>
</Card>
```

### Button Migration
```typescript
// Before
<button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  <Play size={20} />
  Start
</button>

// After
<Button size="lg" className="w-24">
  <Play size={20} className="mr-2" />
  Start
</Button>
```

### Progress Bar Migration
```typescript
// Before
<div className="w-full bg-gray-200 rounded-full h-2">
  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
</div>

// After
<Progress value={progress} className="h-2" />
```

### Badge Migration
```typescript
// Before
<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
  AMRAP
</span>

// After
<Badge variant="secondary">AMRAP</Badge>
```

## Step 10: Validation

### Run Tests
```bash
npm run test:unit
npm run test:storybook
```

### Run Storybook
```bash
npm run storybook
```

### Check Bundle Size
```bash
npm run build
```

### Accessibility Testing
```bash
npm run test:a11y  # if available
```

## Troubleshooting

### Common Issues

1. **Missing CSS Variables**: Ensure globals.css is imported in your main entry point
2. **Tailwind Classes Not Working**: Verify Tailwind configuration and content paths
3. **Import Errors**: Check tsconfig.json paths configuration
4. **Component Not Found**: Ensure shadcn/ui components are properly installed

### Performance Considerations

- Use dynamic imports for large components
- Implement code splitting for better bundle size
- Monitor bundle size with `npm run build`
- Use React.memo for components that don't need frequent re-renders

### Next Steps

After completing the setup guide, proceed with the component migration following the patterns outlined in the research document.