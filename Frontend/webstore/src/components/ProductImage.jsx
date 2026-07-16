import { useState } from 'react';

// Renders a product image, falling back to the given placeholder node both when
// there's no src AND when the image fails to load (404/500 — e.g. a Website Item
// whose file isn't present on this instance). Without the onError fallback a
// broken URL shows the browser's broken-image glyph; this keeps the tile clean.
export default function ProductImage({ src, alt, className, placeholder }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return placeholder;
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
