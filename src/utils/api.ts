import { encrypt, decrypt } from './crypto';
import { LABEL_LIST } from './labels';

const API_BASE = '/api';

export interface WallpaperItem {
  wtId: string;
  type: number;       // 1=static PC, 2=static mobile, 3=dynamic PC, 4=dynamic mobile
  userId: string;
  fileId: string;
  fileMb: string;
  rw: string;         // width
  rh: string;         // height
  rlevel: number;
  createTime: string;
  labelList: string[];
  downCount: string;
  favorCount: string;
  sort: string;
}

export interface WallpaperListResponse {
  list: WallpaperItem[];
  total: number;
  pages: number;
}

export interface WallpaperListParams {
  page: number;
  rows: number;
  lbName?: string;
  sortType?: number;
  wpType?: string;
}

export function getImageUrl(fileId: string): string {
  return `/img/getCroppingImg/${fileId}`;
}

export function getPreviewUrl(fileId: string): string {
  return `/img/previewFileImg/${fileId}`;
}

export function getNasCacheUrl(wtId: string, type: 'pc' | 'mobile' = 'pc', isVideo = false): string {
  return `/nas/${type}/${wtId}.${isVideo ? 'mp4' : 'jpg'}`;
}

export function getVideoUrl(fileId: string): string {
  return `/img/getVideoReduce/${fileId}`;
}

export function getDownloadUrl(fileId: string, isVideo: boolean): string {
  return isVideo ? getVideoUrl(fileId) : getPreviewUrl(fileId);
}

export async function downloadOriginal(
  wtId: string,
  isVideo: boolean,
  fileName: string,
  type: 'pc' | 'mobile' = 'pc'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try NAS cache: .jpg first, then .mp4 for videos
    const urlsToTry = [getNasCacheUrl(wtId, type, false)];
    if (isVideo) urlsToTry.push(getNasCacheUrl(wtId, type, true));

    for (const nasUrl of urlsToTry) {
      const nasRes = await fetch(nasUrl);
      if (nasRes.ok && (await nasRes.clone().blob()).size > 1000) {
        const blob = await nasRes.blob();
        triggerDownload(blob, fileName + (isVideo ? '.mp4' : '.png'));
        return { success: true };
      }
    }

    return { success: false, error: '原始文件暂未缓存' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function downloadPreview(
  fileId: string,
  isVideo: boolean,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getPreviewUrl(fileId);
    const res = await fetch(url);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const blob = await res.blob();
    triggerDownload(blob, fileName + (isVideo ? '.mp4' : '.png'));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

async function callWallpaperApi(
  params: WallpaperListParams,
  defaultWpType: string
): Promise<WallpaperListResponse | null> {
  try {
    const requestData = {
      ...params,
      wpType: params.wpType || defaultWpType,
    };

    const encryptedData = encrypt(JSON.stringify(requestData));
    const url = `${API_BASE}/pc/wallpaper/wallpaperList?data=${encodeURIComponent(encryptedData)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('API error:', response.status);
      return null;
    }

    const json = await response.json();
    if (json.status !== 200 || !json.data) {
      console.error('API returned error:', json.msg);
      return null;
    }

    const decrypted = decrypt(json.data);
    if (!decrypted) {
      console.error('Failed to decrypt response');
      return null;
    }

    return JSON.parse(decrypted);
  } catch (e) {
    console.error('API call error:', e);
    return null;
  }
}

export async function fetchWallpaperList(
  params: WallpaperListParams
): Promise<WallpaperListResponse | null> {
  return callWallpaperApi(params, '1,3');
}

export async function fetchMobileWallpaperList(
  params: WallpaperListParams
): Promise<WallpaperListResponse | null> {
  return callWallpaperApi(params, '2,4');
}

export function fetchSearchSuggestions(keyword: string): string[] {
  if (!keyword.trim()) return [];
  const kw = keyword.trim().toLowerCase();
  const matches = LABEL_LIST.filter(
    (label) => label.toLowerCase().includes(kw) && label !== keyword.trim()
  );
  matches.sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const aExact = al === kw ? -1 : 0;
    const bExact = bl === kw ? -1 : 0;
    if (aExact !== bExact) return aExact - bExact;
    const aStarts = al.startsWith(kw) ? 0 : 1;
    const bStarts = bl.startsWith(kw) ? 0 : 1;
    return aStarts - bStarts || a.length - b.length;
  });
  return matches.slice(0, 10);
}
