import { createHash } from 'crypto';
import https from 'https';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

const TARGET = 'haowallpaper.com';
const BASE_PATH = '/link';

function httpGet(
  path: string,
  token: string,
  cookie: string
): Promise<{ status: number; headers: Record<string, any>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Referer: `https://${TARGET}/`,
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (token) headers.token = token;
    if (cookie) headers.Cookie = cookie;

    const isFullUrl = path.startsWith('http');
    const u = isFullUrl ? new URL(path) : new URL(`https://${TARGET}${BASE_PATH}${path}`);

    const req = https.request(
      { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET', headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function httpPost(
  path: string,
  token: string,
  cookie: string
): Promise<{ status: number; headers: Record<string, any>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Referer: `https://${TARGET}/`,
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (token) headers.token = token;
    if (cookie) headers.Cookie = cookie;

    const u = new URL(`https://${TARGET}${BASE_PATH}${path}`);
    const req = https.request(
      { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST', headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function extractCookies(headers: Record<string, any>): string {
  const sc = headers['set-cookie'];
  if (!sc) return '';
  return (Array.isArray(sc) ? sc : [sc]).map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function doAltcha(token: string): Promise<string> {
  // Get challenge (retry up to 3 times with delay)
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await delay(2000);

    const r1 = await httpGet('/pc/certify/challenge', token, '');
    const cookie = extractCookies(r1.headers);
    let challenge: any;
    try {
      challenge = JSON.parse(r1.body.toString());
    } catch {
      console.log('[download-proxy] Challenge parse error, retrying...');
      continue;
    }

    if (!challenge.salt || !challenge.challenge || !challenge.maxnumber) {
      console.log('[download-proxy] Invalid challenge response:', JSON.stringify(challenge).substring(0, 200));
      continue;
    }

    console.log('[download-proxy] Challenge: maxnumber=%d salt=%s (attempt %d)', challenge.maxnumber, challenge.salt, attempt + 1);

    // Solve proof-of-work
    for (let n = 0; n <= challenge.maxnumber; n++) {
      if (createHash('sha256').update(challenge.salt + n).digest('hex') === challenge.challenge) {
        console.log('[download-proxy] Solved at n=%d', n);
        const payload = Buffer.from(JSON.stringify({
          algorithm: challenge.algorithm, challenge: challenge.challenge,
          number: n, salt: challenge.salt, signature: challenge.signature,
        })).toString('base64');

        // Verify
        const vr = await httpPost(`/pc/certify/verify?payload=${encodeURIComponent(payload)}`, token, cookie);
        const vrData = JSON.parse(vr.body.toString());
        console.log('[download-proxy] Verify result:', vrData.status, vrData.msg);
        return cookie;
      }
    }
    console.log('[download-proxy] No solution found, retrying...');
  }
  throw new Error('Failed to solve Altcha challenge after 3 attempts');
}

// Multi-token rotation: each token gets 10 downloads/day
interface TokenState {
  token: string;
  cookie: string;
  lastVerifyTime: number;
  exhausted: boolean;
  exhaustedDate: string; // YYYY-MM-DD, reset next day
}

const VERIFY_INTERVAL = 5 * 60 * 1000;
let tokenStates: TokenState[] = [];
let currentTokenIdx = 0;

function loadTokens(): string[] {
  let raw = process.env.HAO_TOKENS || process.env.HAO_TOKEN || '';
  if (!raw) {
    try {
      const envPath = resolve(process.cwd(), '.env');
      const envContent = readFileSync(envPath, 'utf-8');
      const m1 = envContent.match(/^HAO_TOKENS=(.+)$/m);
      const m2 = envContent.match(/^HAO_TOKEN=(.+)$/m);
      raw = (m1 || m2)?.[1]?.trim() || '';
    } catch {}
  }
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

function initTokenStates() {
  const tokens = loadTokens();
  if (tokens.length === 0 && tokenStates.length === 0) return;
  // Merge .env tokens with existing states (preserve dynamically added tokens)
  const existingTokens = new Set(tokenStates.map(s => s.token));
  for (const t of tokens) {
    if (!existingTokens.has(t)) {
      tokenStates.push({
        token: t, cookie: '', lastVerifyTime: 0,
        exhausted: false, exhaustedDate: '',
      });
      console.log(`[download-proxy] Loaded token ${t.slice(0,8)}... from .env`);
    }
  }
  // Reset exhausted tokens from previous days
  const today = new Date().toISOString().slice(0, 10);
  for (const s of tokenStates) {
    if (s.exhausted && s.exhaustedDate !== today) {
      s.exhausted = false;
      s.exhaustedDate = '';
      console.log(`[download-proxy] Token ${s.token.slice(0,8)}... reset (new day)`);
    }
  }
}

function getNextToken(): TokenState | null {
  initTokenStates();
  if (tokenStates.length === 0) return null;
  // Find first non-exhausted token starting from current index
  for (let i = 0; i < tokenStates.length; i++) {
    const idx = (currentTokenIdx + i) % tokenStates.length;
    if (!tokenStates[idx].exhausted) {
      currentTokenIdx = idx;
      return tokenStates[idx];
    }
  }
  return null; // All tokens exhausted
}

function markTokenExhausted(state: TokenState) {
  state.exhausted = true;
  state.exhaustedDate = new Date().toISOString().slice(0, 10);
  currentTokenIdx = (currentTokenIdx + 1) % tokenStates.length;
  const available = tokenStates.filter(s => !s.exhausted).length;
  console.log(`[download-proxy] Token ${state.token.slice(0,8)}... exhausted. ${available} token(s) remaining`);
}

// Dynamic token addition (from login)
function addToken(newToken: string) {
  if (tokenStates.some(s => s.token === newToken)) {
    // Already exists, just un-exhaust it
    const existing = tokenStates.find(s => s.token === newToken);
    if (existing) {
      existing.exhausted = false;
      existing.exhaustedDate = '';
      existing.cookie = '';
      existing.lastVerifyTime = 0;
    }
    console.log(`[download-proxy] Token ${newToken.slice(0,8)}... refreshed`);
    return;
  }
  tokenStates.push({
    token: newToken, cookie: '', lastVerifyTime: 0,
    exhausted: false, exhaustedDate: '',
  });
  console.log(`[download-proxy] Token ${newToken.slice(0,8)}... added (total: ${tokenStates.length})`);
}

function getTokenInfo() {
  initTokenStates();
  return {
    total: tokenStates.length,
    available: tokenStates.filter(s => !s.exhausted).length,
    exhausted: tokenStates.filter(s => s.exhausted).length,
    tokens: tokenStates.map(s => ({
      id: s.token.slice(0, 8) + '...',
      exhausted: s.exhausted,
    })),
  };
}

const WX_APPID = 'wx5b6879182de50dd6';
const WX_REDIRECT = encodeURIComponent('https://haowallpaper.com/link/app/appUser/wxLogin');

export function downloadProxyPlugin(): Plugin {
  return {
    name: 'download-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // --- Login endpoints ---
        if (req.url === '/proxy-login/qrcode') {
          const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
          const qrUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WX_APPID}&scope=snsapi_login&redirect_uri=${WX_REDIRECT}&state=${state}&login_type=jssdk&self_redirect=true&style=black&href=data:text/css;base64,`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ state, qrUrl, appid: WX_APPID, redirect_uri: WX_REDIRECT }));
          return;
        }

        const pollMatch = req.url?.match(/^\/proxy-login\/poll\/(.+)/);
        if (pollMatch) {
          const loginState = pollMatch[1];
          try {
            // stateLogin uses plain ?state= parameter (not encrypted)
            const r = await httpGet(`/app/appUser/stateLogin?state=${loginState}`, '', '');
            const raw = r.body.toString();
            console.log('[login-proxy] stateLogin:', raw.substring(0, 300));

            const data = JSON.parse(raw);

            if (data.status === 200 && data.data) {
              // Login success - data might be user object with token
              const userData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
              console.log('[login-proxy] Login data keys:', Object.keys(userData));
              const tk = userData.token || userData.Token;
              if (tk) {
                addToken(tk);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, token: tk.slice(0, 8) + '...', info: getTokenInfo() }));
              } else {
                // Token might be elsewhere in the response
                const fullStr = JSON.stringify(userData);
                console.log('[login-proxy] Full user data:', fullStr.substring(0, 500));
                const tokenMatch = fullStr.match(/[A-F0-9]{32}/i);
                if (tokenMatch) {
                  addToken(tokenMatch[0]);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, token: tokenMatch[0].slice(0, 8) + '...', info: getTokenInfo() }));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, waiting: true, debug: fullStr.substring(0, 100) }));
                }
              }
            } else {
              // 305 = not yet scanned, still waiting
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, waiting: true }));
            }
          } catch (e: any) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
          return;
        }

        if (req.url === '/proxy-login/token-info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getTokenInfo()));
          return;
        }

        // --- Download endpoint ---
        const urlMatch = req.url?.match(/^\/proxy-download\/([^?/]+)/);
        if (!urlMatch) return next();

        const wtId = urlMatch[1];

        // Try tokens until one works or all exhausted
        let downloadUrl: string | null = null;
        let lastError = '';

        for (let attempt = 0; attempt < tokenStates.length + 1; attempt++) {
          const state = getNextToken();
          if (!state) {
            lastError = lastError || '所有token今日下载次数已用完，请明日再试或在.env中添加更多token（HAO_TOKENS=token1,token2,...）';
            break;
          }

          const tk = state.token;
          try {
            // Ensure Altcha is verified for this token
            const now = Date.now();
            if (!state.cookie || now - state.lastVerifyTime > VERIFY_INTERVAL) {
              console.log('[download-proxy] Altcha verify for token %s...', tk.slice(0, 8));
              state.cookie = await doAltcha(tk);
              state.lastVerifyTime = now;
              console.log('[download-proxy] Altcha verified OK');
            }

            // Get signed download URL
            const r1 = await httpGet(`/common/file/getCompleteUrl/${wtId}`, tk, state.cookie);
            let urlData = JSON.parse(r1.body.toString());
            console.log('[download-proxy] getCompleteUrl: status=%d (token %s)', urlData.status, tk.slice(0, 8));

            // If 305, check if it's daily limit or needs re-verify
            if (urlData.status === 305) {
              const msg = urlData.msg || '';
              if (msg.includes('下载次数')) {
                // Daily limit hit - mark exhausted and try next token
                markTokenExhausted(state);
                lastError = msg;
                continue;
              }
              // Otherwise re-do Altcha and retry
              console.log('[download-proxy] Got 305, re-verifying Altcha...');
              state.cookie = await doAltcha(tk);
              state.lastVerifyTime = Date.now();
              const r1b = await httpGet(`/common/file/getCompleteUrl/${wtId}`, tk, state.cookie);
              urlData = JSON.parse(r1b.body.toString());
              console.log('[download-proxy] Retry: status=%d', urlData.status);

              if (urlData.status === 305 && (urlData.msg || '').includes('下载次数')) {
                markTokenExhausted(state);
                lastError = urlData.msg;
                continue;
              }
            }

            if (urlData.status === 200 && urlData.data && typeof urlData.data === 'string') {
              downloadUrl = urlData.data;
              break;
            }

            lastError = urlData.msg || 'getCompleteUrl failed';
          } catch (e: any) {
            lastError = e.message;
            console.error('[download-proxy] Token %s error:', tk.slice(0, 8), e.message);
          }
        }

        if (!downloadUrl) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: lastError }));
          return;
        }

        try {
          // Download file using signed URL (public, no auth needed)
          const r2 = await httpGet(downloadUrl, '', '');

          if (r2.status !== 200 || r2.body.length < 100) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Download failed', status: r2.status }));
            return;
          }

          const contentType = (r2.headers['content-type'] as string) || 'application/octet-stream';
          const ext = downloadUrl.includes('.mp4') ? '.mp4' : downloadUrl.includes('.png') ? '.png' : '.jpg';
          console.log('[download-proxy] Downloaded %s MB (%s)', (r2.body.length / 1024 / 1024).toFixed(2), ext);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': String(r2.body.length),
            'Content-Disposition': `attachment; filename="wallpaper${ext}"`,
          });
          res.end(r2.body);
        } catch (e: any) {
          console.error('[download-proxy] Error:', e.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
