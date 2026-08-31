// DEMOWALL · admin.js (protected)
// POST /api/admin?action=login    { password }            -> { token }
// GET  /api/admin?action=list                             -> all demos (auth)
// POST /api/admin?action=save     { demo }                -> { id, demo } (auth)
// POST /api/admin?action=delete   { id }                  -> { ok } (auth)
// POST /api/admin?action=upload   { id, contentType, dataBase64 } -> { thumb } (auth)

import {
  getDemos,
  saveDemos,
  thumbStore,
  verifyPassword,
  verifyToken,
  hasPasswordConfigured,
  sanitizeDemo,
  uniqueId,
  slugify,
  json,
  error,
} from "./_lib.js";

export default async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";

  if (action === "login") {
    if (!hasPasswordConfigured()) {
      return error("Admin password is not configured on the server yet.", 500);
    }
    let body = {};
    try {
      body = await req.json();
    } catch {
      return error("Invalid request", 400);
    }
    const ok = await verifyPassword(body.password);
    if (!ok) return error("Incorrect password", 401);
    return json({ token: await tokenForLogin(body.password) });
  }

  // Everything below requires a valid bearer token.
  const authorized = await verifyToken(req.headers.get("authorization"));
  if (!authorized) return error("Unauthorized", 401);

  switch (action) {
    case "list": {
      const demos = await getDemos();
      const sorted = [...demos].sort((a, b) => {
        const byOrder = (b.sortOrder || 0) - (a.sortOrder || 0);
        if (byOrder !== 0) return byOrder;
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
      return json(sorted);
    }

    case "save": {
      let body = {};
      try {
        body = await req.json();
      } catch {
        return error("Invalid request", 400);
      }
      const input = body.demo || {};
      if (!input.title) return error("A title is required", 400);

      const demos = await getDemos();
      const isNew = !input.id || !demos.some((d) => d.id === input.id);
      const demo = sanitizeDemo(input);

      demo.id = await uniqueId(slugify(input.id || demo.title) || "demo", demos, input.id);
      if (isNew) demo.createdAt = demo.updatedAt = new Date().toISOString();

      const idx = demos.findIndex((d) => d.id === demo.id);
      if (idx >= 0) demos[idx] = demo;
      else demos.push(demo);

      await saveDemos(demos);
      return json({ id: demo.id, demo });
    }

    case "delete": {
      let body = {};
      try {
        body = await req.json();
      } catch {
        return error("Invalid request", 400);
      }
      const demos = await getDemos();
      const target = demos.find((d) => d.id === body.id);
      if (!target) return error("Demo not found", 404);

      if (target.thumbnail && target.thumbnail.custom && target.thumbnail.custom.key) {
        await thumbStore().delete(target.thumbnail.custom.key).catch(() => {});
      }
      await saveDemos(demos.filter((d) => d.id !== body.id));
      return json({ ok: true });
    }

    case "upload": {
      let body = {};
      try {
        body = await req.json();
      } catch {
        return error("Invalid request", 400);
      }
      const { dataBase64, contentType, id } = body;
      if (!dataBase64 || !contentType) return error("Missing file data", 400);

      const ext = (contentType.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 6);
      const safeId = String(id || "demo").replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "demo";
      const key = `thumbs/${safeId}-${Date.now()}.${ext}`;

      const buffer = Buffer.from(dataBase64, "base64");
      if (buffer.byteLength > 4 * 1024 * 1024) return error("Image must be under 4 MB", 400);

      await thumbStore().set(key, buffer, { metadata: { contentType } });
      return json({ thumb: { key } });
    }

    default:
      return error("Unknown action", 400);
  }
};

async function tokenForLogin(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}