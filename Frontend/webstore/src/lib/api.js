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

export const updateCart = (args = {}) =>
  api('upande_webshop.upande_webshop.shopping_cart.cart.update_cart', args);
