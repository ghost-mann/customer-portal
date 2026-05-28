export default function Icon({ name, style, className }) {
  return <span className={`material-symbols-outlined${className ? ' ' + className : ''}`} style={style}>{name}</span>;
}
