import { useStore } from '../store';
import Icon from './Icon';
import { fmt } from '../utils';

export default function Sidebar() {
  const { categories, farms, filters, setFilter } = useStore();

  return (
    <aside className="side">
      <h3>Filters</h3>
      <div
        className={`season-toggle${filters.inSeason ? ' on' : ''}`}
        onClick={() => setFilter({ inSeason: !filters.inSeason })}
      >
        <Icon name="local_florist" />
        <span>In season this week</span>
        <span className="indicator" />
      </div>

      <h3>Categories</h3>
      <ul className="side-list">
        <li
          className={filters.category == null ? 'active' : ''}
          onClick={() => setFilter({ category: null })}
        >
          <span>All</span>
        </li>
        {(categories || []).map((c) => (
          <li
            key={c.item_group}
            className={filters.category === c.item_group ? 'active' : ''}
            onClick={() => setFilter({ category: c.item_group })}
          >
            <span>{c.item_group}</span>
            <span className="count">{fmt(c.cnt)}</span>
          </li>
        ))}
      </ul>

      {farms && farms.length > 0 && (
        <>
          <h3>Farms</h3>
          <ul className="side-list">
            <li
              className={filters.farm == null ? 'active' : ''}
              onClick={() => setFilter({ farm: null })}
            >
              <span>All farms</span>
            </li>
            {farms.map((f) => (
              <li
                key={f}
                className={filters.farm === f ? 'active' : ''}
                onClick={() => setFilter({ farm: f })}
              >
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
