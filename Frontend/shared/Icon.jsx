// Material Symbols icon. Shared across all agriflow frontends.
//   import Icon from '@shared/Icon';
export default function Icon({ name, style, className }) {
  return (
    <span className={`material-symbols-outlined${className ? ' ' + className : ''}`} style={style}>
      {name}
    </span>
  );
}
