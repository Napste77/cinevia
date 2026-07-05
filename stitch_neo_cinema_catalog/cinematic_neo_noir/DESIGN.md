---
name: Cinematic Neo-Noir
colors:
  surface: '#0c1324'
  surface-dim: '#0c1324'
  surface-bright: '#33394c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f31'
  surface-container-high: '#23293c'
  surface-container-highest: '#2e3447'
  on-surface: '#dce1fb'
  on-surface-variant: '#c2caad'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#8c9479'
  outline-variant: '#434933'
  surface-tint: '#a0d800'
  primary: '#ffffff'
  on-primary: '#253600'
  primary-container: '#b7f700'
  on-primary-container: '#506e00'
  inverse-primary: '#4b6700'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffffff'
  on-tertiary: '#283044'
  tertiary-container: '#dae2fd'
  on-tertiary-container: '#5c647a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b7f700'
  primary-fixed-dim: '#a0d800'
  on-primary-fixed: '#141f00'
  on-primary-fixed-variant: '#374e00'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#0c1324'
  on-background: '#dce1fb'
  surface-variant: '#2e3447'
typography:
  display-xl:
    fontFamily: Sora
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is built for a high-end cinema discovery platform that prioritizes visual immersion and editorial curation. The brand personality is sophisticated, forward-thinking, and "darkly vibrant." It aims to evoke the feeling of a premium private screening room—quiet, focused, yet technologically advanced.

The style is a fusion of **Deep Minimalism** and **Glassmorphism**. By using a foundation of rich, near-black surfaces, we allow vibrant accent colors and high-quality film stills to pop with cinematic intensity. The UI feels atmospheric rather than utilitarian, using transparency and background blurs to maintain a sense of depth and spatial awareness.

## Colors

This design system utilizes a "Deep Dark" palette to minimize eye strain and maximize the impact of media content. 

- **Primary (Cyber Lime):** Used for critical calls to action, high-priority ratings, and interactive states. It provides a sharp, high-contrast sting against the dark background.
- **Secondary (Electric Violet):** Used for decorative accents, progress bars, and categorizations. It adds a futuristic, "neon-noir" depth to the interface.
- **Background Tiers:** The base layer is a true black (#020617) to allow OLED screens to blend with the device hardware. Elevated surfaces use Slate Grays to create structure.
- **Gradients:** Subtle linear gradients (15% opacity) from Electric Violet to transparent are used on glass surfaces to provide a sense of illumination.

## Typography

The typographic scale relies on the geometric tension of **Sora** for headings and the functional clarity of **Inter** for long-form metadata.

- **Headlines:** Use Sora with tight letter-spacing for a bold, modern look. Large display sizes are reserved for featured film titles and editorial headers.
- **Body:** Inter is used for synopses and reviews to ensure maximum readability against dark backgrounds.
- **Labels:** Small caps with increased tracking (letter spacing) are used for metadata like "GENRE," "RUNTIME," or "RELEASE DATE" to create an organized, architectural feel.

## Layout & Spacing

The design system moves away from rigid, repetitive grids in favor of a **Dynamic Fluid Grid**. 

- **Asymmetry:** Layouts should feel editorial. A hero movie might span 8 columns, while curated collections below it use an alternating 4-column and 2-column rhythm.
- **Whitespace:** Generous padding (using the 8px base unit) is essential to prevent the "wall of posters" look. Elements should breathe.
- **Breakpoints:** 
  - **Mobile (<640px):** Single column with horizontal scrolling carousels for collections.
  - **Tablet (640px - 1024px):** 6-column grid with staggered card heights.
  - **Desktop (>1024px):** 12-column grid with wide margins and off-center focal points.

## Elevation & Depth

Depth is conveyed through **Backdrop Blurs** and **Tonal Layering** rather than traditional drop shadows.

1.  **Base (Level 0):** Pure #020617. No depth.
2.  **Surface (Level 1):** #0F172A with a subtle 1px border (#1E293B) to define edges.
3.  **Glass (Level 2):** Semi-transparent white (5-10% opacity) with a `backdrop-filter: blur(20px)`. This is used for navigation bars, hovering cards, and overlays.
4.  **Glow (Level 3):** For active elements (like a selected movie card), apply a soft outer glow using the Primary or Secondary color at 20% opacity.

## Shapes

The shape language is defined by large, welcoming radii that contrast with the sharp, technical typography.

- **Primary Radius:** 16px (1rem) for standard cards and buttons.
- **Container Radius:** 24px (1.5rem) for main content sections and modal overlays.
- **Small Elements:** 8px (0.5rem) for input fields and tags.
- **Imagery:** Movie posters and backdrops must always follow the container radius to maintain the soft, modern aesthetic.

## Components

- **Movie Cards:** Avoid standard aspect ratios. Use "tall" cards for posters and "wide" cards for cinematic stills. Hovering a card should slightly scale the image and increase the intensity of its glass-morphic overlay.
- **Buttons:** 
  - *Primary:* Cyber Lime background with black text. High visibility.
  - *Secondary:* Glass-morphic (blur + thin border) with white text.
- **Chips/Tags:** Small, pill-shaped elements with a deep slate background and secondary violet text for genres or technical specs (4K, HDR).
- **Navigation:** A persistent, glass-morphic side rail or bottom bar (mobile) that blurs the content behind it.
- **Progress Bars:** Thin, Electric Violet lines for "watch progress," appearing at the very bottom edge of movie cards.
- **Interactive Inputs:** Search bars should be expansive, using a subtle glass effect and Sora for the placeholder text.