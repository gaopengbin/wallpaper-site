import { useEffect, useState } from 'react';
import { X, Download, Heart, Maximize2 } from 'lucide-react';
import { getPreviewUrl, downloadPreview, type WallpaperItem } from '../utils/api';

interface WallpaperModalProps {
  item: WallpaperItem | null;
  onClose: () => void;
}

export default function WallpaperModal({ item, onClose }: WallpaperModalProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (item) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const isVideo = item.type === 3 || item.type === 4;

  const formatNum = (n: string) => {
    const num = Number(n);
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num || 0);
  };

  const handleDownload = () => {
    downloadPreview(item.fileId, isVideo, item.labelList?.[0] || '壁纸');
  };

  const handleOpenFull = () => {
    window.open(getPreviewUrl(item.fileId), '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
      }} />

      {/* Content */}
      <div
        style={{
          position: 'relative', maxWidth: '92vw', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'slideTop 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -44, right: 0, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <X size={16} color="white" />
        </button>

        {/* Media container */}
        <div style={{
          position: 'relative', borderRadius: 16, overflow: 'hidden',
          background: 'rgba(255,255,255,0.05)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}>
          {!loaded && (
            <div className="wp-skeleton" style={{
              width: '65vw', aspectRatio: isVideo ? 'auto' : '16/10',
              maxHeight: '72vh', borderRadius: 0,
            }} />
          )}
          {isVideo ? (
            <video
              src={getPreviewUrl(item.fileId)}
              autoPlay muted loop playsInline controls
              style={{
                maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain',
                transition: 'opacity 0.4s',
                opacity: loaded ? 1 : 0,
                position: loaded ? 'relative' : 'absolute',
              }}
              onLoadedData={() => setLoaded(true)}
            />
          ) : (
            <img
              src={getPreviewUrl(item.fileId)}
              alt={item.labelList?.[0] || '壁纸'}
              style={{
                maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain',
                transition: 'opacity 0.4s',
                opacity: loaded ? 1 : 0,
                position: loaded ? 'relative' : 'absolute',
              }}
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>

        {/* Info bar */}
        <div style={{
          marginTop: 16, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', width: '100%', gap: 16,
          padding: '0 4px',
        }}>
          {/* Left: info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {item.rw} × {item.rh}
            </span>
            {item.fileMb && (
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{item.fileMb}</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                <Download size={12} /> {formatNum(item.downCount)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                <Heart size={12} /> {formatNum(item.favorCount)}
              </span>
            </div>
            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.labelList?.slice(0, 5).map((label, idx) => (
                <span key={idx} style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '2px 10px', borderRadius: 50,
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleOpenFull}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 50,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              <Maximize2 size={14} /> 原图
            </button>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 50,
                background: 'linear-gradient(135deg, #7c5cfc, #b06cfc)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(124,92,252,0.3)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,92,252,0.5)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,92,252,0.3)'}
            >
              <Download size={14} /> 下载壁纸
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
