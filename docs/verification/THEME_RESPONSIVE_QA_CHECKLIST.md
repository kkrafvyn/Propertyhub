# Theme and Responsive QA Checklist

Use this checklist before shipping UI work that changes layout, surfaces, or interactions.

## Breakpoints

- `360px` phone: no horizontal scrolling, sticky actions stay tappable, bottom nav does not cover content.
- `768px` tablet: stacked layouts collapse before cards feel cramped, drawers and sheets remain usable.
- `1024px` laptop: two-column layouts feel balanced, sticky sidebars do not overlap page content.
- `1440px+` wide screens: cards do not stretch awkwardly, max-width containers still anchor the page.

## Theme pass

- Verify `system`, `light`, `dark`, and `high-contrast`.
- Check cards, popovers, dialogs, drawers, sheets, and input surfaces for readable contrast.
- Confirm badges, charts, empty states, and map controls use theme tokens instead of hardcoded fills.
- Review hover, focus, selected, and disabled states in every supported theme.
- Confirm the toast theme matches the active palette.

## Motion pass

- Turn on reduced motion in profile settings.
- Confirm transitions, staggered reveals, and animated affordances calm down without breaking layout.
- Check drawers, dialogs, and gallery interactions still feel responsive when motion is reduced.

## Listing flow

- Marketplace filters work from mobile drawer and desktop sheet.
- Saved homes, compare, and recently viewed sections render without overflow.
- Property details gallery opens, thumbnails switch correctly, and sticky actions remain reachable.
- Similar listings can be opened without leaving the details flow broken.

## Regression questions

- Did any new component introduce hardcoded `text-white`, `bg-black`, `bg-slate-*`, or `border-gray-*` styles outside intentional media overlays?
- Did any page reintroduce fixed viewport heights that trap scrolling?
- Did any action bar, modal, or bottom nav cover important content on small screens?
