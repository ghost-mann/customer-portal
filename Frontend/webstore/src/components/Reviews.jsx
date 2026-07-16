import { useEffect, useState } from 'react';
import { getItemReviews, getGuestRedirectOnAction } from '../lib/api';
import ReviewForm from './ReviewForm';

function Stars({ value }) {
  // value: 0-5 (average_rating is already 0-5; a stored per-review `rating`
  // is a 0-1 fraction and must be *5'd by the caller before reaching here).
  const rounded = Math.round(value || 0);
  return (
    <span className="ws-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="material-symbols-outlined ws-star">
          {i <= rounded ? 'star' : 'star_border'}
        </span>
      ))}
    </span>
  );
}

// Reviews section for the product detail page. get_item_reviews has no
// allow_guest=True (confirmed live — see lib/api.js), so this whole section,
// list and form alike, gates on window.logged_in and sends a guest through
// the same login-redirect Cart.jsx/Product.jsx use, rather than attempting a
// call that would 403.
export default function Reviews({ webItem }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loggedIn = Boolean(window.logged_in);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getItemReviews(webItem);
      setData(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!webItem || !loggedIn) { setLoading(false); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webItem, loggedIn]);

  const reviews = (data && data.reviews) || [];
  // TODO: `reviews` only holds the current page (get_item_reviews paginates),
  // so this only detects an existing review on page 1 — a review on a later
  // page won't suppress the form. Needs a dedicated "has this user reviewed"
  // check (or fetch across all pages) to be fully correct.
  const alreadyReviewed = window.frappe_user && reviews.some((r) => r.user === window.frappe_user);

  async function goSignIn() {
    const redirect = (await getGuestRedirectOnAction().catch(() => '')) || '/login';
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = `${redirect}${redirect.includes('?') ? '&' : '?'}redirect-to=${encodeURIComponent(returnTo)}`;
  }

  return (
    <section className="ws-reviews" id="reviews">
      <div className="ws-section-hd">
        <h2>Reviews</h2>
        {data && data.total_reviews > 0 && (
          <span className="ws-section-count ws-reviews-summary">
            <Stars value={data.average_rating} />
            {Number(data.average_rating).toFixed(1)} · {data.total_reviews} review{data.total_reviews === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {!loggedIn && (
        <div className="ws-empty ws-reviews-guest">
          <p>Sign in to read and write reviews for this item.</p>
          <button className="ws-btn-gold" onClick={goSignIn}>Sign in</button>
        </div>
      )}

      {loggedIn && loading && <div className="ws-empty">Loading reviews…</div>}
      {loggedIn && !loading && error && (
        <div className="ws-empty">Could not load reviews: {error}</div>
      )}

      {loggedIn && !loading && !error && (
        <>
          {reviews.length === 0 && (
            <div className="ws-empty">No reviews yet. Be the first to review this item.</div>
          )}
          {reviews.length > 0 && (
            <div className="ws-review-list">
              {reviews.map((r) => (
                <div className="ws-review-row" key={r.name}>
                  <div className="ws-review-row-hd">
                    <Stars value={(Number(r.rating) || 0) * 5} />
                    {r.review_title && <span className="ws-review-title">{r.review_title}</span>}
                  </div>
                  {r.comment && <p className="ws-review-comment">{r.comment}</p>}
                  <div className="ws-review-meta">{r.user}{r.published_on ? ` · ${r.published_on}` : ''}</div>
                </div>
              ))}
            </div>
          )}

          {alreadyReviewed ? (
            <div className="ws-pd-hint">You've already reviewed this item — thanks!</div>
          ) : (
            <ReviewForm webItem={webItem} onSubmitted={load} />
          )}
        </>
      )}
    </section>
  );
}
