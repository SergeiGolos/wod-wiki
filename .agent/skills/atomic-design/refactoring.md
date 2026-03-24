# Refactoring Existing UI into Atomic Design

> Use this file when the audit is done and you need to **restructure existing components**
> into a clean atomic hierarchy — in code.

---

## Guiding Principle

> Refactor from the bottom up — atoms first, then molecules, then organisms.
> Never start by restructuring templates/pages; without stable atoms, higher stages drift.

Refactoring is iterative. You will:
1. Extract atoms (stabilise the base)
2. Compose molecules (group atomic purposes)
3. Compose organisms (group section purposes)
4. Introduce/split templates (separate structure from content)
5. Thin pages (make them pure data-fetching + template composition)

---

## Step 1 — Extract Atoms

### What to look for
- Repeated primitive elements with hardcoded styles: buttons, inputs, text elements, icons
- Inline style values that should be design tokens (`color: #3b82f6` → `color: var(--color-primary)`)
- Copy-pasted JSX snippets across multiple files

### How to extract (React/TypeScript example)

**Before:**
```tsx
// ProductCard.tsx
<div>
  <img src={product.img} className="w-full h-48 object-cover rounded" />
  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
  <span className="text-sm text-gray-500">${product.price}</span>
  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Add to cart
  </button>
</div>
```

**After — extract atoms first:**
```tsx
// atoms/Button.tsx
interface ButtonProps { label: string; onClick?: () => void; variant?: 'primary' | 'ghost'; }
export const Button = ({ label, onClick, variant = 'primary' }: ButtonProps) => (
  <button
    onClick={onClick}
    className={variant === 'primary'
      ? 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
      : 'text-blue-600 underline px-4 py-2'}
  >
    {label}
  </button>
);

// atoms/ProductImage.tsx
interface ProductImageProps { src: string; alt: string; }
export const ProductImage = ({ src, alt }: ProductImageProps) => (
  <img src={src} alt={alt} className="w-full h-48 object-cover rounded" />
);

// atoms/Heading.tsx
interface HeadingProps { level: 1|2|3|4|5|6; children: React.ReactNode; }
export const Heading = ({ level, children }: HeadingProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className="text-lg font-semibold text-gray-900">{children}</Tag>;
};

// atoms/PriceTag.tsx
export const PriceTag = ({ amount }: { amount: number }) => (
  <span className="text-sm text-gray-500">${amount.toFixed(2)}</span>
);
```

### Atom extraction checklist
- [ ] Does the atom have a single, stable visual purpose?
- [ ] Can it be styled by props/variants, not by external className overrides?
- [ ] Does it have a TypeScript interface for all its props?
- [ ] Is it exported from an `atoms/index.ts` barrel?

---

## Step 2 — Compose Molecules

Once atoms exist, group them into single-purpose molecules.

```tsx
// molecules/ProductCard.tsx
import { ProductImage } from '../atoms/ProductImage';
import { Heading } from '../atoms/Heading';
import { PriceTag } from '../atoms/PriceTag';
import { Button } from '../atoms/Button';

interface ProductCardProps {
  name: string;
  price: number;
  imageUrl: string;
  imageAlt: string;
  onAddToCart: () => void;
}

export const ProductCard = ({ name, price, imageUrl, imageAlt, onAddToCart }: ProductCardProps) => (
  <div className="rounded-lg shadow overflow-hidden">
    <ProductImage src={imageUrl} alt={imageAlt} />
    <div className="p-4 flex flex-col gap-2">
      <Heading level={3}>{name}</Heading>
      <PriceTag amount={price} />
      <Button label="Add to cart" onClick={onAddToCart} />
    </div>
  </div>
);
```

### Molecule composition rules
- Accept **data props** (name, price) — not raw HTML
- Accept **callback props** (onAddToCart) — not business logic
- Do NOT fetch data inside a molecule
- Do NOT manage complex state inside a molecule (local UI state like hover is OK)

---

## Step 3 — Compose Organisms

Group molecules into self-contained sections.

```tsx
// organisms/ProductGrid.tsx
import { ProductCard } from '../molecules/ProductCard';

interface Product { id: string; name: string; price: number; imageUrl: string; imageAlt: string; }
interface ProductGridProps { products: Product[]; onAddToCart: (id: string) => void; }

export const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => (
  <section aria-label="Product listing">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(p => (
        <ProductCard key={p.id} {...p} onAddToCart={() => onAddToCart(p.id)} />
      ))}
    </div>
  </section>
);
```

### Organism rules
- An organism is **self-contained as a section** — it can appear on multiple pages
- Accepts a list/group of data, not a single item (single items → molecule)
- Can contain layout (grid, flex) because it defines the section's internal structure
- Should still NOT fetch its own data (that belongs one level up — in a template or page)

---

## Step 4 — Introduce Templates

A template is the layout layer — no real data, just content shape.

```tsx
// templates/ShopTemplate.tsx
import { SiteHeader } from '../organisms/SiteHeader';
import { ProductGrid } from '../organisms/ProductGrid';
import { SiteFooter } from '../organisms/SiteFooter';

interface ShopTemplateProps {
  header: React.ReactNode;   // or typed props — depends on flexibility needed
  productGrid: React.ReactNode;
  footer: React.ReactNode;
}

export const ShopTemplate = ({ header, productGrid, footer }: ShopTemplateProps) => (
  <div className="min-h-screen flex flex-col">
    <header>{header}</header>
    <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">{productGrid}</main>
    <footer>{footer}</footer>
  </div>
);
```

**Alternative: template as direct organism composition (simpler)**
```tsx
export const ShopTemplate = () => (
  <div className="min-h-screen flex flex-col">
    <SiteHeader />
    <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
      {/* ProductGrid slot — filled at page level */}
    </main>
    <SiteFooter />
  </div>
);
```

### Template rules
- Defines **where** things go, not **what** things are
- Character length constraints and image dimensions belong here
- Use Storybook with placeholder/Lorem Ipsum content to test the template in isolation
- One template → many pages (e.g., `ArticleTemplate` used for every blog post)

---

## Step 5 — Thin Pages

Pages wire data fetching / routing to templates.

```tsx
// pages/ShopPage.tsx
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { ShopTemplate } from '../templates/ShopTemplate';
import { SiteHeader } from '../organisms/SiteHeader';
import { ProductGrid } from '../organisms/ProductGrid';
import { SiteFooter } from '../organisms/SiteFooter';

export const ShopPage = () => {
  const { products, isLoading } = useProducts();
  const { addToCart } = useCart();

  return (
    <ShopTemplate
      header={<SiteHeader />}
      productGrid={
        isLoading
          ? <ProductGridSkeleton />
          : <ProductGrid products={products} onAddToCart={addToCart} />
      }
      footer={<SiteFooter />}
    />
  );
};
```

### Page rules
- Pages are **thin orchestrators** — data in, template out
- All visual decisions live in atoms/molecules/organisms/templates
- Pages are the only layer that should call hooks, fetch data, or connect to stores
- Each route = one page component

---

## File Structure Convention

```
src/
├── atoms/
│   ├── Button.tsx
│   ├── Heading.tsx
│   ├── TextInput.tsx
│   └── index.ts            ← barrel export
├── molecules/
│   ├── SearchForm.tsx
│   ├── ProductCard.tsx
│   └── index.ts
├── organisms/
│   ├── SiteHeader.tsx
│   ├── ProductGrid.tsx
│   ├── SiteFooter.tsx
│   └── index.ts
├── templates/
│   ├── ShopTemplate.tsx
│   ├── ArticleTemplate.tsx
│   └── index.ts
├── pages/
│   ├── ShopPage.tsx
│   ├── ArticlePage.tsx
│   └── index.ts
└── tokens/
    ├── colors.ts
    ├── spacing.ts
    └── typography.ts
```

---

## Refactoring Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Extracting atoms before audit | Creates wrong granularity boundaries | Complete the audit first |
| One massive `components/` folder | No hierarchy signal | Apply stage-based subdirectories |
| Atoms with business logic | Breaks reusability | Move logic to hooks or molecules |
| God components (>200 LOC JSX) | Unmaintainable; mixes all stages | Decompose top-down: find organisms first |
| Fetching in molecules/organisms | Couples UI to data layer | Move data fetching to pages or feature-level hooks |
| Template = page | No content structure abstraction | Introduce a layout-only template component |
| Props drilling through 4+ levels | Molecule → Organism → Template → Page prop chains | Consider context or state management for deeply shared data |
