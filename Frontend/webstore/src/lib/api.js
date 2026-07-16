// Thin wrappers over upande_webshop's own whitelisted API. No new backend —
// every call here targets a method that already lives in the upande_webshop
// app (grepped/curl-verified against apps/upande_webshop).
import { api } from '@shared/api';

// get_product_filter_data(query_args) expects query_args as a JSON string
// (it does `json.loads` when given a str). @shared/api's `api()` form-encodes
// each arg with String(value), so we must stringify the object ourselves.
//
// -> { items, filters, settings (full Webshop Settings doc), sub_categories, items_count }
export const getProductFilterData = (queryArgs = {}) =>
  api('upande_webshop.upande_webshop.api.get_product_filter_data', {
    query_args: JSON.stringify(queryArgs),
  });

// -> { product_info: { price, qty, uom, sales_uom, stock_qty, in_stock, on_backorder?, show_stock_qty }, cart_settings }
export const getProductInfo = (itemCode) =>
  api('upande_webshop.upande_webshop.shopping_cart.product_info.get_product_info_for_website', {
    item_code: itemCode,
    skip_quotation_creation: true,
  });

// -> { doc: <decorated Quotation|Sales Order>, shipping_addresses, billing_addresses,
//      shipping_rules, cart_settings }. NOT allow_guest (confirmed via grep) — 403s
// for a guest session. Cart.jsx never calls this for a guest (see its early return).
export const getCart = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.get_cart_quotation');

// NOT allow_guest — 403s for a guest session (confirmed live). Guests must go
// through stashPendingCart() + a login redirect instead (see Product.jsx).
export const updateCart = (args = {}) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart', args);

// ---- Cart mutations below — all `@frappe.whitelist()` (login-required)
// except apply_coupon_code/remove_coupon_code (allow_guest=True, confirmed by
// grep), wired here only for a logged-in cart (see Cart.jsx's guest gate).

// -> the (undecorated) cart doc. Confirmed allow_guest=True in cart.py.
export const applyCouponCode = (appliedCode, appliedReferralSalesPartner) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.apply_coupon_code', {
    applied_code: appliedCode,
    applied_referral_sales_partner: appliedReferralSalesPartner || '',
  });

export const removeCouponCode = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.remove_coupon_code');

// Guest-safe Link-style search (ignores permissions server-side) -> [{value, label, description}]
export const searchDeliveryPoints = (txt, limit = 20) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.search_delivery_points', {
    txt: txt || '', limit,
  });

// -> { name, delivery_point }
export const updateCartDeliveryPoint = (deliveryPoint) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart_delivery_point', {
    delivery_point: deliveryPoint || '',
  });

// Consignee mirrors Delivery Point (search_consignees/update_cart_consignee).
// Not in the RT4 plan's literal method list, but wired in addition: on this
// site `custom_consignee` exists on the cart doctype and
// `_check_required_cart_fields` requires it unconditionally whenever the field
// exists (it does NOT gate on the `show_consignee` display setting) — so
// checkout cannot succeed without this, confirmed by reading cart.py directly.
export const searchConsignees = (txt, limit = 20) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.search_consignees', {
    txt: txt || '', limit,
  });

// -> { name, consignee }
export const updateCartConsignee = (consignee) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart_consignee', {
    consignee: consignee || '',
  });

// Cart-level Line Code. Also not in the RT4 plan's literal list, wired for the
// same reason as Consignee: `_check_required_cart_fields` requires it whenever
// `show_cart_line_code` (default on) is truthy AND the field exists — true on
// this site. -> { name, line_code }
export const updateCartLineCode = (lineCode) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart_line_code', {
    line_code: lineCode || '',
  });

// Cart-level Box Type (distinct from Product.jsx's per-line custom_box_type —
// this overwrites every line's box type at once). Returns rendered HTML
// fragments (server template partials) which this SPA does not consume;
// Cart.jsx re-fetches getCart() after calling this instead.
export const updateCartBoxType = (boxType) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart_box_type', {
    box_type: boxType || '',
  });

// Cart-level Box Type source. `update_cart_box_type` validates against the
// `Box Type` doctype (frappe.db.exists("Box Type", box_type)) — a different
// doctype from the Item codes `getBoxItems` (api.get_box_items) returns — so
// this cart-wide select must be sourced from the purpose-built storefront
// search instead (search_box_types, cart.py ~line 2790: guest-safe, bypasses
// permissions, returns name + packrate). -> [{value, label, description, packrate}]
export const searchBoxTypes = (txt, limit = 20) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.search_box_types', {
    txt: txt || '', limit,
  });

// -> Sales Order/Quotation `name` on success, or { error: message } (not
// thrown) when a required cart field is missing or a box-type minimum isn't
// met — confirmed by reading place_order()/request_for_quotation() in cart.py.
export const placeOrder = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.place_order');

export const requestForQuotation = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.request_for_quotation');

// Step 2 of the "Use Sales Order as Cart" two-step checkout (Save Order →
// Submit Order): submits the draft Sales Order cart that request_for_quotation
// left in draft.
export const submitCartOrder = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.submit_cart_order');

// Resolve a single Website Item by its route (product-detail param). There is
// no dedicated "get item by route" whitelisted method, but `route` is a plain
// Website Item field, so ProductQuery's field_filters (`build_fields_filters`
// -> exact `=` match) resolves it in one call — confirmed live via curl
// (field_filters:{route:"..."} -> items_count:1, the matching item only).
export const getProductByRoute = async (route) => {
  const data = await getProductFilterData({ field_filters: { route } });
  return (data.items && data.items[0]) || null;
};

// -> [{attribute, optional?, values:[...]}] for a has_variants template item.
// Guest-safe (variant_selector/utils.py, allow_guest=True).
export const getAttributesAndValues = (itemCode) =>
  api('upande_webshop.upande_webshop.variant_selector.utils.get_attributes_and_values', {
    item_code: itemCode,
  });

// Resolves the concrete variant item_code once enough attributes are picked.
// `selected_attributes` is parsed server-side with frappe.parse_json, so it
// accepts a JSON string same as get_product_filter_data's query_args.
// -> { next_attribute, valid_options_for_attributes, filtered_items_count,
//      filtered_items, exact_match, product_info, available_qty }
export const getNextAttributeAndValues = (itemCode, selectedAttributes) =>
  api('upande_webshop.upande_webshop.variant_selector.utils.get_next_attribute_and_values', {
    item_code: itemCode,
    selected_attributes: JSON.stringify(selectedAttributes || {}),
  });

// Box Type dropdown source for guests — the richer box_type.box_type.get_box_types
// (pack rate / bunch size / MOQ helpers) all require login, so guests only get
// the plain name list here (api.py, allow_guest=True). -> [{name, item_name}]
export const getBoxItems = () =>
  api('upande_webshop.upande_webshop.api.get_box_items');

// Where to send a guest who needs to log in to act (add to cart, wishlist,
// etc). Falls back to plain /login when Webshop Settings has no override
// configured (confirmed live: returns "" on this site).
export const getGuestRedirectOnAction = () =>
  api('upande_webshop.upande_webshop.api.get_guest_redirect_on_action');

// Guest add-to-cart: stash entries server-side (cookie-keyed), replayed into
// the real cart via update_cart once the guest logs in
// (shopping_cart/pending_cart.py). allow_guest=True — confirmed live (200,
// sets the webshop_pending_cart cookie).
export const stashPendingCart = (entries) =>
  api('upande_webshop.upande_webshop.shopping_cart.pending_cart.stash', {
    entries: JSON.stringify(entries || []),
  });

// ---- Wishlist (RT5) — confirmed by reading
// apps/upande_webshop/upande_webshop/upande_webshop/doctype/wishlist/wishlist.py.
// Both are `@frappe.whitelist()` with NO allow_guest=True, so both are
// login-required (confirmed live: guest POST -> 403 PermissionError "Function
// ...add_to_wishlist is not whitelisted" — frappe's guest-vs-whitelisted
// check, not a missing decorator). -> { wish_count }
export const addToWishlist = (itemCode) =>
  api('upande_webshop.upande_webshop.doctype.wishlist.wishlist.add_to_wishlist', {
    item_code: itemCode,
  });

export const removeFromWishlist = (itemCode) =>
  api('upande_webshop.upande_webshop.doctype.wishlist.wishlist.remove_from_wishlist', {
    item_code: itemCode,
  });

// There is no dedicated whitelisted "list my wishlist" method — the only
// reader (templates/pages/wishlist.py's get_wishlist_items()) is a plain
// Python function feeding Jinja page context, never `@frappe.whitelist()`'d,
// so it isn't reachable over the JSON API. get_product_filter_data already
// annotates every returned item with `wished` for the current session
// (product_data_engine/query.py: `item.wished = item.item_code in
// wished_codes`), so the wishlist page instead re-walks that endpoint page by
// page (using the site's own products_per_page — get_product_filter_data has
// no page-length override) and keeps only the wished items. Capped at 50
// pages so a very large catalogue can't spin forever.
export const getWishlistItems = async () => {
  const wished = [];
  let start = 0;
  for (let page = 0; page < 50; page++) {
    const data = await getProductFilterData({ start, from_filters: false });
    const items = data.items || [];
    for (const item of items) if (item.wished) wished.push(item);
    const count = data.items_count || 0;
    start += items.length;
    if (items.length === 0 || start >= count) break;
  }
  return wished;
};

// ---- Item Review (RT5) — confirmed by reading
// apps/upande_webshop/upande_webshop/upande_webshop/doctype/item_review/item_review.py.
// get_item_reviews has NO allow_guest=True (confirmed live: guest GET -> same
// 403 "not whitelisted" shape as wishlist above) despite the Jinja
// customer_reviews.html page rendering reviews for guests — that page calls
// get_item_reviews() as a plain Python import inside get_context(),
// bypassing the whitelist/guest gate entirely; the JSON API path has no such
// back door. So reviews are only readable through this API for a logged-in
// session — the Reviews section below gates on window.logged_in in addition
// to settings.enable_reviews.
// `web_item` is the Website Item *name* (docname), not item_code — confirmed
// by reading add_item_review's `"item": frappe.db.get_value("Website Item",
// web_item, "item_code")` line; pass product.name from get_product_filter_data.
// -> { reviews:[{name, user, review_title, rating (0-1 fraction), comment,
//      published_on, ...}], average_rating (0-5), average_whole_rating,
//      reviews_per_rating:[pct*5], total_reviews }
export const getItemReviews = (webItem, start = 0, end = 10) =>
  api('upande_webshop.upande_webshop.doctype.item_review.item_review.get_item_reviews', {
    web_item: webItem,
    start,
    end,
  });

// add_item_review is `@frappe.whitelist()` (also no allow_guest=True) and
// additionally throws its own UnverifiedReviewer error if
// frappe.session.user === "Guest" as defense-in-depth — either gate stops a
// guest. `rating` here is the 0-1 fraction the doctype stores (a 5-star pick
// -> 1.0, confirmed live: rating=1 round-tripped as average_rating=5.0).
// No return value on success (bench-execute confirmed live: empty response).
export const addItemReview = (webItem, title, rating, comment) =>
  api('upande_webshop.upande_webshop.doctype.item_review.item_review.add_item_review', {
    web_item: webItem,
    title,
    rating,
    comment: comment || '',
  });
