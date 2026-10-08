# Card effect sources

Primary styles imported from:

- https://github.com/simeydotme/pokemon-cards-css  (GPL-3.0)
  Demo: https://poke-holo.simey.me/
  Rarity stylesheets live in `public/css/cards/` (regular, reverse, cosmos, rainbow, secret, V, trainer gallery).
- Companion tilt component: https://github.com/simeydotme/hover-tilt  (MPL-2.0)
  npm: `hover-tilt`  Demo: https://hover-tilt.simey.me/
- 151 variant: https://github.com/simeydotme/pokemon-cards-151

Additional reference, not vendored:

- https://github.com/kongyo2/cards-css  (MIT)
  Framework-agnostic foils: holo, reverse, cosmos, glitter, aurora, rainbow, gold, prism, radiant, crystal, metal, oilslick, sunburst, mosaic.
  Demo: https://kongyo2.github.io/cards-css/

`foil-grades.css` is original CardPlayground CSS. It maps Japanese SV / M6a grades
(C, U, R, RR, AR, SR, SAR, UR) onto distinct idle borders and shines so the pack
grid stays readable without a hover. It does not copy either upstream stylesheet.

We do not vendor the Svelte app. Upstream CSS is loaded from jsDelivr pointing at
`public/css/cards`. Existing `card-effects.css` / `card-tilt.ts` stay as the local port.
