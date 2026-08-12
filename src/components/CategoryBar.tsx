import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryBarProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

export default function CategoryBar({ categories, active, onSelect }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  const btnStyle = (isActive: boolean): React.CSSProperties => ({
    flexShrink: 0,
    padding: '5px 14px',
    borderRadius: 8,
    fontSize: '13px',
    border: isActive ? '1px solid rgba(139,92,246,0.15)' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap',
    background: isActive ? 'var(--gradient-accent-soft)' : 'transparent',
    color: isActive ? '#fff' : 'var(--text-muted)',
    fontWeight: isActive ? 600 : 400,
    fontFamily: 'inherit',
    letterSpacing: '0.02em',
  });

  return (
    <div className="relative flex items-center">
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          style={{
            position: 'absolute', left: 0, zIndex: 10,
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg-surface)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={13} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5"
        onScroll={checkScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button onClick={() => onSelect('')} style={btnStyle(active === '')}>
          全部
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => onSelect(cat)} style={btnStyle(active === cat)}>
            {cat}
          </button>
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          style={{
            position: 'absolute', right: 0, zIndex: 10,
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg-surface)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={13} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}
    </div>
  );
}
