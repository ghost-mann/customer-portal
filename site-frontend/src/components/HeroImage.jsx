import Icon from './Icon';

export default function HeroImage({ src, fallbackIcon = 'spa', meta }) {
  return (
    <div className="hero-image-wrap">
      {src ? (
        <img className="hero-image" src={src} alt="" />
      ) : (
        <div className="hero-image-placeholder">
          <Icon name={fallbackIcon} />
        </div>
      )}
      {meta && <div className="hero-image-meta">{meta}</div>}
    </div>
  );
}
