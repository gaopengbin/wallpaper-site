import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Heart, Calendar, Layers, Maximize2,
  Monitor, Tag,
} from 'lucide-react';
import {
  getPreviewUrl, getImageUrl, getNasCacheUrl,
  downloadOriginal,
  fetchWallpaperList, fetchMobileWallpaperList,
  type WallpaperItem,
} from '../utils/api';
import { trackProductEvent, type WallpaperEventProperties } from '../lib/product-analytics';

export default function Detail() {
  const location = useLocation();
  const navigate = useNavigate();
  const item = location.state?.item as WallpaperItem | undefined;
  const [relatedWallpapers, setRelatedWallpapers] = useState<WallpaperItem[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [origLoading, setOrigLoading] = useState(false);
  const [origProgress, setOrigProgress] = useState(0);
  const [origBlobUrl, setOrigBlobUrl] = useState('');
  const [origError, setOrigError] = useState('');
  const origAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [item?.wtId]);

  useEffect(() => {
    if (!item) return;
    const properties: WallpaperEventProperties = {
      wallpaper_id: String(item.wtId),
      wallpaper_kind: item.type === 2 || item.type === 4 ? 'mobile' : 'desktop',
      media_type: item.type === 3 || item.type === 4 ? 'video' : 'image',
    };
    void trackProductEvent('wallpaper_viewed', properties);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const label = item.labelList?.[0] || '';
    const isMobile = item.type === 2 || item.type === 4;
    const fetcher = isMobile ? fetchMobileWallpaperList : fetchWallpaperList;
    fetcher({ page: 1, rows: 12, lbName: label, sortType: 1 }).then((data) => {
      if (data?.list) {
        setRelatedWallpapers(data.list.filter((w) => w.wtId !== item.wtId));
      }
    });
  }, [item]);

  if (!item) {
    return (
      <div style={{ paddingTop: 100, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>壁纸数据未找到</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 20px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', fontSize: 14,
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const isVideo = item.type === 3 || item.type === 4;
  const isMobile = item.type === 2 || item.type === 4;
  const bgUrl = getImageUrl(item.fileId);
  const previewUrl = getPreviewUrl(item.fileId);
  const nasType = isMobile ? 'mobile' : 'pc';

  const showError = (msg: string) => {
    setOrigError(msg);
    setTimeout(() => setOrigError(''), 3000);
  };

  const handleToggleOriginal = async () => {
    if (origLoading) return;
    if (showOriginal) {
      setShowOriginal(false);
      return;
    }
    if (origBlobUrl) {
      setShowOriginal(true);
      return;
    }
    setOrigLoading(true);
    setOrigProgress(0);
    setOrigError('');
    setShowOriginal(true);
    try {
      const ctrl = new AbortController();
      origAbort.current = ctrl;
      // Try .jpg first (batch downloader saves by detected content type)
      // Then try .mp4 for videos as fallback
      const urlsToTry = [getNasCacheUrl(item.wtId, nasType, false)];
      if (isVideo) urlsToTry.push(getNasCacheUrl(item.wtId, nasType, true));
      let res: Response | null = null;
      for (const url of urlsToTry) {
        const r = await fetch(url, { signal: ctrl.signal });
        if (r.ok) { res = r; break; }
      }
      if (!res) {
        showError('原始文件暂未缓存');
        setShowOriginal(false);
        return;
      }
      const total = Number(res.headers.get('content-length') || 0);
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) setOrigProgress(Math.round((loaded / total) * 100));
      }
      const blob = new Blob(chunks as BlobPart[]);
      if (blob.size < 1000) {
        showError('原始文件暂未缓存');
        setShowOriginal(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      setOrigBlobUrl(url);
      setOrigProgress(100);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        showError('加载失败');
        setShowOriginal(false);
      }
    } finally {
      setOrigLoading(false);
      origAbort.current = null;
    }
  };

  const formatNum = (n: string) => {
    const num = Number(n);
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num || 0);
  };

  const typeLabel = () => {
    switch (item.type) {
      case 1: return '静态电脑壁纸';
      case 2: return '静态手机壁纸';
      case 3: return '动态电脑壁纸';
      case 4: return '动态手机壁纸';
      default: return '壁纸';
    }
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');
  const handleDownload = async () => {
    setDownloading(true);
    setDownloadMsg('正在下载原图...');
    const result = await downloadOriginal(item.wtId, isVideo, item.labelList?.[0] || '壁纸', nasType);
    if (result.success) {
      void trackProductEvent('wallpaper_downloaded', {
        wallpaper_id: String(item.wtId),
        wallpaper_kind: isMobile ? 'mobile' : 'desktop',
        media_type: isVideo ? 'video' : 'image',
      });
      setDownloadMsg('下载成功！');
      setTimeout(() => setDownloadMsg(''), 2000);
    } else {
      setDownloadMsg(result.error || '下载失败');
      setTimeout(() => setDownloadMsg(''), 5000);
    }
    setDownloading(false);
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative orbs */}
      <div className="deco-orb deco-orb-1" />
      <div className="deco-orb deco-orb-2" />

      {/* Ambient background */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.35) saturate(2)',
          transform: 'scale(1.3)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(5,5,6,0.3) 0%, rgba(5,5,6,0.85) 100%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, paddingTop: 56 }}>
        {/* Back button */}
        <div className="max-w-[1920px] mx-auto detail-back" style={{ padding: '20px 24px 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)', fontSize: 13,
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              backdropFilter: 'blur(16px)', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <ArrowLeft size={14} /> 返回
          </button>
        </div>

        {/* Main content: Preview + Info */}
        <div
          className="max-w-[1920px] mx-auto detail-main"
          style={{
            padding: '24px 24px',
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
          }}
        >
          {/* Left: Monitor frame + preview */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Monitor frame */}
            <div className={isMobile ? 'detail-monitor-frame-mobile' : 'detail-monitor-frame'} style={{
              position: 'relative',
              background: 'var(--bg-surface)',
              borderRadius: 20,
              padding: isMobile ? '16px 80px' : '14px 14px 0',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.05)',
              border: '1px solid rgba(139,92,246,0.08)',
            }}>
              {/* Screen */}
              <div style={{
                position: 'relative',
                borderRadius: isMobile ? 20 : '8px 8px 0 0',
                overflow: 'hidden',
                background: '#000',
                aspectRatio: isMobile ? '9/19.5' : '16/10',
              }}>
                {!imgLoaded && (
                  <div className="wp-skeleton" style={{
                    position: 'absolute', inset: 0, borderRadius: 0,
                  }} />
                )}
                {isVideo ? (
                  <>
                    <video
                      src={showOriginal && origBlobUrl ? origBlobUrl : previewUrl}
                      autoPlay muted loop playsInline
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s',
                        cursor: 'pointer',
                      }}
                      onClick={handleToggleOriginal}
                      onLoadedData={() => setImgLoaded(true)}
                    />
                    {origLoading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)',
                      }}>
                        <div style={{
                          width: 160, height: 4, borderRadius: 2,
                          background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 8,
                        }}>
                          <div style={{
                            width: `${origProgress}%`, height: '100%', borderRadius: 2,
                            background: 'var(--gradient-accent)',
                            transition: 'width 0.2s',
                          }} />
                        </div>
                        <div style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                          color: '#fff', fontSize: 13,
                        }}>{origProgress > 0 ? `加载原始视频 ${origProgress}%` : '加载原始视频中...'}</div>
                      </div>
                    )}
                    <div
                      onClick={handleToggleOriginal}
                      style={{
                        position: 'absolute', bottom: 10, right: 10,
                        padding: '5px 12px', borderRadius: 8,
                        background: showOriginal && origBlobUrl ? 'var(--gradient-accent)' : 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff', fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.3s',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {showOriginal && origBlobUrl ? '原始视频' : '点击查看原始视频'}
                    </div>
                    {origError && (
                      <div style={{
                        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                        padding: '6px 16px', borderRadius: 8,
                        background: 'rgba(255,80,80,0.15)', backdropFilter: 'blur(8px)',
                        color: '#ff6b6b', fontSize: 12, fontWeight: 500,
                        border: '1px solid rgba(255,80,80,0.2)', whiteSpace: 'nowrap',
                      }}>{origError}</div>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      src={showOriginal && origBlobUrl ? origBlobUrl : previewUrl}
                      alt={item.labelList?.[0] || '壁纸'}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s',
                        cursor: 'pointer',
                      }}
                      onClick={handleToggleOriginal}
                      onLoad={() => setImgLoaded(true)}
                    />
                    {origLoading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)',
                      }}>
                        <div style={{
                          width: 160, height: 4, borderRadius: 2,
                          background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 8,
                        }}>
                          <div style={{
                            width: `${origProgress}%`, height: '100%', borderRadius: 2,
                            background: 'var(--gradient-accent)',
                            transition: 'width 0.2s',
                          }} />
                        </div>
                        <div style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                          color: '#fff', fontSize: 13,
                        }}>{origProgress > 0 ? `加载原图 ${origProgress}%` : '加载原图中...'}</div>
                      </div>
                    )}
                    <div
                      onClick={handleToggleOriginal}
                      style={{
                        position: 'absolute', bottom: 10, right: 10,
                        padding: '5px 12px', borderRadius: 8,
                        background: showOriginal && origBlobUrl ? 'var(--gradient-accent)' : 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff', fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.3s',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {showOriginal && origBlobUrl ? '原图' : '点击查看原图'}
                    </div>
                    {origError && (
                      <div style={{
                        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                        padding: '6px 16px', borderRadius: 8,
                        background: 'rgba(255,80,80,0.15)', backdropFilter: 'blur(8px)',
                        color: '#ff6b6b', fontSize: 12, fontWeight: 500,
                        border: '1px solid rgba(255,80,80,0.2)', whiteSpace: 'nowrap',
                      }}>{origError}</div>
                    )}
                  </>
                )}
              </div>

              {/* Monitor stand (PC only) */}
              {!isMobile && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingTop: 8, paddingBottom: 4,
                }}>
                  <div style={{
                    width: 60, height: 4, borderRadius: 2,
                    background: 'rgba(255,255,255,0.15)',
                  }} />
                </div>
              )}
            </div>

            {/* Monitor base (PC only) */}
            {!isMobile && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -2 }}>
                <div style={{
                  width: 120, height: 20,
                  background: 'linear-gradient(to bottom, #1a1a1a, #111)',
                  borderRadius: '0 0 8px 8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: 'none',
                }} />
              </div>
            )}
          </div>

          {/* Right: Info panel */}
          <div className="detail-info-panel" style={{
            width: 360, flexShrink: 0,
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(24px) saturate(1.5)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {/* Category & Resolution */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>分类</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{typeLabel()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Monitor size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>分辨率</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em' }}>{item.rw} × {item.rh}</span>
              </div>
            </div>

            {/* File size */}
            {item.fileMb && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Maximize2 size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>大小</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{item.fileMb}</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>下载</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{formatNum(item.downCount)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Heart size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>收藏</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{formatNum(item.favorCount)}</span>
              </div>
            </div>

            {item.createTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {item.createTime.split(' ')[0] || item.createTime}
                </span>
              </div>
            )}

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12, marginBottom: 16,
                background: 'var(--gradient-accent)',
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: downloading ? 'wait' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                fontFamily: 'inherit', letterSpacing: '0.02em',
                boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <Download size={16} /> {downloading ? '下载中...' : `下载（${item.fileMb}）`}
            </button>

            {/* Download status message */}
            {downloadMsg && (
              <div style={{
                padding: '8px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13,
                background: downloadMsg.includes('失败') ? 'rgba(255,80,80,0.08)' : 'var(--accent-glow)',
                color: downloadMsg.includes('失败') ? '#ff6b6b' : '#b39dff',
                border: `1px solid ${downloadMsg.includes('失败') ? 'rgba(255,80,80,0.15)' : 'rgba(124,92,252,0.15)'}`,
              }}>
                <span>{downloadMsg}</span>
              </div>
            )}

            {/* Labels in info panel */}
            {item.labelList && item.labelList.length > 0 && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 10, color: 'rgba(255,255,255,0.5)', fontSize: 13,
                }}>
                  <Tag size={13} /> 标签
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.labelList.map((label, idx) => (
                    <span key={idx} style={{
                      fontSize: 12, color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 12px', borderRadius: 8, letterSpacing: '0.02em',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related tags section */}
        {item.labelList && item.labelList.length > 0 && (
          <div className="max-w-[1920px] mx-auto detail-section" style={{ padding: '8px 24px 20px' }}>
            <h3 style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14,
              fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em',
            }}>
              <Tag size={15} style={{ color: 'var(--accent)' }} />
              <span className="gradient-text">相关标签</span>
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {item.labelList.map((label, idx) => (
                <Link
                  key={idx}
                  to={isMobile ? '/mobile' : '/'}
                  state={{ category: label }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, color: 'var(--text-secondary)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '6px 16px', borderRadius: 10,
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--gradient-accent-soft)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related wallpapers */}
        {relatedWallpapers.length > 0 && (
          <div className="max-w-[1920px] mx-auto detail-section" style={{ padding: '12px 24px 80px' }}>
            <h3 style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16,
              fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em',
            }}>
              <Heart size={15} style={{ color: 'var(--accent-secondary)' }} />
              <span className="gradient-text">相关推荐</span>
            </h3>
            <div className={isMobile ? 'detail-related-grid-mobile' : 'detail-related-grid-pc'} style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(6, 1fr)' : 'repeat(8, 1fr)',
              gap: 10,
            }}>
              {relatedWallpapers.slice(0, 12).map((wp, idx) => (
                <RelatedCard key={`${wp.wtId}-${idx}`} item={wp} isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function RelatedCard({ item, isMobile }: { item: WallpaperItem; isMobile: boolean }) {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.type === 3 || item.type === 4;

  return (
    <div
      onClick={() => navigate(`/detail/${item.wtId}`, { state: { item } })}
      style={{
        aspectRatio: isMobile ? '9/16' : '16/10',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'transform 500ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 400ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {!loaded && <div className="wp-skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
      <img
        src={getImageUrl(item.fileId)}
        alt=""
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.4s',
        }}
        onLoad={() => setLoaded(true)}
      />
      {isVideo && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 9, padding: '2px 6px',
          borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2,
          fontWeight: 500,
        }}>
          <svg width="6" height="8" viewBox="0 0 6 8" fill="white">
            <polygon points="0,0 6,4 0,8" />
          </svg>
          动态
        </div>
      )}
    </div>
  );
}
