# DigitalShop Brand Asset Kit

Brand assets are based on the two red-marked concepts in the supplied reference:
1. The gradient D + shopping-cart app icon.
2. The gradient shopping-bag D + DigitalShop horizontal logo.

## Brand colors
- Deep navy: `#080E20`
- Navy surface: `#111A36`
- Electric purple: `#7B2FF7`
- Blue: `#3677FF`
- Cyan: `#10D7EF`
- White: `#FFFFFF`

## Main files
- `01-logos/digitalshop-logo-dark.png` — use on dark website/admin backgrounds.
- `01-logos/digitalshop-logo-light.png` — use on light backgrounds.
- `02-app-icons/digitalshop-app-icon-cart-light.png` — recommended Android launcher icon.
- `02-app-icons/digitalshop-app-icon-brand-tile.png` — icon tile with the DigitalShop wordmark.
- `02-app-icons/digitalshop-app-icon-bag-light.png` — alternate icon based on the selected bag mark.
- `03-web/favicon.ico` — browser favicon.
- `03-web/site.webmanifest` — PWA manifest.
- `04-android/res/` — Android launcher icon density files and adaptive icon XML.

## Android integration
Copy the contents of `04-android/res/` into your Android project's `app/src/main/res/` folder.
The adaptive icon XML expects `@drawable/ic_launcher_foreground` and `@color/ic_launcher_background`.

## Web integration
Copy the contents of `03-web/` into your web app's public assets folder. Add:
`<link rel="icon" href="/favicon.ico">`
`<link rel="manifest" href="/site.webmanifest">`

## Notes
SVG files are included for scalable editing. PNG logos have transparent backgrounds where appropriate.
The generated wordmark uses a bold italic sans-serif style; adjust font rendering if your project uses a custom brand font.
