import Tile from '../components/Tile';

const TILE_DEFS = {
  customer: {
    icon: 'person',
    title: 'Customer Panel',
    desc: 'Submit claims, raise suggestions, track open orders and shipments, download invoices, reorder favourites.',
    cta: 'Enter portal',
    variant: null,
    defaultHref: '/customer-portal',
  },
  crm: {
    icon: 'forum',
    title: 'CRM',
    desc: 'Inbox, leads, opportunities, prospects, customers and activity — the command centre for your sales team.',
    cta: 'Open CRM',
    variant: 'crm',
    defaultHref: '/customer-relationship-management',
  },
  webshop: {
    icon: 'storefront',
    title: 'Webshop',
    desc: 'Browse the farm catalogue, check live availability, place orders and request samples.',
    cta: 'Visit shop',
    variant: null,
    defaultHref: '/website-shop',
  },
};

export default function Landing({ fullName, tiles }) {
  // tiles is a map from server: { customer:{enabled,href?,reason?}, crm:{...}, webshop:{...} }
  const t = tiles || {};
  return (
    <div className="shell">
      <div className="hero">
        <div className="label">{fullName ? `Welcome, ${fullName}` : 'Member portal'}</div>
        <h1>Pick where you'd like to <em>go</em>.</h1>
        <p>Customer Portal links you to the tools your role unlocks — sales for the team, claims and orders for customers, and the live catalogue for both.</p>
      </div>

      <div className="tiles-wrap">
        <div className="tiles">
          {['customer', 'webshop'].map((key) => {
            const def = TILE_DEFS[key];
            const state = t[key] || { enabled: true };
            return (
              <Tile
                key={key}
                icon={def.icon}
                title={def.title}
                desc={def.desc}
                cta={def.cta}
                variant={def.variant}
                href={state.href || def.defaultHref}
                locked={!state.enabled}
                lockReason={state.reason}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
