// DEMOWALL · api.js
// Shared helpers: API calls, YouTube parsing, thumbnail resolution.

export const API = "/.netlify/functions";

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Parse a YouTube URL (or bare id) into a video id.
export function youtubeId(input) {
  if (!input) return null;
  const v = String(input).trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/,
    /^([A-Za-z0-9_-]{6,})$/,
  ];
  for (const re of patterns) {
    const m = v.match(re);
    if (m) return m[1];
  }
  return null;
}

// Best-effort YouTube thumbnail. maxres may not exist for some uploads;
// the browser img onerror will fall back to hqdefault.
export function ytThumb(id, quality = "hqdefault") {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

export function ytEmbedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&color=white`;
}

// Resolve the thumbnail URL for a demo: custom upload, else YouTube.
export function thumbSrc(demo, quality = "maxresdefault") {
  if (demo.thumbnail && demo.thumbnail.custom) {
    return `${API}/demos?thumb=${encodeURIComponent(demo.thumbnail.key)}`;
  }
  return ytThumb(demo.videoId || youtubeId(demo.youtubeUrl), quality);
}

export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Deterministic pseudo-random from a string, for card aspect assignment.
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick a collage aspect ratio for a card from a small editorial set.
const ASPECTS = [
  "16 / 10",
  "4 / 5",
  "16 / 9",
  "1 / 1",
  "3 / 4",
  "16 / 10",
  "4 / 5",
  "1 / 1",
];

export function aspectFor(id, featured = false) {
  if (featured) return "16 / 9";
  return ASPECTS[hashStr(id) % ASPECTS.length];
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}