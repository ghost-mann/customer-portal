import { useEffect, useState } from 'react';
import { getAttributesAndValues, getNextAttributeAndValues } from '../lib/api';

// Attribute-driven variant picker for `has_variants` items (Stem Length, and
// any other Item Attribute the template defines). Two guest-safe endpoints do
// all the work (variant_selector/utils.py, both allow_guest=True):
//   - get_attributes_and_values: which attributes + which values exist
//   - get_next_attribute_and_values: given a partial selection, does it
//     resolve to exactly one concrete variant item_code?
// That resolved item_code is what the caller must price (get_product_info_for_website)
// and add to cart with — the plain-item `custom_length` field plays no part
// here; the variant item_code itself encodes length (mirrors item_configure.js's
// own reasoning: "Stem Length" is a Link, "80cm" is not a valid variant name).
export default function StemLengthSelector({ templateItemCode, onResolvedChange }) {
  const [attributes, setAttributes] = useState(null); // null = loading
  const [selected, setSelected] = useState({});
  const [resolving, setResolving] = useState(false);
  const [matchCount, setMatchCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setAttributes(null);
    setSelected({});
    setMatchCount(null);
    onResolvedChange(null);
    getAttributesAndValues(templateItemCode)
      .then((attrs) => { if (!cancelled) setAttributes(attrs || []); })
      .catch(() => { if (!cancelled) setAttributes([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateItemCode]);

  useEffect(() => {
    if (!attributes) return; // still loading attribute list
    if (Object.keys(selected).length === 0) {
      setMatchCount(null);
      onResolvedChange(null);
      return;
    }
    const requiredCount = attributes.filter((a) => !a.optional).length;
    if (Object.keys(selected).length < requiredCount) {
      onResolvedChange(null);
      return;
    }
    let cancelled = false;
    setResolving(true);
    getNextAttributeAndValues(templateItemCode, selected)
      .then((data) => {
        if (cancelled) return;
        const exact = data.exact_match || [];
        setMatchCount(data.filtered_items_count ?? exact.length);
        onResolvedChange(exact.length === 1 ? exact[0] : null);
      })
      .catch(() => {
        if (cancelled) return;
        setMatchCount(null);
        onResolvedChange(null);
      })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, attributes, templateItemCode]);

  if (attributes === null) {
    return <div className="ws-pd-variants-status">Loading options…</div>;
  }
  if (!attributes.length) {
    return <div className="ws-pd-variants-status">No variant options available for this item.</div>;
  }

  return (
    <div className="ws-pd-variants">
      {attributes.map((attr) => (
        <div className="ws-pd-attr-group" key={attr.attribute}>
          <span className="ws-rail-title">
            {attr.attribute}
            {attr.optional ? ' (optional)' : ''}
          </span>
          <div className="ws-chips">
            {(attr.values || []).map((v) => (
              <button
                key={v}
                type="button"
                className={`ws-chip${selected[attr.attribute] === v ? ' ws-chip-active' : ''}`}
                onClick={() => setSelected((s) => ({ ...s, [attr.attribute]: v }))}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      {resolving && <div className="ws-pd-variants-status">Checking availability…</div>}
      {!resolving && matchCount != null && matchCount !== 1 && (
        <div className="ws-pd-variants-status">
          {matchCount} option{matchCount === 1 ? '' : 's'} match — pick a value for every attribute above.
        </div>
      )}
    </div>
  );
}
