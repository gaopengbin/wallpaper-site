import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Search, Monitor, Ruler, ChevronDown } from 'lucide-react';
import WallpaperCard from '../components/WallpaperCard';
import CategoryBar from '../components/CategoryBar';
import { fetchWallpaperList, fetchSearchSuggestions, getPreviewUrl, type WallpaperItem } from '../utils/api';

const PC_CATEGORIES = [
  '风景', '美女', '动漫', '游戏', '明星', '汽车', '动物',
  '简约', '城市', '星空', '科技', '文字', '暗黑', '森林',
  '海洋', '花卉', '二次元', '插画', '摄影', '创意',
];

const SORT_OPTIONS = [
  { value: 3, label: '最新' },
  { value: 1, label: '最热' },
  { value: 2, label: '推荐' },
];

const RESOLUTION_OPTIONS = [
  { value: 0, label: '全部' },
  { value: 1, label: '1K' },
  { value: 2, label: '2K' },
  { value: 3, label: '3K' },
  { value: 4, label: '4K' },
  { value: 5, label: '5K' },
  { value: 6, label: '6K' },
  { value: 7, label: '7K' },
  { value: 8, label: '8K+' },
];

const TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: '1', label: '静态' },
  { value: '3', label: '动态' },
];

export default function Home() {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [category, setCategory] = useState('');
  const [sortType, setSortType] = useState(3);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const loadingRef = useRef(false);
  const [bgFileId, setBgFileId] = useState('');
  const [wpType, setWpType] = useState('');
  const [rlevel, setRlevel] = useState(0);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [heroMode, setHeroMode] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const onSearchInputChange = (val: string) => {
    setSearchInput(val);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    const results = fetchSearchSuggestions(val.trim());
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const selectSuggestion = (label: string) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchInput(label);
    handleCategoryChange(label);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadWallpapers = useCallback(
    async (pageNum: number, reset = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      const data = await fetchWallpaperList({
        page: pageNum,
        rows: 50,
        lbName: category,
        sortType,
        ...(wpType ? { wpType } : {}),
      });

      if (data && data.list) {
        setWallpapers((prev) => (reset ? data.list : [...prev, ...data.list]));
        setHasMore(pageNum < data.pages);
        if (reset && data.list.length > 0) {
          const staticItems = data.list.filter((w) => w.type === 1);
          const pick = staticItems.length > 0 ? staticItems : data.list;
          setBgFileId(pick[Math.floor(Math.random() * pick.length)].fileId);
        }
      }

      setLoading(false);
      setInitialLoad(false);
      loadingRef.current = false;
    },
    [category, sortType, wpType]
  );

  // Client-side resolution filter
  const filteredWallpapers = useMemo(() => {
    if (!rlevel) return wallpapers;
    if (rlevel === 8) return wallpapers.filter((w) => w.rlevel >= 8);
    return wallpapers.filter((w) => w.rlevel === rlevel);
  }, [wallpapers, rlevel]);

  useEffect(() => {
    setPage(1);
    setWallpapers([]);
    setHasMore(true);
    setInitialLoad(true);
    loadingRef.current = false;
    loadWallpapers(1, true);
  }, [category, sortType, wpType, loadWallpapers]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Hero mode: collapse on scroll or when filters are active
  useEffect(() => {
    const onScroll = () => {
      setHeroMode(window.scrollY < 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hasActiveFilters = !!(category || wpType || rlevel);
  const isCollapsed = !heroMode || hasActiveFilters;

  const handleSearch = () => {
    setShowSuggestions(false);
    setSuggestions([]);
    handleCategoryChange(searchInput.trim());
  };

  useEffect(() => {
    if (page > 1) {
      loadWallpapers(page);
    }
  }, [page, loadWallpapers]);

  // Auto-fill: keep loading until page is scrollable or no more data
  // Also load more when client-side filter yields too few results
  useEffect(() => {
    if (initialLoad || loading || !hasMore) return;
    const timer = setTimeout(() => {
      const needsMore = rlevel
        ? filteredWallpapers.length < 20
        : document.body.scrollHeight <= window.innerHeight + 200;
      if (needsMore) {
        setPage((prev) => prev + 1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [wallpapers.length, filteredWallpapers.length, initialLoad, loading, hasMore, rlevel]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1500 &&
        !loadingRef.current &&
        hasMore
      ) {
        setPage((prev) => prev + 1);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSearchInput(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', position: 'relative' }}>
      {/* Decorative gradient orbs */}
      <div className="deco-orb deco-orb-1" />
      <div className="deco-orb deco-orb-2" />

      {/* Ambient wallpaper background */}
      {bgFileId && (
        <>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            backgroundImage: `url(${getPreviewUrl(bgFileId)})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(80px) brightness(0.35) saturate(2)', transform: 'scale(1.3)',
            transition: 'background-image 2s ease',
          }} />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, rgba(5,5,6,0.3) 0%, rgba(5,5,6,0.85) 100%)',
          }} />
        </>
      )}

      {/* Hero search - large when at top, collapses on scroll/search */}
      {!isCollapsed && (
        <div style={{
          position: 'relative', zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 24px 40px',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.2), transparent)',
            backgroundSize: '200% 100%',
            animation: 'gradientShift 4s ease-in-out infinite',
          }} />

          <h1 style={{
            fontSize: 36, fontWeight: 800, marginBottom: 8, textAlign: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            <span style={{ color: 'var(--text-primary)' }}>WallCraft</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, textAlign: 'center' }}>
            高清壁纸 · 超清下载 · 每日更新
          </p>

          <div ref={searchBoxRef} style={{ width: '100%', maxWidth: 600, position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <Search size={18} style={{ marginLeft: 20, color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="搜索壁纸关键词..."
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 16, padding: '16px 16px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: '10px 24px', margin: 6, borderRadius: 12, border: 'none',
                  background: 'var(--gradient-accent)', color: '#fff', fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                搜索
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 50,
                background: 'rgba(20,20,24,0.96)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
              }}>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => selectSuggestion(s)} style={{
                    display: 'block', width: '100%', padding: '12px 20px', border: 'none',
                    background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky toolbar - search + filters + categories */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 10,
        background: isCollapsed ? 'rgba(10,10,12,0.92)' : 'transparent',
        backdropFilter: isCollapsed ? 'blur(20px)' : 'none',
        borderBottom: isCollapsed ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div className="max-w-[1920px] mx-auto" style={{ padding: isCollapsed ? '12px 24px' : '0 24px 12px' }}>
          {/* Compact search (only when collapsed) */}
          {isCollapsed && (
            <div ref={searchBoxRef} style={{ maxWidth: 480, margin: '0 auto 10px', position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, overflow: 'hidden',
              }}>
                <Search size={14} style={{ marginLeft: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="搜索壁纸..."
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: 13, padding: '8px 10px',
                    fontFamily: 'inherit',
                  }}
                />
                {category && (
                  <button
                    onClick={() => { setSearchInput(''); handleCategoryChange(''); }}
                    style={{
                      padding: '0 10px', border: 'none', background: 'transparent',
                      cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11,
                      fontFamily: 'inherit',
                    }}
                  >
                    清除
                  </button>
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
                  background: 'rgba(20,20,24,0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => selectSuggestion(s)} style={{
                      display: 'block', width: '100%', padding: '9px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-secondary)', fontSize: 13,
                      textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filter chips row */}
          <div ref={filterRef} className="filter-chips" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
            flexWrap: 'wrap',
          }}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSortType(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12,
                    border: active ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    background: active ? 'var(--gradient-accent)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#fff' : 'var(--text-muted)',
                    fontWeight: active ? 600 : 400, fontFamily: 'inherit',
                    boxShadow: active ? '0 2px 10px rgba(139,92,246,0.2)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />

            {/* Type filter */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  border: wpType ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', background: wpType ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                  color: wpType ? '#c4b5fd' : 'var(--text-muted)', fontFamily: 'inherit',
                }}
              >
                <Monitor size={11} /> 种类 <ChevronDown size={10} />
              </button>
              {openFilter === 'type' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 20,
                  background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                  padding: 6, minWidth: 100, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}>
                  {TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => { setWpType(opt.value); setOpenFilter(null); }}
                      style={{
                        display: 'block', width: '100%', padding: '7px 12px', borderRadius: 6,
                        fontSize: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: wpType === opt.value ? 'rgba(139,92,246,0.15)' : 'transparent',
                        color: wpType === opt.value ? '#c4b5fd' : 'var(--text-secondary)',
                        fontFamily: 'inherit',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Resolution filter */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setOpenFilter(openFilter === 'res' ? null : 'res')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8, fontSize: 12,
                  border: rlevel ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', background: rlevel ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                  color: rlevel ? '#c4b5fd' : 'var(--text-muted)', fontFamily: 'inherit',
                }}
              >
                <Ruler size={11} /> 分辨率{rlevel ? ` ${rlevel}K` : ''} <ChevronDown size={10} />
              </button>
              {openFilter === 'res' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 20,
                  background: 'rgba(20,20,24,0.95)', backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                  padding: 6, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2,
                  minWidth: 200, maxHeight: 280, overflowY: 'auto',
                }}>
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => { setRlevel(opt.value); setOpenFilter(null); }}
                      style={{
                        padding: '7px 10px', borderRadius: 6,
                        fontSize: 12, border: 'none', cursor: 'pointer', textAlign: 'center',
                        background: rlevel === opt.value ? 'rgba(139,92,246,0.15)' : 'transparent',
                        color: rlevel === opt.value ? '#c4b5fd' : 'var(--text-secondary)',
                        fontFamily: 'inherit',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>

            {(wpType || rlevel) && (
              <button
                onClick={() => { setWpType(''); setRlevel(0); }}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11,
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                  fontFamily: 'inherit',
                }}
              >
                清除筛选
              </button>
            )}
          </div>

          {/* Category bar */}
          <div style={{
            padding: '6px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <CategoryBar
              categories={PC_CATEGORIES}
              active={category}
              onSelect={handleCategoryChange}
            />
          </div>
        </div>
      </div>

      {/* Wallpaper masonry grid */}
      <div className="max-w-[1920px] mx-auto grid-container" style={{ padding: '0 24px 100px', position: 'relative', zIndex: 1 }}>
        {initialLoad ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--gradient-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'float 2s ease-in-out infinite',
            }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>加载中...</span>
          </div>
        ) : filteredWallpapers.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '120px 0',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--gradient-accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 28 }}>🎨</span>
            </div>
            <p style={{ fontSize: 16, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>暂无壁纸</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>换个分类试试</p>
          </div>
        ) : (
          <>
            <div className="wp-grid">
              {filteredWallpapers.map((item, idx) => (
                <WallpaperCard
                  key={`${item.wtId}-${idx}`}
                  item={item}
                />
              ))}
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--gradient-accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>加载更多...</span>
              </div>
            )}

            {!hasMore && filteredWallpapers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '8px 24px', borderRadius: 50,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3))' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.06em' }}>END</span>
                  <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, rgba(236,72,153,0.3), transparent)' }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
