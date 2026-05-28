export function initials(s) {
  if (!s) return '?';
  const c = String(s).replace(/<[^>]+>/g, '').trim();
  const parts = c.split(/[\s.@_-]+/).filter((x) => x && !x.match(/^\d+$/));
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?')[0].toUpperCase();
}

export function shortUser(u) {
  if (!u) return '';
  return u.split('@')[0];
}
