import { useState } from 'react';

// Mona Flowers brand mark. Renders the logo image if present, otherwise an "MF"
// monogram fallback. Drop the real file at customer_portal/public/logo.png (served at
// /assets/customer_portal/logo.png) and it appears everywhere automatically.
//   import Logo from '@shared/Logo';
//   <div className="brand-mark"><Logo /></div>
const SRC = '/assets/customer_portal/logo.png';

export default function Logo({ fallback = 'MF', alt = 'Mona Flowers' }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      <img
        src={SRC}
        alt={alt}
        onError={() => setOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }
  return <>{fallback}</>;
}
