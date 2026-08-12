import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, HardDrive, AlertTriangle, CheckCircle, Loader, Clock, Zap } from 'lucide-react';

interface SyncStatus {
  state: 'running' | 'done' | 'idle';
  type: string;
  mode: string;
  startTime: string;
  updateTime: string;
  elapsed: number;
  currentPage: number;
  total: number;
  newCount: number;
  skipCount: number;
  failCount: number;
  totalBytes: number;
  totalMB: number;
  target: number;
  progress: number;
  speed: number;
  errors: { time: string; wtId: string; error: string; type: string }[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

export default function Monitor() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStatus = async () => {
    try {
      const res = await fetch('https://wp.gpb.cc/status.json?' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setError('');
    } catch (e: any) {
      setError(e.message || '无法获取状态');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const stateColor = status?.state === 'running' ? '#22c55e' : status?.state === 'done' ? '#8b5cf6' : '#666';
  const stateText = status?.state === 'running' ? '同步中' : status?.state === 'done' ? '已完成' : '空闲';

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div className="deco-orb deco-orb-1" />
      <div className="deco-orb deco-orb-2" />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 56 }}>
        <div className="max-w-[960px] mx-auto" style={{ padding: '20px 24px 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-secondary)', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              backdropFilter: 'blur(16px)',
            }}
          >
            <ArrowLeft size={14} /> 返回
          </button>
        </div>

        <div className="max-w-[960px] mx-auto" style={{ padding: '20px 16px 80px' }}>
          <h1 className="monitor-title" style={{
            fontSize: 28, fontWeight: 800, marginBottom: 6,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            <Activity size={24} style={{ display: 'inline', marginRight: 10, color: 'var(--accent)' }} />
            <span className="gradient-text">同步监控</span>
          </h1>
          <p className="monitor-subtitle" style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
            实时监控 NAS 壁纸下载进度 · 每 10 秒自动刷新 · 上次刷新: {lastRefresh.toLocaleTimeString('zh-CN')}
          </p>

          {loading && !status && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <Loader size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
              <p>加载中...</p>
            </div>
          )}

          {error && !status && (
            <div style={{
              padding: 20, borderRadius: 16, textAlign: 'center',
              background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.12)',
              color: '#ff6b6b',
            }}>
              <AlertTriangle size={28} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14 }}>无法获取同步状态: {error}</p>
              <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                同步任务可能尚未启动或 NAS 离线
              </p>
            </div>
          )}

          {status && (
            <>
              {/* Status badge + state */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 16px', borderRadius: 20,
                  background: `${stateColor}15`, border: `1px solid ${stateColor}30`,
                }}>
                  {status.state === 'running' ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor, animation: 'pulse 1.5s infinite' }} />
                  ) : (
                    <CheckCircle size={14} style={{ color: stateColor }} />
                  )}
                  <span style={{ color: stateColor, fontSize: 13, fontWeight: 600 }}>{stateText}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {status.mode === 'full' ? '全量模式' : '增量模式'} · 页 {status.currentPage}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)', padding: 24, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
                    <HardDrive size={14} style={{ display: 'inline', marginRight: 6 }} />
                    下载进度
                  </span>
                  <span style={{
                    fontSize: 22, fontWeight: 800,
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: 'var(--gradient-accent)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {status.progress}%
                  </span>
                </div>
                <div style={{
                  height: 12, borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    background: 'var(--gradient-accent)',
                    width: `${Math.min(status.progress, 100)}%`,
                    transition: 'width 1s ease',
                    boxShadow: '0 0 20px rgba(139,92,246,0.4)',
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: 8,
                  color: 'var(--text-muted)', fontSize: 12,
                }}>
                  <span>{status.total.toLocaleString()} 张</span>
                  <span>目标 {status.target.toLocaleString()} 张</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="monitor-stats-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16,
              }}>
                {[
                  { label: '本次新增', value: status.newCount, color: '#22c55e', icon: <Zap size={14} /> },
                  { label: '已跳过', value: status.skipCount, color: '#8b5cf6', icon: <CheckCircle size={14} /> },
                  { label: '失败', value: status.failCount, color: status.failCount > 0 ? '#ff6b6b' : '#666', icon: <AlertTriangle size={14} /> },
                  { label: '下载量', value: `${status.totalMB} MB`, color: '#3b82f6', icon: <HardDrive size={14} /> },
                ].map((stat, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)', padding: '16px 14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ color: stat.color, marginBottom: 8, opacity: 0.7 }}>{stat.icon}</div>
                    <div style={{
                      fontSize: 22, fontWeight: 800, color: stat.color,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, letterSpacing: '0.04em' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time stats */}
              <div className="monitor-time-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16,
              }}>
                {[
                  { label: '运行时间', value: formatDuration(status.elapsed) },
                  { label: '速度', value: `${status.speed} 张/分` },
                  { label: '最后更新', value: formatTime(status.updateTime) },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)', padding: '14px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {item.value}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {status.errors.length > 0 && (
                <div style={{
                  background: 'rgba(255,80,80,0.04)', borderRadius: 16,
                  border: '1px solid rgba(255,80,80,0.1)', padding: 20,
                }}>
                  <h3 style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 14, fontWeight: 600, color: '#ff6b6b', marginBottom: 12,
                  }}>
                    <AlertTriangle size={15} /> 最近错误 ({status.errors.length})
                  </h3>
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {status.errors.map((err, idx) => (
                      <div key={idx} className="monitor-error-item" style={{
                        padding: '8px 0',
                        borderBottom: idx < status.errors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        fontSize: 12,
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(err.time).toLocaleTimeString('zh-CN')}
                        </span>
                        <span style={{ color: '#ff9999', margin: '0 8px' }}>ID:{err.wtId}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 640px) {
          .monitor-title { font-size: 22px !important; }
          .monitor-subtitle { font-size: 11px !important; margin-bottom: 20px !important; }
          .monitor-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .monitor-stats-grid > div { padding: 12px 10px !important; }
          .monitor-stats-grid > div > div:nth-child(2) { font-size: 18px !important; }
          .monitor-time-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .monitor-time-grid > div { padding: 10px 14px !important; }
          .monitor-error-item { display: flex; flex-wrap: wrap; gap: 4px; }
        }
      `}</style>
    </div>
  );
}
