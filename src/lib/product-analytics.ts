const endpoint = import.meta.env.VITE_PRODUCT_ANALYTICS_ENDPOINT ||
  (window.location.hostname === 'wallpaper.gpb.cc'
    ? 'https://laogao.xyz/platform-api/v1/product-events'
    : '')

const visitorStorageKey = 'wallpaper-web:analytics-visitor'
const sessionStorageKey = 'wallpaper-web:analytics-session'

export type WallpaperEventProperties = {
  wallpaper_id: string
  wallpaper_kind: 'desktop' | 'mobile'
  media_type: 'image' | 'video'
}

type EventName = 'page_view' | 'wallpaper_viewed' | 'wallpaper_downloaded'
type Properties = Record<string, string>

function identifier(storage: Storage, key: string) {
  const existing = storage.getItem(key)
  if (existing) return existing
  const value = crypto.randomUUID()
  storage.setItem(key, value)
  return value
}

function acquisition(): Properties {
  const parameters = new URLSearchParams(window.location.search)
  let referrerHost = ''
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : ''
  } catch {
    referrerHost = ''
  }
  return {
    path: window.location.pathname.slice(0, 256),
    ...(referrerHost ? { referrer_host: referrerHost.slice(0, 128) } : {}),
    ...(parameters.get('utm_source') ? { source: parameters.get('utm_source')!.slice(0, 64) } : {}),
    ...(parameters.get('utm_medium') ? { medium: parameters.get('utm_medium')!.slice(0, 64) } : {}),
    ...(parameters.get('utm_campaign') ? { campaign: parameters.get('utm_campaign')!.slice(0, 96) } : {}),
  }
}

export async function trackProductEvent(event: EventName, properties: Properties = {}) {
  if (!endpoint) return
  try {
    const payload = {
      schema_version: 1,
      product: 'wallpaper-web',
      events: [{
        event_id: crypto.randomUUID(),
        event,
        occurred_at: new Date().toISOString(),
        visitor_id: identifier(localStorage, visitorStorageKey),
        session_id: identifier(sessionStorage, sessionStorageKey),
        properties: { ...acquisition(), ...properties },
      }],
    }
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Analytics must never interrupt browsing or downloads.
  }
}
