# Atomic Design Patterns Library

> A reference catalogue of common UI patterns classified by atomic stage.
> Use this to quickly identify where a familiar pattern sits in the hierarchy,
> and what it is composed of.

---

## Atom Patterns

Atoms are the periodic table of your design system. Each cell below is an atom or token.

### Form Atoms
| Atom | Description | Key Properties |
|------|------------|----------------|
| `TextInput` | Single-line text field | type, placeholder, value, disabled, error state |
| `Textarea` | Multi-line text field | rows, value, resize behavior |
| `Checkbox` | Boolean toggle with label (label is a sibling atom) | checked, indeterminate, disabled |
| `RadioButton` | Single option in a radio group | checked, value, disabled |
| `Select` | Dropdown option list | options[], value, disabled |
| `Toggle` / `Switch` | On/off binary control | checked, onChange |
| `Slider` / `Range` | Numeric range input | min, max, step, value |
| `FileInput` | File chooser | accept, multiple |

### Action Atoms
| Atom | Description | Key Variants |
|------|------------|--------------|
| `Button` | Clickable action trigger | primary, secondary, ghost, danger, icon-only, loading |
| `Link` | Navigational anchor | internal, external, disabled |
| `IconButton` | Button containing only an icon | size, variant, aria-label required |

### Typography Atoms
| Atom | Description | Key Properties |
|------|------------|----------------|
| `Heading` | h1–h6 display text | level, size (can differ from level), truncate |
| `BodyText` | Paragraph / prose text | size, color, weight |
| `Label` | Form field label | htmlFor, required indicator |
| `Caption` | Small supplemental text | color, size |
| `Badge` / `Tag` | Inline status or category marker | color, label, dismissible |
| `Code` | Inline code snippet | monospace, highlight |

### Media Atoms
| Atom | Description | Key Properties |
|------|------------|----------------|
| `Image` | Responsive image | src, alt, aspectRatio, objectFit, loading |
| `Avatar` | User/entity photo or initials | src, alt, fallback initials, size |
| `Icon` | SVG or icon-font symbol | name/src, size, color, aria-hidden |
| `Video` | HTML5 video player | src, controls, autoplay, poster |

### Feedback & Decoration Atoms
| Atom | Description |
|------|------------|
| `Spinner` / `Loader` | Indeterminate activity indicator |
| `ProgressBar` | Determinate progress indicator |
| `Divider` | Visual separator (horizontal or vertical) |
| `Skeleton` | Placeholder shape for loading content |
| `Tooltip` | Small label on hover/focus (anchored to another atom) |

### Token Atoms (non-visual but foundational)
| Token Type | Examples |
|-----------|---------|
| Color | `--color-primary`, `--color-danger`, `--color-surface` |
| Spacing | `--space-1` (4px) … `--space-16` (64px) |
| Typography | `--font-sans`, `--text-sm`, `--font-semibold` |
| Border radius | `--radius-sm`, `--radius-lg`, `--radius-full` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-xl` |

---

## Molecule Patterns

### Form Molecules
| Molecule | Atoms inside | Job |
|---------|-------------|-----|
| `FormField` | Label + TextInput + ErrorText | Single labeled, validated field |
| `SearchForm` | Label (sr-only) + TextInput + Submit Button | Keyword search control |
| `CheckboxGroup` | Heading + N×(Checkbox + Label) | Multi-select option group |
| `RadioGroup` | Heading + N×(RadioButton + Label) | Single-select option group |
| `FileUploadField` | Label + FileInput + helper text | File upload with affordance |
| `PasswordField` | Label + TextInput + ToggleVisibility IconButton | Obscured text entry |
| `DateRangePicker` | Label + DateInput × 2 + calendar trigger | Date range selection |

### Navigation Molecules
| Molecule | Atoms inside | Job |
|---------|-------------|-----|
| `NavItem` | Icon (optional) + Link | Single navigation entry |
| `BreadcrumbItem` | Link + Divider | One step in a breadcrumb trail |
| `TabItem` | Button/Link + active indicator | One tab in a tab bar |
| `PaginationControl` | Prev Button + Page Buttons + Next Button | Page navigation |

### Feedback Molecules
| Molecule | Atoms inside | Job |
|---------|-------------|-----|
| `Toast` / `Snackbar` | Icon + BodyText + Dismiss Button | Transient status notification |
| `Alert` / `InlineMessage` | Icon + BodyText + optional action Link | Persistent contextual message |
| `EmptyState` | Image/Illustration + Heading + BodyText + CTA Button | No-content placeholder |
| `LoadingState` | Spinner + Caption | Content loading indicator |
| `ErrorMessage` | Icon + BodyText + Retry Button | Recoverable error message |

### Card / Item Molecules
| Molecule | Atoms inside | Job |
|---------|-------------|-----|
| `ProductCard` | ProductImage + Heading + PriceTag + CartButton | Single product preview |
| `ArticleCard` | ThumbnailImage + Heading + Caption + Link | Article/post preview |
| `UserCard` | Avatar + Heading + Caption | Person preview |
| `StatCard` | Label + Numeric Heading + trend Icon | Single KPI display |
| `NotificationItem` | Avatar + BodyText + Timestamp + dismiss button | Inbox notification entry |

### Media Molecules
| Molecule | Atoms inside | Job |
|---------|-------------|-----|
| `AvatarWithName` | Avatar + Heading + Caption (role/subtitle) | Named entity identifier |
| `ImageWithCaption` | Image + Caption | Labelled illustration |
| `VideoPlayer` | Video + controls overlay + title | Self-contained video |

---

## Organism Patterns

### Navigation Organisms
| Organism | Molecules / Atoms inside | Job |
|---------|--------------------------|-----|
| `SiteHeader` | Logo + PrimaryNav (NavItems) + SearchForm + AuthButtons | Top-of-page navigation bar |
| `SiteFooter` | Logo + link columns (NavItems) + legal text | Bottom-of-page |
| `SideNav` | Section headings + NavItems | Vertical navigation panel |
| `TabBar` | TabItems × N | Horizontal section switcher |
| `Breadcrumb` | BreadcrumbItems × N | Path indicator |
| `MobileNav` / `Drawer` | Hamburger trigger + NavItems | Off-canvas mobile navigation |

### Content Organisms
| Organism | Molecules / Atoms inside | Job |
|---------|--------------------------|-----|
| `ProductGrid` | ProductCard × N | Product listing section |
| `ArticleList` | ArticleCard × N | Blog/news listing section |
| `DataTable` | Column headers + DataRow molecules × N | Tabular data section |
| `CommentThread` | CommentItem organisms × N (recursive) | Nested discussion section |
| `ActivityFeed` | ActivityItem molecules × N | Time-sorted event log |

### Form Organisms
| Organism | Molecules / Atoms inside | Job |
|---------|--------------------------|-----|
| `LoginForm` | FormField × 2 + PasswordField + Submit Button + ForgotLink | Authentication section |
| `SignUpForm` | FormField × N + agreements + Submit Button | Registration section |
| `MultiStepForm` | StepIndicator + FormFields per step + nav Buttons | Complex form flow |
| `FilterPanel` | CheckboxGroups + RadioGroups + RangeSlider + Apply Button | Search refinement sidebar |

### Hero / Banner Organisms
| Organism | Molecules / Atoms inside | Job |
|---------|--------------------------|-----|
| `HeroBanner` | Heading + BodyText + CTA Button(s) + BackgroundImage | Primary page intro section |
| `AnnouncementBanner` | Alert molecule + Dismiss Button | Sitewide notification |

### Modal / Overlay Organisms
| Organism | Molecules / Atoms inside | Job |
|---------|--------------------------|-----|
| `ModalDialog` | Overlay atom + Heading + Body content + Action buttons | Interrupting dialog |
| `Drawer` / `Sheet` | Panel overlay + Header + scrollable content | Side-sliding panel |
| `DropdownMenu` | Trigger atom + menu items | Context or action menu |
| `Popover` | Trigger atom + floating content panel | Anchored overlay |

---

## Template Patterns

Templates are **wireframe + real components**. They define layout, not content.

| Template | Organisms used | Key layout concerns |
|---------|---------------|---------------------|
| `HomepageTemplate` | Hero + featured sections + CTA | Full-bleed hero; max-width on content |
| `ArticleTemplate` | Header + ArticleBody + Sidebar + RelatedContent | Readable line-length; sticky sidebar |
| `ShopTemplate` | Header + FilterPanel + ProductGrid + Pagination | 2-col desktop / 1-col mobile |
| `DashboardTemplate` | Header + SideNav + StatsGrid + ActivityFeed | Fixed nav; scrollable main |
| `AuthTemplate` | LogoAtom + AuthForm + footer links | Centered single-column |
| `SearchResultsTemplate` | Header + SearchForm + FilterPanel + ResultList | Filter toggle on mobile |
| `ProfileTemplate` | Header + ProfileHero + ContentTabs | Tab switching without full nav |
| `ErrorTemplate` | Header + ErrorMessage + BackLink | Minimal, calming layout |

---

## Page Variation Patterns

Each page should exercise these content variation states:

| Variation | What to test |
|-----------|------------|
| Empty state | No data returned; show EmptyState molecule |
| Error state | Fetch failed; show ErrorMessage molecule |
| Loading state | In-flight; show Skeleton atoms |
| Minimal content | Shortest possible text/images |
| Maximum content | Longest possible text — wrapping, overflow |
| Permission variants | Admin vs guest views |
| Responsive | Mobile (320px) / tablet (768px) / desktop (1280px) |
| RTL / i18n | Layout flip and translated string lengths |
