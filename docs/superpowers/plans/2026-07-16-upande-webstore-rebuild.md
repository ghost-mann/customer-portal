# Upande Webstore — Rebuild on `upande_webshop` (corrected) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** A React storefront at `/upande-webstore` that mirrors `upande_webshop`'s existing storefront structure, consumes ONLY `upande_webshop`'s whitelisted APIs (no new backend), and is reskinned to Upande (black/white/gold).

**Architecture:** Keep the `Frontend/webstore` React MPA area, `brand.js` tokens, router/store shells, Nav/Footer, styling, `/upande-webstore` routing + `/website-shop` redirect (all built earlier). REMOVE the new backend (`customer_portal/api/store.py`, `test_store.py`, `customer_portal/setup/seed_webstore_demo.py`) and slim the boot. Rewire all data through `upande_webshop`.

**Tech Stack:** React 18 + Vite, Zustand, `@shared/api` (form-encoded Frappe calls). Backend untouched (`upande_webshop`).

## Global Constraints
- **No new backend.** Frontend calls only `upande_webshop` whitelisted methods (+ Frappe's built-in `frappe.client`/session if strictly needed and guest-permitted). Do NOT recreate `customer_portal/api/store.py`.
- **Mirror `upande_webshop` storefront structure** — pages: shop grid, product detail, cart, wishlist, bouquet, orders. No invented marketing home.
- **Driven by `Webshop Settings`** (embedded in `get_product_filter_data.settings`) + Website Settings toggles.
- Upande black/white/gold via `brand.js` tokens; components read tokens.
- `main` branch; commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Local site `kaitet.local`; a web server already runs on **port 8002** (verify live via `curl http://localhost:8002/...`). Redis on 11002/13002 already running; do NOT run full `bench start` (port clash) — use the running server.

## Confirmed API contract (the interface every task builds against)
Base call helper: `@shared/api`'s `api(method, args)` (form-encoded POST, guest-safe, CSRF-handled).

- **`upande_webshop.upande_webshop.api.get_product_filter_data(query_args)`** (guest) → `{ items:[…], filters:{…}, settings:{<full Webshop Settings doc>}, sub_categories:[…], items_count:int }`. `query_args` is a JSON string/dict with keys like `{ field_filters:{}, attribute_filters:{}, search:"", item_group:"", start:0, from_filters:false }`. Item fields: `web_item_name, name, item_name, item_code, website_image, variant_of, has_variants, item_group, web_long_description, short_description, route, website_warehouse, ranking, on_backorder, stock_qty, in_stock, in_cart, cart_qty, wished`.
- **`…shopping_cart.product_info.get_product_info_for_website(item_code, skip_quotation_creation=True)`** (guest) → `{ product_info:{ price:{formatted_price, formatted_price_sales_uom, price_list_rate, …}|{}, qty, uom, sales_uom, stock_qty, in_stock, on_backorder?, show_stock_qty }, cart_settings }`.
- **`…shopping_cart.cart.*`**: `get_cart_quotation()`, `update_cart(item_code, qty, additional_notes=None, uom=None, custom_length=None, custom_box_type=None, with_items=False, child_docname=None)`, `apply_coupon_code(applied_code, applied_referral_sales_partner)`, `remove_coupon_code()`, `place_order()`, `request_for_quotation()`, `search_delivery_points(txt, limit)`, `update_cart_delivery_point(delivery_point)`, `update_cart_box_type(box_type)`.
- **`…api.get_box_items()`**, **`…api.get_guest_redirect_on_action()`**, **`…api.get_customer_boxes()`** (login).
- **Wishlist / Item Review**: exact whitelisted method paths live on those doctype controllers in `apps/upande_webshop/upande_webshop/upande_webshop/doctype/{wishlist,item_review}/`. **Each relevant task MUST grep that source for `@frappe.whitelist` and use the exact path/params** (do not guess).
- **Settings source:** read from `get_product_filter_data().settings` (no separate settings endpoint needed).

> Implementers: the app source is local at `/home/austin/frappe-v16-bench/apps/upande_webshop` — grep it to confirm exact method paths, params, and return keys before wiring. Verify shapes live with `curl "http://localhost:8002/api/method/<method>?<args>"`.

---

### RT1: Rip out new backend; wire Shop grid to `get_product_filter_data`

**Files:**
- Delete: `customer_portal/api/store.py`, `customer_portal/api/test_store.py`, `customer_portal/setup/seed_webstore_demo.py`, `customer_portal/setup/__init__.py` (and `setup/` dir if empty).
- Modify: `customer_portal/www/upande_webstore.py` (slim boot), `Frontend/webstore/src/lib/api.js`, `Frontend/webstore/src/store.js`, `Frontend/webstore/src/App.jsx`, `Frontend/webstore/src/router.js`.
- Replace: `Frontend/webstore/src/pages/Home.jsx` → `Shop.jsx` (grid landing). Update `ProductCard.jsx` to the `get_product_filter_data` item shape.

**Interfaces produced:**
- `lib/api.js`: `getProductFilterData(queryArgs)`, `getProductInfo(itemCode)`, `updateCart(args)`, `getCart()` (thin wrappers over the confirmed methods).
- `store.js`: `{ settings, items, filters, subCategories, itemsCount, loading, error, bootstrap() }` where `bootstrap()` calls `getProductFilterData({})` and sets `settings`/`items`/etc.
- Router: `/upande-webstore` → `shop` (landing). Keep product/cart/wishlist/bouquet/orders routes (product route param is the Website Item `route`, may contain slashes → use `<path>`-style capture).

- [ ] Step 1: Slim `customer_portal/www/upande_webstore.py` boot to expose only serving glue — no import of the deleted adapter:
```python
import frappe
no_cache = 1
def get_context(context):
	user = frappe.session.user
	is_guest = user == "Guest"
	context.boot = {
		"csrf_token":       frappe.sessions.get_csrf_token(),
		"frappe_user":      None if is_guest else user,
		"frappe_user_full": None if is_guest else (frappe.db.get_value("User", user, "full_name") or user),
		"logged_in":        not is_guest,
	}
	return context
```
- [ ] Step 2: `git rm` the four backend files (store.py, test_store.py, seed_webstore_demo.py, setup/__init__.py).
- [ ] Step 3: Rewrite `lib/api.js` to wrap the confirmed `upande_webshop` methods (getProductFilterData/getProductInfo/updateCart/getCart). `getProductFilterData(queryArgs={})` must pass `query_args` as a JSON string if the method expects that (verify by curl; the method accepts a dict/JSON — match what works).
- [ ] Step 4: Rewrite `store.js` to the new shape; `bootstrap()` loads `getProductFilterData({})`, stores `settings` (the embedded Webshop Settings) + `items` + `filters` + `subCategories` + `itemsCount`.
- [ ] Step 5: Replace Home with `Shop.jsx` — a responsive product grid of `items` using `ProductCard`, header showing `itemsCount`, Upande styling. Update `ProductCard` to the real item fields (`web_item_name`, `website_image`, `item_group`, `route`, `in_stock`, `on_backorder`, `wished`); card links to `/upande-webstore/p/<item.route>`. Price is NOT in the list payload — show item group + an "in stock/backorder" cue; price appears on the detail page (RT3). Respect `settings.hide_price_for_guest`/`show_price` for any price UI.
- [ ] Step 6: Update `router.js` so `/upande-webstore` → `shop`, and add a product route that captures the full Website Item route (`/upande-webstore/p/<path>`), plus cart/wishlist/bouquet/orders. Update `App.jsx` to render `Shop` for the shop route (placeholders for not-yet-built pages).
- [ ] Step 7: Verify: `cd Frontend && yarn build` green (4 areas). `grep -L store.py` — confirm no source imports `customer_portal.api.store`. Live: `curl -s http://localhost:8002/upande-webstore | grep -o 'id="root"'` and `curl -s "http://localhost:8002/api/method/upande_webshop.upande_webshop.api.get_product_filter_data" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['message']['items']))"` returns ≥1. Load `/upande-webstore` and confirm the grid shows the real Website Items.
- [ ] Step 8: Commit: `refactor(webstore): drop new backend; wire Shop grid to upande_webshop.get_product_filter_data`.

---

### RT2: Shop filters, search, categories, pagination

**Files:** `Frontend/webstore/src/pages/Shop.jsx`, new `components/FilterRail.jsx`, `store.js` (filter state + reload), `router.js` (read `?category=`/`?search=` if used).

**Consumes:** RT1 `getProductFilterData(queryArgs)`, `settings.products_per_page`, response `filters` (field + attribute filters incl. farm/product) and `sub_categories`.

- [ ] Build a filter rail from the response `filters` (field filters like item group/brand/farm + attribute filters), a debounced search box, category chips from `sub_categories`, and pagination using `items_count` + `products_per_page` (pass `start`). Each change re-calls `getProductFilterData` with the assembled `query_args` and updates the grid.
- [ ] Gate filters/behaviour on settings (`enable_field_filters`, `enable_attribute_filters`).
- [ ] Verify: build green; live-drive a filter/search/page change via curl on the method with query_args and confirm `items` changes + `items_count`.
- [ ] Commit.

---

### RT3: Product detail (`/upande-webstore/p/<route>`) + variant selector + add-to-cart

**Files:** `pages/Product.jsx`, `components/{Gallery,StemLengthSelector,PriceBlock,QtyStepper}.jsx`, store product slice.

**Consumes:** `get_product_info_for_website(item_code)` (price/stock/qty), item data (from `get_product_filter_data` cache or a per-item fetch by route), `settings.{show_price,hide_price_for_guest,show_stem_length,enable_variants,show_box_type,show_stock_availability}`, `cart.update_cart(item_code, qty, custom_length, custom_box_type)`.

- [ ] Resolve the product by the Website Item `route` (grep app source for how the item generator resolves route→item_code; or filter `get_product_filter_data` items by `route`). Fetch `get_product_info_for_website(item_code)` for price/stock. Render gallery (`website_image`/slideshow), `web_long_description`, specs, price (masked for guest per settings), stock cue, stem-length + box-type selectors (only when the settings toggles + `has_variants`/`enable_variants` say so).
- [ ] Add-to-cart calls `update_cart(item_code, qty, custom_length=<selected>, custom_box_type=<selected>)`; update cart count in store from the response.
- [ ] Verify: build green; live `curl` `get_product_info_for_website` for a seeded item (e.g. `WEBDEMO-ROSE-RED`) shows `product_info.price`/`in_stock`; confirm add-to-cart via `update_cart` returns a cart_count.
- [ ] Commit.

---

### RT4: Cart + checkout

**Files:** `pages/Cart.jsx`, `components/MiniCart.jsx`, store cart slice.

**Consumes:** `cart.get_cart_quotation()`, `update_cart(...)` (qty change/remove via qty 0), `apply_coupon_code`/`remove_coupon_code` (gate on `show_apply_coupon_code_in_website`), `search_delivery_points`/`update_cart_delivery_point`, `place_order`/`request_for_quotation` (gate on `enable_checkout`, `use_sales_order_as_cart`, `save_quotations_as_draft`), `update_cart_box_type` (gate on `show_box_type`). Login required to mutate cart — use the guest redirect (`get_guest_redirect_on_action`) when a guest acts.

- [ ] Cart page lists line items from `get_cart_quotation`, qty steppers, remove, totals, coupon field (if enabled), delivery point picker, and a checkout action that calls the settings-appropriate order method → navigates to `/orders/<name>`.
- [ ] Verify: build green; live-drive add→get_cart_quotation→update qty→place_order (as a logged-in user via an authenticated curl/session, or document the guest-redirect path if login unavailable in-sandbox).
- [ ] Commit.

---

### RT5: Wishlist + Reviews

**Files:** `pages/Wishlist.jsx`, `components/{Reviews,ReviewForm,WishlistButton}.jsx`.

**Consumes:** grep `apps/upande_webshop/.../doctype/wishlist/wishlist.py` and `.../doctype/item_review/item_review.py` for exact `@frappe.whitelist` add/remove/list methods + params (do NOT guess). Item `wished` flag from `get_product_filter_data`. Gate on `settings.enable_wishlist` / `settings.enable_reviews`. Both require login → use guest redirect.

- [ ] Wishlist toggle on cards/detail; `/wishlist` page lists wished items. Reviews list + submit form on product detail (stars + title + comment).
- [ ] Verify: build green; confirm exact method paths from source; live add-to-wishlist as logged-in (or document login-gated path).
- [ ] Commit.

---

### RT6: Bouquet page + Orders/confirmation

**Files:** `pages/Bouquets.jsx`, `pages/Order.jsx`, `components/BouquetComposer.jsx`.

**Consumes:** `settings.show_bouquets_page` + `settings.bouquet_recipes` (Bouquet Recipe Item rows: bouquet, item_group, stem_length, quantity); the existing `www/bouquet` structure for parity. Order view mirrors `templates/pages/order` — read the order (Quotation/Sales Order) the checkout produced.

- [ ] Bouquet composer from `bouquet_recipes` → add composed bouquet to cart. `/orders/<name>` shows the placed order summary. Gate bouquet on `show_bouquets_page`.
- [ ] Verify: build green; live shape check for bouquet_recipes in settings; order view renders a placed order.
- [ ] Commit.

---

### RT7: Nav/Footer reskin + live counts + responsive polish

**Files:** `components/{Nav,Footer}.jsx`, `styles.css`, empty/error/loading states.

- [ ] Nav links mirror the structure (Shop, Bouquet, Wishlist, Cart with live count from store; account/login via guest redirect; orders when logged in). Footer stays Upande. Responsive pass; empty/error/loading for every data surface; a11y (`aria-hidden` on icon spans; accessible cart label). Tokenize any remaining `rgba()` literals so per-farm `brand.js` reskin holds (add `--ink-rgb`/`--paper-rgb` or use color-mix).
- [ ] Verify: build green; load each route live; responsive check.
- [ ] Commit.

---

## Verification (whole)
- `yarn build` green; `/upande-webstore` serves the real `upande_webshop` catalogue; product detail prices via `get_product_info_for_website`; cart/wishlist/bouquet/orders mirror `upande_webshop` and are driven by `Webshop Settings`.
- No `customer_portal/api/store.py`; no new backend modules; all data via `upande_webshop`.
- `/website-shop` still redirects to `/upande-webstore`.
