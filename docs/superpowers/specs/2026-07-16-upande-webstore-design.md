# Upande Webstore — Design Spec

**Date:** 2026-07-16
**Status:** Approved for planning — **REVISED (see Revision R1 below)**
**Author:** james@upande.com (with Claude)

## Revision R1 (2026-07-16) — no new backend; consume `upande_webshop` directly

Direction correction from the user: **do not add any backend.** `upande_webshop`
is the backend as-is. Build **only the React frontend**, which:
- **Consumes `upande_webshop`'s own whitelisted APIs directly** — never a new
  `customer_portal/api/store.py` (that adapter, its test, and the demo seeder are
  removed). Endpoints:
  - Catalog + filters + **embedded `Webshop Settings`** + sub-categories + count →
    `upande_webshop.upande_webshop.api.get_product_filter_data(query_args)`
    (guest-OK). Item fields returned: `web_item_name, name, item_name, item_code,
    website_image, variant_of, has_variants, item_group, web_long_description,
    short_description, route, website_warehouse, ranking, on_backorder, stock_qty,
    in_stock, in_cart, cart_qty, wished`.
  - Product price/stock/qty → `…shopping_cart.product_info.get_product_info_for_website(item_code)`
    → `{product_info:{price:{formatted_price,…}, qty, uom, stock_qty, in_stock,
    on_backorder, show_stock_qty}, cart_settings}`.
  - Cart/checkout → `…shopping_cart.cart.*` (`get_cart_quotation`,
    `update_cart(item_code, qty, …, custom_length, custom_box_type)`,
    `apply_coupon_code`, `place_order`, `request_for_quotation`,
    `search_delivery_points`, `update_cart_box_type`, …).
    Cart doctype = Quotation (or Sales Order per settings) — **server-managed**, so
    §7's client-side-localStorage cart is superseded: use the server cart directly.
  - Wishlist/reviews/box → the relevant `upande_webshop` whitelisted methods
    (`api.get_box_items`, `api.get_guest_redirect_on_action`, Wishlist/Item Review
    controller methods).
- **Mirrors `upande_webshop`'s existing storefront structure** (do not invent a
  marketing home): shop grid (`/upande-webstore` ← `get_product_filter_data`),
  product detail (`/upande-webstore/p/<website-item-route>`), `/cart`, `/wishlist`,
  `/bouquet`, `/orders/<name>` — matching upande_webshop's `www/webshop`,
  `templates/generators/item`, `templates/pages/{cart,wishlist,order}`,
  `www/bouquet`.
- **Driven by `Webshop Settings` (embedded in `get_product_filter_data`) + Website
  Settings** for toggles (`show_price`, `hide_price_for_guest`, `show_stem_length`,
  `enable_variants`, `show_box_type`, `enable_wishlist`, `enable_reviews`,
  `enable_checkout`, `show_bouquets_page`, `products_per_page`, `login_required_to_view_products`, …).
- Delivered as: **React SPA in `customer_portal` at `/upande-webstore`**, Upande
  black/white/gold, single-source `brand.js` for per-farm branches.

Sections 5.2/5.3 (new API module), 6 (direct-doctype mapping), and 7 (client cart)
below are **superseded by this revision** where they conflict. Everything about
routing/area/branding/visual identity still holds. New plan:
`docs/superpowers/plans/2026-07-16-upande-webstore-rebuild.md`.

## 1. Overview

Build a full, public-facing consumer flower storefront — **Upande Webstore** — served
at `/upande-webstore`. It replaces the existing login-gated B2B shop at
`/website-shop`. It is a complete e-commerce experience: home, catalog, product
detail, cart, wishlist, reviews, build-a-bouquet, and checkout.

The store is backed by the **`upande_webshop`** Frappe app
(https://github.com/WilfredTinega/Upande-Webshop), which is already installed on
the live farm sites (e.g. Mona Flowers) but not yet in this local bench. It is a
flower-specific fork of ERPNext's webshop: prices are keyed **per stem length**,
plus wishlist, reviews, offers, recommended items, featured products, box types,
and bouquet recipes.

### Goals
- A gorgeous, imagery-forward public storefront that reads as a high-end florist,
  not a utilitarian B2B tool.
- Guests can browse and build a cart without logging in; login is required only
  at checkout (and for wishlist/reviews).
- Wire to the **real** `upande_webshop` doctypes — no permanent mock data.
- **Multi-tenant by design:** one codebase, re-skinnable per farm with a minimal
  diff, delivered via git branches (see §2).

### Non-goals (this project)
- Rebuilding the retired B2B reorder-profile / staff-impersonation flow (the old
  shop is retired; if B2B reordering is needed later it is a separate project).
- Payment-gateway hardening beyond wiring the existing `Payment Gateway Account`
  configured in `Webshop Settings`.
- Floriday / Biflorica marketplace sync (those integrations stay dormant).

## 2. Multi-farm strategy & branding architecture

The store will serve multiple farms. The mechanism:

- **`main` is the master branch** = the canonical **Upande**-branded baseline. All
  shared feature work lands here first.
- **Per-farm branches** (e.g. `farm/mona-flowers`, `farm/timaflor`) branch off
  `main` and carry *only* branding/config divergence. Farm branches periodically
  merge `main` to pick up feature work.
- For now we build **only `main`** with the Upande master brand. Farm branches are
  created later and are out of scope for this project.

To keep a farm branch's diff tiny, **all brand-specific values live in one place**:

- `Frontend/webstore/src/brand.js` — a single config object:
  ```
  export const brand = {
    name: 'Upande',
    tagline: '…',
    logo: '…',            // asset path / inline mark
    palette: { … },       // overrides for the CSS tokens in §3
    hero: { … },          // default hero imagery / copy fallbacks
    favicon: '…',
    social: { … },
  }
  ```
- Brand colours are applied by writing the `palette` values onto CSS custom
  properties at boot (a small `applyBrand()` in `main.jsx`), so components never
  hard-code a colour — they read tokens. A farm branch edits `brand.js` (+ swaps
  a few image assets) and nothing else.
- Server-side brand defaults (site title, contact) come from the farm's own
  Frappe site settings where available, so a branch rarely needs backend changes.

## 3. Visual identity — Upande master (black / white / gold)

Direction: **florist-editorial**. Full-page scroll, generous whitespace, large
botanical photography, subtle motion. Distinct from the dense B2B tool.

**Palette (master / Upande):**
- Ink / black: near-black text `#0f0f0f`, true black `#000` for strong marks.
- White / paper: `#ffffff` surfaces on a warm paper `#faf9f6` background.
- **Gold accent:** a refined metallic gold (`~#c8a24c`) for CTAs, active states,
  price highlights, badges, and hairline flourishes. Gold is the *only* saturated
  colour; everything else is monochrome.
- Neutrals: warm greys for borders/secondary text; botanical green reserved
  narrowly for "in season" / freshness cues.
- These are defined as CSS tokens (extending `@shared/theme.css`) and are the
  values a farm branch overrides via `brand.js`.

**Type:**
- Keep **Poppins** for UI and body (already loaded, on-brand).
- Introduce a **display serif** (Fraunces / Playfair-family) for hero and section
  headings — the primary "florist" signal. Loaded via the same Google Fonts
  pattern the area already uses.

**Motion & signature touches:**
- Sticky translucent (glass) nav; fade/rise reveal on scroll; image hover-zoom on
  product cards.
- Stem-length pricing as an elegant pill selector that re-prices live.
- "In season" / stock / offer badges in gold + mono microtype.
- Fully **responsive** (the B2B tool was fixed-viewport; this is not).

The **frontend-design skill will be invoked at implementation time** to execute
this direction; this spec sets the intent only.

## 4. Architecture & routing

- Rename `Frontend/webshop` → **`Frontend/webstore`**. Update `vite.config.js`
  `AREAS`, `scripts/build-html.mjs` `ROUTES`, and add the build entry.
- Build emits `customer_portal/www/upande-webstore.html`; primary route
  **`/upande-webstore`**.
- **Client-routed SPA** (mirroring the `site` area's `router.js`). Internal paths
  resolve to the one template via `website_route_rules` in `hooks.py`:
  - `/upande-webstore` — Home
  - `/upande-webstore/shop` — Catalog
  - `/upande-webstore/product/<route>` — Product detail
  - `/upande-webstore/cart` — Cart
  - `/upande-webstore/wishlist` — Wishlist
  - `/upande-webstore/bouquets` — Build-a-bouquet
  - `/upande-webstore/checkout` — Checkout
  - `/upande-webstore/order/<name>` — Confirmation
- **Retire `/website-shop`:** delete the old B2B SPA source and
  `www/website-shop.*`; add a `website_route_rules` redirect
  `/website-shop → /upande-webstore` so old links survive.
- New boot `www/upande-webstore.py`: **guest-allowed** (no login throw). Boot
  exposes `csrf_token`, `frappe_user`, `logged_in`, and the `Webshop Settings`
  toggles the SPA needs at first paint.

## 5. Backend

### 5.1 Install the app locally
- `bench get-app` the `upande_webshop` repo into this bench, then
  `bench --site <site> install-app upande_webshop`, then `bench migrate`.
- Handle the `override_doctype` overrides (Item, Item Group, Item Price, Payment
  Request) and confirm no clash with ERPNext. Floriday/Biflorica integrations
  remain dormant (no credentials configured).
- If installation conflicts with ERPNext's own webshop, **stop and report**
  before forcing — do not risk the bench.

### 5.2 New public API module — `customer_portal/api/store.py`
All methods `@frappe.whitelist(allow_guest=True)` where browsing-safe; mutating
customer data (wishlist, reviews, checkout) requires login. The old
`customer_portal/api/webshop.py` is deleted with the B2B shop.

Catalog & merchandising:
- `get_settings()` → normalized toggles (guest pricing, reviews, wishlist,
  recommendations, show_stem_length, show_box_type, bouquets, products_per_page,
  show_stock_availability, hide_price_for_guest).
- `get_home()` → slideshow, `Homepage Featured Product`, active `Website Offer`s,
  top categories, new arrivals.
- `list_products(category, stem_length, box_type, brand, search, in_stock, sort, start, page_length)`
  → paginated `Website Item`s (published only), with resolved price range + primary image.
- `get_product(route|name)` → `Website Item` + `stem_length_prices` options
  (per-stem rate + stock) + specifications + tabs + recommended items + offers +
  review summary (avg + count) + gallery.
- Facets: `list_categories()`, `list_stem_lengths()`, `list_box_types()`,
  `list_brands()`.

Customer features (login required):
- Reviews: `list_reviews(website_item)`, `submit_review(website_item, rating, title, comment)`.
- Wishlist: `get_wishlist()`, `toggle_wishlist(item_code)`.

Cart & checkout:
- `get_cart()`, `add_to_cart(item_code, stem_length, qty, box_type)`,
  `update_qty(...)`, `remove_item(...)`, `apply_coupon(code)`, `clear_cart()`.
- `list_delivery_points()`, `place_order(delivery_point, notes, …)` →
  Quotation or Sales Order per `Webshop Settings` (`enable_checkout`,
  `use_sales_order_as_cart`, `save_quotations_as_draft`) → returns confirmation.

### 5.3 Pricing model
Every price and per-length stock figure comes from
`Webshop Item Prices.stem_length_prices` (fields: `stem_length`, `rate`,
`stock_qty`). The product page renders a stem-length selector; selecting a length
sets price and available stock. Respect `hide_price_for_guest` (mask price + swap
CTA to "Sign in to see price" when set and the user is a guest).

## 6. Data model mapping (`upande_webshop` → frontend)

| Frontend concept        | Source doctype(s)                                            |
|-------------------------|--------------------------------------------------------------|
| Product card / detail   | `Website Item` (+ linked `Item`)                             |
| Price & per-length stock| `Webshop Item Prices` → `stem_length_prices`                 |
| Stem-length options     | `Website Item.custom_length` / stem_length_prices rows / `Stem Length` |
| Box types               | `Website Item.custom_box_type` / `Box Type`                  |
| Category                | `Item Group` (+ `Website Item Group`)                        |
| Brand facet             | `Brand`                                                      |
| Gallery / hero          | `website_image`, `slideshow` (`Website Slideshow`)           |
| Specs / info tabs       | `website_specifications`, `tabs` (`Website Item Tabbed Section`) |
| Recommended / similar   | `recommended_items` (`Recommended Items`)                    |
| Offers / badges         | `offers` (`Website Offer`)                                   |
| Home featured           | `Homepage Featured Product`                                  |
| Wishlist                | `Wishlist` + `Wishlist Item` (per `User`)                    |
| Reviews & ratings       | `Item Review` (rating, review_title, comment)                |
| Bouquet builder         | `Webshop Settings.bouquet_recipes` (`Bouquet Recipe Item`)   |
| Cart / order            | `Quotation` / `Sales Order` (per settings)                   |
| Delivery                | `Delivery Point`                                             |
| Global config           | `Webshop Settings` (single)                                  |

## 7. Guest cart & auth

- Guests browse and add to cart freely. The cart is held **client-side
  (localStorage)** — line items keyed by `item_code` + `stem_length` (+ box type).
- At **checkout**, login is required. On login the client cart is **materialized
  server-side** into a Quotation/Sales Order via `place_order`. `Webshop
  Settings.redirect_on_action` is honored at this commit point.
- Wishlist and review submission require login inline (prompt → return).
- `logged_in` from boot drives conditional UI (account menu, wishlist state,
  price masking when `hide_price_for_guest`).

## 8. Frontend structure

```
Frontend/webstore/
  index.html
  src/
    main.jsx           imports @shared/theme.css → webstore styles; applyBrand()
    brand.js           single-source brand config (§2)
    router.js          pathname → page component
    store.js           zustand: catalog / product / cart / wishlist / ui slices
    styles.css         Upande master tokens + storefront styles
    pages/
      Home.jsx  Shop.jsx  Product.jsx  Cart.jsx  Wishlist.jsx
      Bouquets.jsx  Checkout.jsx  Confirmation.jsx
    components/
      Nav.jsx  Footer.jsx  ProductCard.jsx  FilterRail.jsx
      StemLengthSelector.jsx  PriceBlock.jsx  Gallery.jsx
      Reviews.jsx  ReviewForm.jsx  OfferBadge.jsx  MiniCart.jsx
      HeroCarousel.jsx  FeaturedGrid.jsx  CategoryTiles.jsx
      BouquetComposer.jsx  Toast.jsx  Empty.jsx
```
Reuses `@shared/api`, `@shared/Icon`, `@shared/utils`. Adds a small auth helper
around `logged_in` + login redirect.

## 9. Feature detail per page

- **Home:** hero carousel (slideshow), featured products grid, live offers strip,
  category tiles, new-arrivals rail, brand story band, footer.
- **Shop (Catalog):** filter rail (category, stem length, box type, brand,
  in-stock) + search + sort; responsive product grid with pagination
  (`products_per_page`); quick add-to-cart and wishlist toggle on cards.
- **Product:** gallery (image + slideshow), stem-length pill selector re-pricing
  live, per-length stock indicator, qty stepper, add-to-cart, wishlist, offers,
  spec table, info tabs, recommended-items rail, reviews (list + submit).
- **Cart:** line items (image, name, length, box, qty stepper, line total),
  coupon field, subtotal, proceed-to-checkout.
- **Wishlist:** saved items grid, move-to-cart, remove (login required).
- **Bouquets:** compose from `bouquet_recipes` (pick recipe → fills lengths/qty
  by item group), preview + price, add to cart.
- **Checkout:** login gate → delivery point selection, order notes, review,
  place order → **Confirmation** (order number, summary, next steps).
- **Empty/error/loading states** for every data surface.

## 10. Build order (all in scope; shipped in verifiable slices)

1. **Foundations** — install `upande_webshop`; scaffold `webstore` area
   (rename, vite/build/hooks wiring, boot); `brand.js` + `applyBrand()`; Upande
   master tokens + display serif; Nav/Footer; `get_settings` + `get_home`; Home
   page; retire/redirect `/website-shop`.
2. **Shop** — facets + `list_products`; Catalog with filters/sort/pagination;
   ProductCard.
3. **Product** — `get_product`; stem-length pricing; gallery; specs/tabs;
   recommended.
4. **Cart** — client cart + coupon; MiniCart; Cart page.
5. **Wishlist + Reviews.**
6. **Bouquet builder.**
7. **Checkout + confirmation** — delivery points, order placement, login gate.
8. **Polish** — responsive pass, empty/error states, accessibility, verify
   against real farm data.

## 11. Risks & open questions

- **App install conflict:** `upande_webshop` overrides core doctypes and may
  clash with ERPNext's webshop in this bench. Mitigation: install in isolation,
  migrate, verify; stop and report if it destabilizes the bench.
- **Local data sparsity:** the local bench won't have the farms' real
  `Website Item` / pricing rows. We may seed a small set of published flower items
  + `Webshop Item Prices` for local verification, and confirm shape against the
  live Mona Flowers site via MCP.
- **Cart doctype choice** (Quotation vs Sales Order) is driven by live
  `Webshop Settings`; the API must read those toggles rather than hard-code.
- **Coupon/payment**: scope is wiring existing config, not building new gateways.

## 12. Verification

- Build passes (`yarn build`) and emits `www/upande-webstore.html` + assets.
- Each slice is exercised end-to-end in the running app (browse → filter →
  product → cart → checkout) per the project `verify` approach, against real
  `upande_webshop` data (seeded locally + shape-confirmed on live).
- Old `/website-shop` redirects to `/upande-webstore`.
