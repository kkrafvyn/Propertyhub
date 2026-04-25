# Theme Token Guide

## Preferred tokens

- Page backgrounds: `bg-background`
- Primary surfaces: `bg-card`
- Secondary surfaces: `bg-secondary`
- Borders: `border-border`
- Body copy: `text-foreground`
- Supporting copy: `text-muted-foreground`
- Inputs needing elevation: `theme-input-surface`

## Shared utility classes

- Emphasis panels: `theme-panel-strong`, `theme-panel-soft`
- Accent states: `theme-accent-badge`, `theme-accent-icon`
- Success states: `theme-success-badge`, `theme-success-icon`
- Info states: `theme-info-badge`, `theme-info-icon`
- Warning states: `theme-warning-badge`, `theme-warning-icon`
- Price emphasis: `theme-price-text`

## Rules

- Prefer CSS variables and shared utility classes over hardcoded hex values.
- Reserve raw black overlays for image/media treatments only.
- If a component needs a new semantic state, add a token or shared utility first.
- Test every new component in `light`, `dark`, and `high-contrast` before merging.
