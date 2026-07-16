import ProductImage from './ProductImage';

// Product-detail image. Website Item's `slideshow` field (a Website
// Slideshow doc, rendered server-side by templates/generators/item/item_image.html)
// isn't exposed by any guest-safe whitelisted method, and Website Item itself
// has no Guest read permission (confirmed: doctype permissions list only
// System Manager/Website Manager/Stock roles) — so there is no guest-safe way
// to fetch slideshow frames. This renders the single `website_image` from the
// list payload only; a multi-image slideshow is a documented gap, not a bug.
export default function Gallery({ image, alt }) {
  return (
    <div className="ws-pd-gallery">
      <ProductImage
        src={image}
        alt={alt || ''}
        className="ws-pd-image"
        placeholder={
          <div className="ws-pd-image-ph" aria-hidden="true">
            <span className="material-symbols-outlined">local_florist</span>
          </div>
        }
      />
    </div>
  );
}
