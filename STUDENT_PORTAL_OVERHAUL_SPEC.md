# Technical Design Document: Ethereal Student Portal Overhaul

## 1. Vision & Rationale
**Goal**: Elevate the Student Portal from its current "Stone/Amber" look to a "Luxurious & Ethereal" digital experience that matches the high-end Staff Portal and Public Website.
**Visual Language**: 
- **Palette**: Deep Navy (#0F172A), Royal Gold (#B45309), and White/Transparencies.
- **Motion**: Fluid spring-based entry animations (Waterfall).
- **Aesthetic**: Glassmorphism (`backdrop-blur-2xl`), Liquid Mesh backgrounds, and high-contrast typography.

## 2. Key Architectural Changes

### 2.1 Global Theming
- **Background**: Replace static dark background with `liquid-mesh` utility.
- **Typography**: 
  - Headings: `Playfair Display` (Serif).
  - Body/Data: `Inter` (Sans) with `font-mono` for IDs.
- **Cards**: Switch from solid dark cards to `glass-ethereal` (translucent white with 20% border opacity).

### 2.2 Section-Specific Refactors

#### A. Login Experience
- **Before**: Simple dark card on radial gradient.
- **After**: "Ethereal Entrance" – Liquid Mesh background with a centered `glass-ethereal` card. Gold glow on the "Sign In" button. Dynamic floating elements.

#### B. Dashboard (Bento Grid)
- **Header**: Sticky blurred navigation with Gold-accented logo.
- **Hero Card**: Refine the welcome message with Serif typography and a larger Gold gradient text for the student's name.
- **Stats Widgets**: Update PieCharts and Progress bars to use `brand-gold` and `emerald-500`.
- **Subject Cards**: Enhance hover-lift effects and use higher-quality gradients.

#### C. Content Library
- **Video Grid**: Refined thumbnails with glass overlays.
- **Empty States**: Institutional design with Gold icons.

## 3. Framer Motion Integration
- **Waterfall Variant**: Used for sections entering the viewport.
  - `initial: { y: 40, opacity: 0 }`
  - `animate: { y: 0, opacity: 1 }`
  - `transition: { type: "spring", stiffness: 40 }`
- **Ripple Variant**: Spring-based hover effect for all clickable cards and buttons.

## 4. File Mapping
- **[StudentPortal.tsx](file:///d:/01_Web_Development/edwardian-academy-erp/frontend/src/pages/StudentPortal.tsx)**: Main implementation file.
- **[index.css](file:///d:/01_Web_Development/edwardian-academy-erp/frontend/src/index.css)**: Leverage existing `liquid-mesh` and `glass-ethereal` classes.

## 5. Branding Values (Verified)
- **Primary Navy**: `#0F172A`
- **Royal Gold**: `#B45309`
- **Success Emerald**: `#10B981`
- **Glass Border**: `rgba(255, 255, 255, 0.1)`
