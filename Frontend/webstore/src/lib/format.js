// Shared money formatter — was duplicated verbatim in Cart.jsx and Order.jsx
// (RT4/RT6); extracted here in RT7 so there is one definition to maintain.
export function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  if (!currency) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch (e) {
    return `${currency} ${n.toFixed(2)}`;
  }
}
