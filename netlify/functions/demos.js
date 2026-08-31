// DEMOWALL · demos.js (public)
// GET  /api/demos            -> published demos, sorted
// GET  /api/demos?id=<id>    -> single published demo
// GET  /api/demos?thumb=<key>-> custom thumbnail image bytes

import { getDemos, thumbStore, publicDemo, json, error } from "./_lib.js";

const MAX_AGE = 60;

export default async (req) => {
  const url = new URL(req.url);

  // Serve a custom thumbnail.
  if (url.searchParams.has("thumb")) {
    const key = url.searchParams.get("thumb");
    if (!key) return error("Missing key", 400);
    const store = thumbStore();
    const entry = await store.get(key, { type: "arrayBuffer" });
    if (entry === null) return error("Thumbnail not found", 404);
    return new Response(new Uint8Array(entry), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `public, max-age=${MAX_AGE * 60}, immutable`,
      },
    });
  }

  const demos = await getDemos();
  const published = demos
    .filter((d) => d.published !== false)
    .sort((a, b) => {
      const byOrder = (b.sortOrder || 0) - (a.sortOrder || 0);
      if (byOrder !== 0) return byOrder;
      const byDate = (b.capturedAt || "").localeCompare(a.capturedAt || "");
      if (byDate !== 0) return byDate;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

  const id = url.searchParams.get("id");
  if (id) {
    const demo = published.find((d) => d.id === id);
    if (!demo) return error("Demo not found", 404);
    return json(publicDemo(demo));
  }

  return json(published.map(publicDemo));
};