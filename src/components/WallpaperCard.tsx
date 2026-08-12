import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Heart } from 'lucide-react';
import { getImageUrl, getPreviewUrl, getNasCacheUrl, type WallpaperItem } from '../utils/api';

interface WallpaperCardProps {
  item: WallpaperItem;
  onClick?: (item: WallpaperItem) => void;
}

export default function WallpaperCard({ item }: WallpaperCardProps) {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [useNas, setUseNas] = useState(true);
  const isVideo = item.type === 3 || item.type === 4;
  const videoRef = useRef<HTMLVideoElement>(null);

  const imgSrc = !isVideo && useNas
    ? getNasCacheUrl(item.wtId)
    : getImageUrl(item.fileId);

  const formatNum = (n: string) => {
    const num = Number(n);
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num || 0);
  };

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="wp-card"
      onClick={() => navigate(`/detail/${item.wtId}`, { state: { item } })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ animationDelay: `${Math.random() * 0.2}s` }}
    >
      {/* Media */}
      <div className="wp-media">
        {!loaded && !error && <div className="wp-skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
        {error ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
            加载失败
          </div>
        ) : isVideo ? (
          <video
            ref={videoRef}
            src={getPreviewUrl(item.fileId)}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        ) : (
          <img
            src={imgSrc}
            alt={item.labelList?.[0] || '壁纸'}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (useNas) {
                setUseNas(false);
                setLoaded(false);
              } else {
                setError(true);
              }
            }}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
      </div>

      {/* Video badge */}
      {isVideo && (
        <div className="wp-badge">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="white">
            <polygon points="0,0 8,5 0,10" />
          </svg>
          动态
        </div>
      )}

      {/* Resolution badge */}
      <div className="wp-resolution">
        {item.rw} × {item.rh}
      </div>

      {/* NAS cache indicator */}
      {!isVideo && loaded && (
        <div style={{
          position: 'absolute', top: 6, left: 6, padding: '2px 6px',
          borderRadius: 4, fontSize: 10, fontWeight: 600, zIndex: 5,
          background: useNas ? 'rgba(34,197,94,0.85)' : 'rgba(100,100,100,0.7)',
          color: '#fff',
        }}>
          {useNas ? 'NAS原图' : '缩略图'}
        </div>
      )}

      {/* Hover overlay with labels */}
      <div className="wp-overlay">
        <div className="wp-labels">
          {item.labelList?.slice(0, 8).map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      </div>

      {/* Download button */}
      <button
        className="wp-download-btn"
        onClick={(e) => { e.stopPropagation(); navigate(`/detail/${item.wtId}`, { state: { item } }); }}
      >
        <Download size={14} />
        下载壁纸
      </button>

      {/* Bottom info bar */}
      <div className="wp-bottom">
        <span>{item.fileMb}</span>
        <div className="wp-stats">
          <span><Download size={11} /> {formatNum(item.downCount)}</span>
          <span><Heart size={11} /> {formatNum(item.favorCount)}</span>
        </div>
      </div>
    </div>
  );
}
