import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface TokenInfo {
  total: number;
  available: number;
  exhausted: number;
  tokens: { id: string; exhausted: boolean }[];
}

export default function Login() {
  const navigate = useNavigate();
  const [_state, setState] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error' | 'timeout'>('idle');
  const [message, setMessage] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const pollRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchTokenInfo = useCallback(async () => {
    try {
      const r = await fetch('/proxy-login/token-info');
      const data = await r.json();
      setTokenInfo(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTokenInfo();
  }, [fetchTokenInfo]);

  const startLogin = async () => {
    setStatus('loading');
    setMessage('正在生成二维码...');
    try {
      const r = await fetch('/proxy-login/qrcode');
      const data = await r.json();
      setState(data.state);
      setQrUrl(data.qrUrl);
      setStatus('scanning');
      setMessage('请用微信扫描二维码');
      startPolling(data.state);
    } catch (e: any) {
      setStatus('error');
      setMessage('生成二维码失败: ' + e.message);
    }
  };

  const startPolling = (loginState: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatus('timeout');
        setMessage('登录超时，请重新扫码');
        return;
      }
      attempts++;
      try {
        const r = await fetch(`/proxy-login/poll/${loginState}`);
        const data = await r.json();
        if (data.success) {
          setStatus('success');
          setMessage(`登录成功！Token: ${data.token}`);
          setTokenInfo(data.info);
          return;
        }
      } catch {}
      pollRef.current = window.setTimeout(poll, 2000);
    };
    poll();
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '80px 20px 40px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative orbs */}
      <div className="deco-orb deco-orb-1" />
      <div className="deco-orb deco-orb-2" />

      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed', top: 72, left: 24, zIndex: 40,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          color: 'var(--text-secondary)', padding: '7px 16px', borderRadius: 10,
          cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          backdropFilter: 'blur(16px)',
          transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
      >
        <ArrowLeft size={14} /> 返回
      </button>

      <h1 style={{
        fontSize: 36, fontWeight: 800, marginBottom: 8,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <span style={{ color: 'var(--text-primary)' }}>微信</span>
        <span className="gradient-text">扫码登录</span>
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 36, letterSpacing: '0.02em' }}>
        每次登录获取 token，每个 token 可下载原图 10 次 / 天
      </p>

      {/* Token status */}
      {tokenInfo && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '20px 28px', marginBottom: 28, minWidth: 340,
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', gap: 36, justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 32, fontWeight: 800,
                fontFamily: "'Space Grotesk', sans-serif",
                background: 'var(--gradient-accent)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{tokenInfo.available}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>可用</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ff6b6b', fontSize: 32, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{tokenInfo.exhausted}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>已用完</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 32, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{tokenInfo.total}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>总计</div>
            </div>
          </div>
          {tokenInfo.tokens.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {tokenInfo.tokens.map((t, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                  background: t.exhausted ? 'rgba(255,80,80,0.06)' : 'var(--accent-glow)',
                  color: t.exhausted ? '#ff6b6b' : '#c4b5fd',
                  border: `1px solid ${t.exhausted ? 'rgba(255,80,80,0.1)' : 'rgba(139,92,246,0.1)'}`,
                  letterSpacing: '0.02em',
                }}>
                  {t.id} {t.exhausted ? '✗' : '✓'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Code area - gradient border wrapper */}
      <div style={{
        padding: 1, borderRadius: 22,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.08) 50%, rgba(139,92,246,0.05) 100%)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: 420, minHeight: 480,
          background: 'rgba(8,8,10,0.95)', borderRadius: 21,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 28,
        }}>
          {status === 'idle' && (
            <button
              onClick={startLogin}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                background: '#07c160',
                border: 'none', color: '#fff', padding: '24px 44px', borderRadius: 16,
                cursor: 'pointer', fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: '0 8px 32px rgba(7,193,96,0.3)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
            >
              <QrCode size={36} />
              生成微信登录二维码
            </button>
          )}

          {status === 'loading' && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--gradient-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', animation: 'float 2s ease-in-out infinite',
              }}>
                <RefreshCw size={22} color="#fff" className="animate-spin" />
              </div>
              <p>{message}</p>
            </div>
          )}

          {status === 'scanning' && (
            <>
              <iframe
                ref={iframeRef}
                src={qrUrl}
                style={{
                  width: 300, height: 400, border: 'none',
                  borderRadius: 12, background: '#fff',
                }}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 14, textAlign: 'center' }}>
                {message}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, letterSpacing: '0.02em' }}>
                轮询中... 扫码后自动获取 token
              </p>
            </>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={44} color="#07c160" />
              <p style={{ color: '#07c160', fontSize: 15, fontWeight: 600, marginTop: 14 }}>{message}</p>
              <button
                onClick={() => { setStatus('idle'); startLogin(); }}
                style={{
                  marginTop: 20, padding: '10px 24px', borderRadius: 10,
                  background: 'var(--gradient-accent-soft)',
                  border: '1px solid rgba(139,92,246,0.12)',
                  color: '#c4b5fd', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                再次扫码（获取更多 token）
              </button>
            </div>
          )}

          {(status === 'error' || status === 'timeout') && (
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={44} color="#ff6b6b" />
              <p style={{ color: '#ff6b6b', fontSize: 14, marginTop: 14 }}>{message}</p>
              <button
                onClick={() => { setStatus('idle'); startLogin(); }}
                style={{
                  marginTop: 20, padding: '10px 24px', borderRadius: 10,
                  background: 'var(--gradient-accent-soft)',
                  border: '1px solid rgba(139,92,246,0.12)',
                  color: '#c4b5fd', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>

      <p style={{
        color: 'var(--text-muted)', fontSize: 12, marginTop: 28,
        maxWidth: 400, textAlign: 'center', lineHeight: 1.7, letterSpacing: '0.02em',
        position: 'relative', zIndex: 1,
      }}>
        说明：扫码登录后会自动获取下载 token。同一个微信号重新登录可能获得新 token，
        从而重置下载次数。每个 token 每天可下载原图 10 次。
      </p>
    </div>
  );
}
