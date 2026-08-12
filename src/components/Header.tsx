import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { path: '/', label: '电脑壁纸' },
    { path: '/mobile', label: '手机壁纸' },
  ];


  return (
    <header
      style={{
        position: 'fixed',
        top: scrolled ? 8 : 0,
        left: scrolled ? 8 : 0,
        right: scrolled ? 8 : 0,
        zIndex: 50,
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Gradient border wrapper */}
      <div
        style={{
          padding: scrolled ? 1 : 0,
          borderRadius: scrolled ? 18 : 0,
          background: scrolled
            ? 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(236,72,153,0.1) 50%, rgba(139,92,246,0.05) 100%)'
            : 'transparent',
          transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            background: scrolled ? 'rgba(8, 8, 10, 0.9)' : 'rgba(5, 5, 6, 0.6)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
            borderRadius: scrolled ? 17 : 0,
            borderBottom: scrolled ? 'none' : '1px solid rgba(255,255,255,0.04)',
            transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="max-w-[1920px] mx-auto header-inner" style={{ padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--gradient-accent)',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                  transition: 'transform 300ms ease, box-shadow 300ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(139, 92, 246, 0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.3)'; }}
              >
                <Sparkles size={16} color="#fff" />
              </div>
              <span className="header-logo-text" style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #F0F2F5 0%, rgba(240,242,245,0.7) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                WallCraft
              </span>
            </Link>

            {/* Navigation */}
            <nav className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      position: 'relative',
                      padding: '6px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'var(--text-muted)',
                      borderRadius: 10,
                      transition: 'all 300ms ease',
                      background: active ? 'var(--gradient-accent-soft)' : 'transparent',
                      border: active ? '1px solid rgba(139,92,246,0.15)' : '1px solid transparent',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

          </div>
        </div>
      </div>
    </header>
  );
}
