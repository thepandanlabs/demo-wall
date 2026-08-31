// DEMOWALL · demo.js
// Single demo page: poster-to-player, metadata, notes, share, related.

import { api, thumbSrc, youtubeId, ytEmbedUrl, fmtDate } from "./api.js";

const params = new URLSearchParams(location.search);
const demoId = params.get("id");

const els = {
  player: document.getElementById("player"),
  companyLine: document.getElementById("company-line"),
  title: document.getElementById("demo-title"),
  tagline: document.getElementById("demo-tagline"),
  shareRow: document.getElementById("share-row"),
  description: document.getElementById("demo-description"),
  notes: document.getElementById("demo-notes"),
  notesBody: document.getElementById("demo-notes-body"),
  notesBy: document.getElementById("demo-notes-by"),
  metaList: document.getElementById("meta-list"),
  relatedGrid: document.getElementById("related-grid"),
  copiedToast: document.getElementById("copied-toast"),
};

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphHtml(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function buildPoster(demo) {
  const id = demo.videoId || youtubeId(demo.youtubeUrl);
  if (!id) return null;

  const poster = document.createElement("div");
  poster.className = "player-poster";
  const setPoster = (src) => {
    poster.style.backgroundImage = `url("${src}")`;
  };
  setPoster(thumbSrc(demo));
  if (!(demo.thumbnail && demo.thumbnail.custom)) {
    const probe = new Image();
    probe.src = thumbSrc(demo);
    probe.onerror = () => setPoster(thumbSrc(demo, "hqdefault"));
  }
  poster.setAttribute("role", "button");
  poster.setAttribute("aria-label", `Play ${demo.title}`);
  poster.tabIndex = 0;
  poster.innerHTML = `
    <span class="watch"><i class="ph ph-play-fill" aria-hidden="true"></i> Watch the demo</span>
    <span class="kicker-tag tag">${escapeHtml(demo.category || "Demo")}</span>
    <span class="play-big"><i class="ph ph-play-fill" aria-hidden="true"></i></span>
  `;

  const activate = () => {
    const iframe = document.createElement("iframe");
    iframe.src = ytEmbedUrl(id);
    iframe.title = demo.title;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    els.player.innerHTML = "";
    els.player.appendChild(iframe);
  };

  poster.addEventListener("click", activate);
  poster.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });
  return poster;
}

function buildShareRow(demo) {
  const url = encodeURIComponent(location.href);
  const text = encodeURIComponent(`${demo.title} — ${demo.company || ""} | DEMOWALL`);
  const row = document.createElement("div");
  row.className = "share-row";

  const yt = document.createElement("a");
  yt.className = "btn";
  yt.href = `https://www.youtube.com/watch?v=${demo.videoId || youtubeId(demo.youtubeUrl)}`;
  yt.target = "_blank";
  yt.rel = "noopener";
  yt.innerHTML = `<i class="ph ph-youtube-logo" aria-hidden="true"></i> YouTube`;

  const linkedin = document.createElement("a");
  linkedin.className = "btn btn-ghost";
  linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  linkedin.target = "_blank";
  linkedin.rel = "noopener";
  linkedin.innerHTML = `<i class="ph ph-linkedin-logo" aria-hidden="true"></i> LinkedIn`;

  const xBtn = document.createElement("a");
  xBtn.className = "btn btn-ghost";
  xBtn.href = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  xBtn.target = "_blank";
  xBtn.rel = "noopener";
  xBtn.innerHTML = `<i class="ph ph-x-logo" aria-hidden="true"></i> X`;

  const copy = document.createElement("button");
  copy.className = "btn btn-ghost";
  copy.innerHTML = `<i class="ph ph-link" aria-hidden="true"></i> Copy link`;
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    els.copiedToast.classList.add("is-visible");
    setTimeout(() => els.copiedToast.classList.remove("is-visible"), 1800);
  });

  row.append(yt, linkedin, xBtn, copy);
  return row;
}

function buildMeta(demo) {
  const items = [
    ["Company", demo.companyUrl
      ? `<a href="${escapeHtml(demo.companyUrl)}" target="_blank" rel="noopener"><b>${escapeHtml(demo.company)}</b> <i class="ph ph-arrow-up-right"></i></a>`
      : `<b>${escapeHtml(demo.company || "Unknown")}</b>`],
    ["Explained by", demo.personName
      ? `<b>${escapeHtml(demo.personName)}</b>${demo.personRole ? `, ${escapeHtml(demo.personRole)}` : ""}`
      : "—"],
    ["Captured at", demo.event ? `<b>${escapeHtml(demo.event)}</b>` : "—"],
    ["Recorded", fmtDate(demo.capturedAt) || "—"],
    ["Category", `<b>${escapeHtml(demo.category || "Demo")}</b>`],
  ];

  if (demo.tags && demo.tags.length) {
    items.push([
      "Tags",
      `<div class="tags">${demo.tags.map((t) => `<a class="tag" href="/?cat=${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join("")}</div>`,
    ]);
  }

  els.metaList.innerHTML = items
    .map(
      ([k, v]) => `
        <div class="meta-row">
          <div class="k">${escapeHtml(k)}</div>
          <div class="v">${v}</div>
        </div>`
    )
    .join("");
}

function setMeta(demo) {
  document.title = `${demo.title} — DEMOWALL`;
  document.querySelector('meta[name="description"]').content =
    demo.tagline || demo.description || "";

  const setOg = (prop, content) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", prop);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  setOg("og:title", `${demo.title} · ${demo.company || "DEMOWALL"}`);
  setOg("og:description", demo.tagline || "");
  setOg("og:image", thumbSrc(demo));
  setOg("og:url", location.href);
}

function cardEl(demo) {
  const article = document.createElement("article");
  article.className = "card reveal";

  const link = document.createElement("a");
  link.className = "card-media";
  link.href = `demo.html?id=${encodeURIComponent(demo.id)}`;
  link.style.aspectRatio = "16 / 10";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = `${demo.title} by ${demo.company || "unknown"}`;
  img.src = thumbSrc(demo);
  if (!(demo.thumbnail && demo.thumbnail.custom)) {
    img.onerror = () => {
      if (img.src.includes("maxresdefault")) img.src = thumbSrc(demo, "hqdefault");
    };
  }

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = demo.category || "Demo";

  const play = document.createElement("span");
  play.className = "card-play";
  play.innerHTML = `<span class="play-ico"><i class="ph ph-play-fill" aria-hidden="true"></i></span>`;
  play.setAttribute("aria-hidden", "true");

  link.append(img, tag, play);

  const body = document.createElement("div");
  body.className = "card-body";
  const h = document.createElement("h3");
  h.className = "card-title";
  const a = document.createElement("a");
  a.href = link.href;
  a.textContent = demo.title;
  h.appendChild(a);
  const attr = document.createElement("div");
  attr.className = "card-attrib";
  attr.innerHTML = `<span>${escapeHtml(demo.company || "Field notes")}</span><span class="sep"></span><span>${escapeHtml(demo.event || "")}</span>`;
  body.append(h, attr);

  article.append(link, body);
  return article;
}

function renderError(msg) {
  els.title.textContent = "Demo not found";
  els.tagline.textContent = msg || "This demo may have been unpublished or removed from the wall.";
  document.getElementById("demo-description").innerHTML =
    `<p><a href="/">Return to the wall</a></p>`;
  document.getElementById("related").style.display = "none";
  document.querySelector(".meta-note").style.display = "none";
}

async function load() {
  if (!demoId) return renderError("No demo selected.");

  let demo;
  try {
    demo = await api(`/demos?id=${encodeURIComponent(demoId)}`);
  } catch (err) {
    return renderError();
  }

  const id = demo.videoId || youtubeId(demo.youtubeUrl);
  if (!id) return renderError("This demo has no playable video yet.");

  els.companyLine.innerHTML = `
    <span class="rec-dot" aria-hidden="true"></span>
    <span>${escapeHtml(demo.company || "Field notes")}</span>
    ${demo.event ? `<span>· ${escapeHtml(demo.event)}</span>` : ""}
  `;
  els.title.textContent = demo.title;
  els.tagline.textContent = demo.tagline || "";
  els.description.innerHTML = paragraphHtml(demo.description || demo.tagline || "");
  els.shareRow.appendChild(buildShareRow(demo));

  if (demo.notes) {
    els.notes.hidden = false;
    els.notesBody.innerHTML = paragraphHtml(demo.notes);
    els.notesBy.textContent = demo.recordedBy
      ? `Field notes by ${demo.recordedBy}`
      : "Field notes";
  }

  buildMeta(demo);
  setMeta(demo);

  els.player.innerHTML = "";
  els.player.appendChild(buildPoster(demo));

  // Related: same category first, then the rest, max 3.
  try {
    const all = (await api("/demos")) || [];
    const others = all.filter((d) => d.id !== demo.id);
    const sameCat = others.filter((d) => d.category === demo.category);
    const picked = [...sameCat, ...others.filter((d) => d.category !== demo.category)].slice(0, 3);
    const frag = document.createDocumentFragment();
    for (const d of picked) frag.appendChild(cardEl(d));
    els.relatedGrid.appendChild(frag);
    if (picked.length === 0) {
      document.getElementById("related").style.display = "none";
    }
  } catch {
    document.getElementById("related").style.display = "none";
  }

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
    { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

document.addEventListener("DOMContentLoaded", load);