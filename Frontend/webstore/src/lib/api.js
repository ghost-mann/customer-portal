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

export const getCart = () =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.get_cart_quotation');

// NOT allow_guest — 403s for a guest session (confirmed live). Guests must go
// through stashPendingCart() + a login redirect instead (see Product.jsx).
export const updateCart = (args = {}) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart', args);

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
