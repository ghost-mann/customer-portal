import { useState } from 'react';
import { addItemReview } from '../lib/api';

// Star-pick + title + comment submit form. `rating` is stored server-side as
// a 0-1 fraction of 5 stars (confirmed live via bench-execute: rating=1 ->
// average_rating=5.0), so a picked star count of e.g. 4 is sent as 4/5.
export default function ReviewForm({ webItem, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rating || !title.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      await addItemReview(webItem, title.trim(), rating / 5, comment.trim() || undefined);
      setResult({ ok: true, message: 'Thanks — your review has been posted.' });
      setRating(0);
      setTitle('');
      setComment('');
      if (onSubmitted) await onSubmitted();
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setBusy(false);
    }
  }

  const shownRating = hoverRating || rating;

  return (
    <form className="ws-review-form" onSubmit={handleSubmit}>
      <span className="ws-rail-title">Write a review</span>

      <div className="ws-review-form-stars" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            type="button"
            key={i}
            className="ws-star-btn"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i)}
            disabled={busy}
          >
            <span aria-hidden="true" className={`material-symbols-outlined ws-star ws-star-${shownRating >= i ? 'on' : 'off'}`}>
              star
            </span>
          </button>
        ))}
      </div>

      <input
        type="text"
        className="ws-search"
        placeholder="Review title"
        value={title}
        maxLength={140}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
      />
      <textarea
        className="ws-search ws-review-textarea"
        placeholder="Tell other customers about this item (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={busy}
        rows={3}
      />
      <button className="ws-btn-gold" disabled={busy || !rating || !title.trim()} type="submit">
        {busy ? 'Submitting…' : 'Submit review'}
      </button>

      {result && (
        <div className={`ws-pd-add-result ws-pd-add-result-${result.ok ? 'ok' : 'err'}`} role="status">
          {result.message}
        </div>
      )}
    </form>
  );
}
