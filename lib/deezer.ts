export const DEEZER_BASE_URL = "https://api.deezer.com" as const;

export type DeezerArtist = {
  id: number;
  name: string;
  picture?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
};

export type DeezerAlbum = {
  id: number;
  title: string;
  cover?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
};

export type DeezerTrack = {
  id: number;
  title: string;
  duration?: number;
  preview?: string; // 30s mp3 preview
  artist: DeezerArtist;
  album: DeezerAlbum;
  link?: string;
};

type DeezerSearchResponse = {
  data: DeezerTrack[];
  next?: string;
  total?: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Deezer request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function searchTracks(query: string, limit = 25): Promise<DeezerTrack[]> {
  const q = query.trim();
  if (!q) return [];
  const qp = new URLSearchParams({ q, limit: String(limit) });
  const data = await fetchJson<DeezerSearchResponse>(
    `${DEEZER_BASE_URL}/search?${qp.toString()}`
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function fetchTrack(trackId: number): Promise<DeezerTrack> {
  return await fetchJson<DeezerTrack>(`${DEEZER_BASE_URL}/track/${trackId}`);
}

