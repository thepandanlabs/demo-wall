// DEMOWALL · wall.js
// Public wall: hero counts, filter chips, featured spotlight, masonry collage.

import {
  api,
  thumbSrc,
  youtubeId,
  aspectFor,
  fmtDate,
} from "./api.js";

const state = {
  demos: [],
  category: null,
};

const els = {
  countValue: document.getElementById("count-value"),
  countSub: document.getElementById("count-sub"),
  eventsValue: document.getElementById("events-value"),
  chips: document.getElementById("chips"),
  countLabel: document.getElementById("result-count"),
  spotlight: document.getElementById("spotlight"),
  spotlightInner: document.getElementById("spotlight-inner"),
  wall: document.getElementById("wall"),
  wallGrid: document.getElementById("wall-grid"),
  skeleton: document.getElementById("wall-skeleton"),
  empty: document.getElementById("wall-empty"),
};

function thumbnailImg(demo, cls, alt) {
  const id = demo.videoId || youtubeId(demo.youtubeUrl) || "";
  const img = document.createElement("img");
  img.className = cls;
  img.alt = alt || `${demo.title} thumbnail`;
  img.loading = "lazy";
  img.src = thumbSrc(demo);
  if (!(demo.thumbnail && demo.thumbnail.custom)) {
    img.onerror = () => {
      if (img.src.includes("maxresdefault")) {
        img.src = thumbSrc(demo, "hqdefault");
      }
    };
  }
  return img;
}

function cardEl(demo, opts = {}) {
  const article = document.createElement("article");
  article.className = "card";
  if (!opts.noReveal) article.classList.add("reveal");
  article.dataset.id = demo.id;
  article.dataset.category = (demo.category || "").toLowerCase();
  article.style.setProperty("--ratio", opts.ratio || aspectFor(demo.id, opts.featured));

  const link = document.createElement("a");
  link.className = "card-media";
  link.href = `demo.html?id=${encodeURIComponent(demo.id)}`;

  const media = thumbnailImg(demo, "", `${demo.title} by ${demo.company || "unknown"}`);

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = demo.category || "Demo";

  const play = document.createElement("span");
  play.className = "card-play";
  play.innerHTML = `<span class="play-ico"><i class="ph ph-play-fill" aria-hidden="true"></i></span>`;
  play.setAttribute("aria-hidden", "true");

  link.append(media, tag, play);

  const body = document.createElement("div");
  body.className = "card-body";

  const h = document.createElement("h3");
  h.className = "card-title";
  const titleLink = document.createElement("a");
  titleLink.href = link.href;
  titleLink.textContent = demo.title;
  h.appendChild(titleLink);

  const attrib = document.createElement("div");
  attrib.className = "card-attrib";
  const company = document.createElement("span");
  company.textContent = demo.company || "Field notes";
  const sep = document.createElement("span");
  sep.className = "sep";
  const event = document.createElement("span");
  event.textContent = demo.event || "";
  attrib.append(company, sep, event);

  const tagline = document.createElement("p");
  tagline.className = "card-tagline";
  tagline.textContent = demo.tagline || "";

  body.append(h, attrib, tagline);
  article.append(link, body);
  return article;
}

function spotlightEl(demo) {
  const card = document.createElement("a");
  card.className = "card";
  card.href = `demo.html?id=${encodeURIComponent(demo.id)}`;

  const media = document.createElement("div");
  media.className = "card-media";
  const img = thumbnailImg(demo, "", `${demo.title} by ${demo.company || "unknown"}`);
  const play = document.createElement("span");
  play.className = "card-play";
  play.innerHTML = `<span class="play-ico"><i class="ph ph-play-fill" aria-hidden="true"></i></span>`;
  play.setAttribute("aria-hidden", "true");
  media.append(img, play);

  const body = document.createElement("div");
  body.className = "card-body";

  const spot = document.createElement("span");
  spot.className = "spot";
  spot.innerHTML = `<i class="ph ph-record" aria-hidden="true"></i> Featured demo`;

  const h = document.createElement("h3");
  h.className = "card-title";
  h.textContent = demo.title;

  const tagline = document.createElement("p");
  tagline.className = "card-tagline";
  tagline.textContent = demo.tagline || "";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.innerHTML = `
    <span><b>${escapeHtml(demo.company || "Unknown")}</b></span>
    <span>${escapeHtml(demo.category || "Demo")}</span>
    <span>${escapeHtml(demo.event || "")}</span>
  `;

  const playBtn = document.createElement("span");
  playBtn.className = "btn btn-accent play";
  playBtn.innerHTML = `<i class="ph ph-play-fill" aria-hidden="true"></i> Watch the demo`;

  body.append(spot, h, tagline, meta, playBtn);
  card.append(media, body);
  return card;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChips(categories) {
  const counts = categories.map((c) => ({
    name: c,
    count: state.demos.filter((d) => d.category === c).length,
  }));

  const all = document.createElement("button");
  all.className = "chip";
  all.dataset.cat = "";
  all.innerHTML = `All <span class="count">${state.demos.length}</span>`;
  all.addEventListener("click", () => setCategory(null));
  els.chips.appendChild(all);

  for (const c of counts) {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.cat = c.name;
    b.innerHTML = `${escapeHtml(c.name)} <span class="count">${c.count}</span>`;
    b.addEventListener("click", () => setCategory(c.name));
    els.chips.appendChild(b);
  }
}

function setCategory(cat) {
  state.category = cat;
  const params = new URLSearchParams(location.search);
  if (cat) params.set("cat", cat);
  else params.delete("cat");
  history.replaceState(null, "", `${location.pathname}${params.toString() ? "?" + params.toString() : ""}`);
  document.querySelectorAll("#chips .chip").forEach((c) => {
    c.classList.toggle("is-active", c.dataset.cat === (cat || ""));
  });
  applyFilter();
}

function applyFilter() {
  const cat = state.category;
  let visible = 0;
  els.wallGrid.querySelectorAll(".card").forEach((card) => {
    const show = !cat || card.dataset.category === cat.toLowerCase();
    card.hidden = !show;
    if (show) visible++;
  });
  els.countLabel.textContent = `${visible} ${visible === 1 ? "demo" : "demos"}`;
}

function renderWall() {
  const published = state.demos.filter((d) => d.published !== false);
  const featured = published.find((d) => d.featured);
  const rest = published.filter((d) => d !== featured);

  els.countValue.textContent = published.length;
  els.countSub.textContent = published.length === 1 ? "demo on the wall" : "demos on the wall";

  const events = new Set(published.map((d) => d.event).filter(Boolean));
  els.eventsValue.textContent = events.size;

  const cats = [...new Set(published.map((d) => d.category).filter(Boolean))].sort();
  renderChips(cats);

  if (featured) {
    els.spotlight.style.display = "";
    els.spotlightInner.appendChild(spotlightEl(featured));
  } else {
    els.spotlight.style.display = "none";
  }

  if (published.length === 0) {
    els.wallGrid.style.display = "none";
    els.empty.style.display = "";
    els.empty.dataset.empty = "";
    return;
  }

  // Editorial collage: deterministic aspect variety per card.
  const fragment = document.createDocumentFragment();
  for (const demo of rest) {
    fragment.appendChild(cardEl(demo));
  }
  els.wallGrid.appendChild(fragment);

  els.countLabel.textContent = `${rest.length + (featured ? 1 : 0)} ${rest.length + (featured ? 1 : 0) === 1 ? "demo" : "demos"}`;

  setupReveal();
}

function setupReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

function renderError() {
  els.skeleton.style.display = "none";
  els.empty.style.display = "";
  els.empty.innerHTML = `
    <div class="big">The wall is offline.</div>
    <p>The demo feed could not be loaded. Check the network and try again.</p>
    <button class="btn" id="retry">Try again</button>
  `;
  document.getElementById("retry").addEventListener("click", () => location.reload());
}

async function load() {
  els.skeleton.style.display = "";
  els.wallGrid.style.display = "none";
  try {
    state.demos = (await api("/demos")) || [];
    // Read initial category from the URL.
    const params = new URLSearchParams(location.search);
    const cat = params.get("cat");
    if (cat) {
      state.category = cat;
      document.querySelectorAll("#chips .chip").forEach((c) => {
        if (c.dataset.cat === cat) c.classList.add("is-active");
      });
    }
  } catch (err) {
    console.error(err);
    renderError();
    return;
  }
  els.skeleton.style.display = "none";
  renderWall();
}

document.addEventListener("DOMContentLoaded", load);