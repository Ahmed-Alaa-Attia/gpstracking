export const OPENWHYD_BASE_URL = "https://openwhyd.org" as const;

export type OpenWhydPost = {
  _id: string;
  name?: string;
  img?: string;
  uNm?: string;
  uId?: string;
  eId?: string;
  text?: string;
  src?: {
    id?: string;
    name?: string;
  };
};

type HotTracksResponse =
  | { tracks?: OpenWhydPost[]; hasMore?: unknown }
  | OpenWhydPost[];

type FetchPostsParams = {
  limit?: number;
  skip?: number;
  after?: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Openwhyd request failed: ${res.status}`);
  return (await res.json()) as T;
}

export function getPlayableUrlFromEid(eId?: string): string | null {
  if (!eId) return null;

  // /fi/http...  => direct audio file URL
  if (eId.startsWith("/fi/")) {
    const url = eId.slice("/fi/".length);
    return url.startsWith("http") ? url : null;
  }

  // /sc/...#https://api.soundcloud.com/tracks/... or similar => stream URL after '#'
  // /bc/...#http... => stream URL after '#'
  const hashIndex = eId.indexOf("#");
  if (hashIndex >= 0) {
    const url = eId.slice(hashIndex + 1);
    return url.startsWith("http") ? url : null;
  }

  return null; // YouTube/Vimeo/Deezer/etc are not directly playable here
}

export async function fetchHotPosts(
  params: FetchPostsParams & { genre?: string } = {}
): Promise<OpenWhydPost[]> {
  const qp = new URLSearchParams({ format: "json" });
  if (params.limit != null) qp.set("limit", String(params.limit));
  if (params.skip != null) qp.set("skip", String(params.skip));
  if (params.after != null) qp.set("after", params.after);
  // The API docs show hot tracks as `/hot/<genre>` (e.g. /hot/electro).
  // `/hot?format=json` may return an empty list depending on server behavior.
  const genre = (params.genre ?? "electro").trim();
  const path = genre ? `/hot/${encodeURIComponent(genre)}` : "/hot";
  const data = await fetchJson<HotTracksResponse>(
    `${OPENWHYD_BASE_URL}${path}?${qp.toString()}`
  );
  if (Array.isArray(data)) return data;
  return Array.isArray(data.tracks) ? data.tracks : [];
}

export async function fetchPostById(postId: string): Promise<OpenWhydPost> {
  const qp = new URLSearchParams({ format: "json" });
  return await fetchJson<OpenWhydPost>(`${OPENWHYD_BASE_URL}/c/${encodeURIComponent(postId)}?${qp.toString()}`);
}

