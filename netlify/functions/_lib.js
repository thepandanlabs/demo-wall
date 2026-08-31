// DEMOWALL · _lib.js
// Shared helpers for the Netlify Functions: blob stores, auth, catalog CRUD, seed.

import { getStore } from "@netlify/blobs";

const CATALOG_STORE = "demowall-catalog";
const THUMB_STORE = "demowall-thumbs";
const CATALOG_KEY = "catalog";

/* ---- Stores ----------------------------------------------------------------- */

export function catalogStore() {
  return getStore(CATALOG_STORE);
}

export function thumbStore() {
  return getStore(THUMB_STORE);
}

/* ---- Catalog CRUD ------------------------------------------------------------- */

export async function getDemos() {
  const store = catalogStore();
  const raw = await store.get(CATALOG_KEY, { type: "json" });
  if (raw && Array.isArray(raw)) return raw;
  const seeded = await seedIfEmpty(store);
  return seeded;
}

export async function saveDemos(demos) {
  await catalogStore().setJSON(CATALOG_KEY, demos);
}

export async function seedIfEmpty(store) {
  const raw = await store.get(CATALOG_KEY, { type: "json" });
  if (raw && Array.isArray(raw) && raw.length) return raw;
  const demos = SEED_DEMOS.map((d) => ({ ...d, id: d.id || null }));
  await store.setJSON(CATALOG_KEY, demos);
  return demos;
}

/* ---- Auth --------------------------------------------------------------------- */

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function expectedToken() {
  return process.env.DEMO_WALL_PASSWORD ? sha256Hex(process.env.DEMO_WALL_PASSWORD) : null;
}

export function hasPasswordConfigured() {
  return Boolean(process.env.DEMO_WALL_PASSWORD);
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password) {
  const token = await expectedToken();
  if (!token) return false;
  const given = await sha256Hex(password || "");
  return safeEqual(given, token);
}

export async function verifyToken(authHeader) {
  const token = await expectedToken();
  if (!token) return false;
  const given = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  return safeEqual(given, token);
}

/* ---- Helpers ------------------------------------------------------------------- */

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function uniqueId(base, demos, excludeId) {
  let id = base || "demo";
  let n = 2;
  while (demos.some((d) => d.id === id && d.id !== excludeId)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function sanitizeDemo(input) {
  const d = input || {};
  return {
    title: String(d.title || "").trim().slice(0, 140),
    company: String(d.company || "").trim().slice(0, 120),
    companyUrl: String(d.companyUrl || "").trim().slice(0, 300),
    event: String(d.event || "").trim().slice(0, 120),
    tagline: String(d.tagline || "").trim().slice(0, 240),
    description: String(d.description || "").trim().slice(0, 6000),
    notes: String(d.notes || "").trim().slice(0, 4000),
    youtubeUrl: String(d.youtubeUrl || "").trim().slice(0, 500),
    personName: String(d.personName || "").trim().slice(0, 120),
    personRole: String(d.personRole || "").trim().slice(0, 120),
    category: String(d.category || "").trim().slice(0, 80),
    capturedAt: String(d.capturedAt || "").trim().slice(0, 20),
    tags: Array.isArray(d.tags) ? d.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [],
    recordedBy: String(d.recordedBy || "").trim().slice(0, 80),
    published: d.published !== false,
    featured: Boolean(d.featured),
    sortOrder: Number.isFinite(Number(d.sortOrder)) ? Number(d.sortOrder) : 0,
    thumbnail: d.thumbnail && d.thumbnail.custom ? { custom: { key: String(d.thumbnail.custom.key).slice(0, 300) } } : { custom: null },
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: d.updatedAt || new Date().toISOString(),
  };
}

export function publicDemo(demo) {
  return demo;
}

/* ---- Seed data ------------------------------------------------------------------ */
// Placeholder entries so the wall is never empty on first deploy.
// Replace or delete these from the admin panel once real demos are uploaded.

const SEED_DEMOS = [
  {
    id: "humanoid-hardware-gets-its-hands",
    title: "Humanoid hardware gets its hands",
    company: "Figure",
    companyUrl: "https://www.figure.ai",
    event: "Field notes",
    tagline: "End-to-end AI robotics, demonstrated live instead of on a slide.",
    description:
      "A full-body humanoid shown doing real work: perceiving, planning and manipulating objects with learned policies. The striking part is the speed of the loop from camera to action.\n\nThe demo was shot on the floor with no choreography. You hear the operator narrating what is happening while the hardware does the job.",
    notes:
      "This is the standard every booth demo should be held to: show the thing doing the thing. No CGI, no staging, the failure modes are visible and that makes it believable.",
    youtubeUrl: "https://youtu.be/Sq1QZB5baNw",
    personName: "Demo operator",
    personRole: "Field team",
    category: "Robotics",
    tags: ["humanoid", "embodied-ai"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: true,
    sortOrder: 60,
    thumbnail: { custom: null },
  },
  {
    id: "locomotion-as-an-acrobatic-demo",
    title: "Locomotion as an acrobatic demo",
    company: "Boston Dynamics",
    companyUrl: "https://bostondynamics.com",
    event: "Field notes",
    tagline: "Atlas rethought as a physics showcase you can watch all day.",
    description:
      "A humanoid robot running, jumping and swinging through a sequence no operator is steering frame by frame. The interest is in the control architecture: planning, model-predictive control and perception fused into one continuous performance.",
    notes:
      "Crowd physics at its best. People stop because something looks physically impossible, then stay to ask how it works. That is the demo pattern: impossible-looking, then a five-minute technical explanation.",
    youtubeUrl: "https://youtu.be/-e1_QhJ1EhQ",
    personName: "Demo operator",
    personRole: "Field team",
    category: "Robotics",
    tags: ["locomotion", "controls"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: false,
    sortOrder: 50,
    thumbnail: { custom: null },
  },
  {
    id: "natively-multimodal-ai-in-practice",
    title: "Natively multimodal AI in practice",
    company: "Google DeepMind",
    companyUrl: "https://deepmind.google",
    event: "Field notes",
    tagline: "A model that watches, listens and reasons in one pass.",
    description:
      "The flagship Gemini demo: a single model taking in images, audio and text at once, then explaining what it sees in a way that feels like a person thinking out loud. The tell is how it handles interruptions and messy real-world input.",
    notes:
      "The killer line was the operator asking the model to explain why it chose a move. Showing the reasoning is what separates a demo from a feature list.",
    youtubeUrl: "https://youtu.be/UIZAiVGceNQ",
    personName: "Demo operator",
    personRole: "Product team",
    category: "AI Agents",
    tags: ["multimodal", "reasoning"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: false,
    sortOrder: 40,
    thumbnail: { custom: null },
  },
  {
    id: "grok-open-source-by-design",
    title: "An open-weight frontier model, field-tested",
    company: "xAI",
    companyUrl: "https://x.ai",
    event: "Field notes",
    tagline: "Frontier-class weights you can run, poke at and fine-tune.",
    description:
      "Grok open-weights, shown as a working model rather than a release announcement: live generation, structured output and a chat loop that anyone can self-host. The demo focus is on weight availability and what it unlocks.",
    notes:
      "The open-weight angle matters for sovereign and on-prem stories. Watching someone actually run it, not just announce it, is the whole difference.",
    youtubeUrl: "https://youtu.be/Td0W8esRNbI",
    personName: "Demo operator",
    personRole: "Field team",
    category: "AI Agents",
    tags: ["open-weights", "llm"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: false,
    sortOrder: 30,
    thumbnail: { custom: null },
  },
  {
    id: "the-gpt-4o-live-voice-loop",
    title: "The live voice loop, minus the latency",
    company: "OpenAI",
    companyUrl: "https://openai.com",
    event: "Field notes",
    tagline: "Speech in, speech out, emotion intact.",
    description:
      "GPT-4o in a real-time voice conversation, including interruption handling and tone. The moment that lands is when it reacts to being cut off mid-sentence and adjusts its delivery.",
    notes:
      "Latency is the hidden demo killer. This one feels conversational because the loop is fast enough to forget there is a model in the middle.",
    youtubeUrl: "https://youtu.be/DO2tFIIV8MI",
    personName: "Demo operator",
    personRole: "Product team",
    category: "AI Agents",
    tags: ["voice", "real-time"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: false,
    sortOrder: 20,
    thumbnail: { custom: null },
  },
  {
    id: "optimus-walks-the-floor",
    title: "The floor-walking prototype",
    company: "Tesla",
    companyUrl: "https://www.tesla.com",
    event: "Field notes",
    tagline: "A purpose-built humanoid moving through a crowd.",
    description:
      "Optimus walking unassisted across an exhibition floor, steadying itself through uneven ground and turning to follow instructions. The interest is in the production-engineered hardware under the shell.",
    notes:
      "Walking demos in crowds are a great pattern: the hardware does something ordinary, but doing it in the open, unattended, is what reads as credible.",
    youtubeUrl: "https://youtu.be/cpraXaw7dyc",
    personName: "Demo operator",
    personRole: "Field team",
    category: "Robotics",
    tags: ["humanoid", "walking"],
    capturedAt: "2026-08-30",
    recordedBy: "tech demo enthusiasts",
    published: true,
    featured: false,
    sortOrder: 10,
    thumbnail: { custom: null },
  },
];