// DEMOWALL · admin.js
// Password-protected panel: login, list, editor, thumbnail upload, reorder.

import { api, youtubeId, ytThumb, slugify } from "./api.js";

const TOKEN_KEY = "demowall_admin_token";

const $ = (id) => document.getElementById(id);

const views = {
  login: $("login-view"),
  dash: $("dash-view"),
  editor: $("editor-view"),
};

const state = {
  token: sessionStorage.getItem(TOKEN_KEY) || "",
  demos: [],
  editingId: null,
  customThumb: null,
  search: "",
};

function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("err", isError);
  t.classList.add("is-visible");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("is-visible"), 2600);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function adminApi(action, body, method = "POST") {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return fetch(
    `/api/admin?action=${encodeURIComponent(action)}`,
    { method, headers, body: body ? JSON.stringify(body) : undefined }
  ).then(async (res) => {
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (res.status === 401) {
      state.token = "";
      sessionStorage.removeItem(TOKEN_KEY);
      showView("login");
      throw new Error("Session expired. Sign in again.");
    }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  });
}

function thumbFor(demo, fallbackQuality = "maxresdefault") {
  if (demo.thumbnail && demo.thumbnail.custom) {
    return `/api/demos?thumb=${encodeURIComponent(demo.thumbnail.custom.key)}`;
  }
  return ytThumb(demo.videoId || youtubeId(demo.youtubeUrl), fallbackQuality);
}

/* ---- Views -------------------------------------------------------------------- */

function showView(name) {
  views.login.hidden = name !== "login";
  views.dash.hidden = name !== "dash";
  views.editor.hidden = name !== "editor";
}

/* ---- Login --------------------------------------------------------------------- */

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("password").value;
  $("login-err").textContent = "";
  $("login-btn").disabled = true;
  try {
    const res = await adminApi("login", { password });
    state.token = res.token;
    sessionStorage.setItem(TOKEN_KEY, res.token);
    $("password").value = "";
    await loadList();
    showView("dash");
  } catch (err) {
    $("login-err").textContent = err.message;
  } finally {
    $("login-btn").disabled = false;
  }
});

$("logout-btn").addEventListener("click", () => {
  state.token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  showView("login");
});

/* ---- Dashboard ------------------------------------------------------------------- */

async function loadList() {
  $("status-dot").classList.remove("off");
  $("status-text").textContent = "connecting…";
  try {
    state.demos = (await adminApi("list", null, "GET")) || [];
    $("status-dot").classList.remove("off");
    $("status-text").textContent = "connected";
    renderList();
    fillCategoryDatalist();
  } catch (err) {
    $("status-dot").classList.add("off");
    $("status-text").textContent = "offline";
    toast(err.message, true);
  }
}

function sortedDemos() {
  return [...state.demos].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function renderList() {
  const list = $("demo-list");
  const q = state.search.trim().toLowerCase();
  const demos = sortedDemos().filter((d) => {
    if (!q) return true;
    return [d.title, d.company, d.category, d.event, d.personName, (d.tags || []).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  list.innerHTML = "";
  $("admin-empty").style.display = demos.length ? "none" : "";

  demos.forEach((d, i) => rowEl(d, i, demos.length, list));
}

function rowEl(demo, index, total, list) {
  const row = document.createElement("div");
  row.className = "demo-row";
  row.dataset.id = demo.id;

  const thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.loading = "lazy";
  thumb.alt = "";
  thumb.src = thumbFor(demo, "hqdefault");
  thumb.onerror = () => {
    if (thumb.src.includes("maxresdefault")) thumb.src = thumbFor(demo, "hqdefault");
    else {
      thumb.replaceWith(Object.assign(document.createElement("div"), { className: "thumb blank", innerHTML: `<i class="ph ph-video"></i>` }));
    }
  };

  const info = document.createElement("div");
  info.className = "info";
  const badges = [
    demo.published === false ? "" : '<span class="badge on">live</span>',
    demo.featured ? '<span class="badge">featured</span>' : "",
  ].join("");
  const person = demo.personName ? ` · ${escapeHtml(demo.personName)}` : "";
  info.innerHTML = `
    <div class="t">
      <b>${escapeHtml(demo.title || "Untitled")}</b>
      ${badges}
    </div>
    <div class="s">${escapeHtml(demo.company || "Field notes")} · ${escapeHtml(demo.category || "uncategorised")} · ${escapeHtml(demo.event || "no event")}${escapeHtml(person)}</div>
  `;

  const ops = document.createElement("div");
  ops.className = "ops";

  const order = document.createElement("div");
  order.className = "order";
  const up = document.createElement("button");
  up.type = "button";
  up.title = "Move up";
  up.innerHTML = `<i class="ph ph-caret-up" aria-hidden="true"></i>`;
  up.disabled = index === 0;
  up.addEventListener("click", () => move(demo.id, -1));
  const down = document.createElement("button");
  down.type = "button";
  down.title = "Move down";
  down.innerHTML = `<i class="ph ph-caret-down" aria-hidden="true"></i>`;
  down.disabled = index === total - 1;
  down.addEventListener("click", () => move(demo.id, 1));
  order.append(up, down);

  const edit = iconBtn("pencil", "Edit", () => openEditor(demo.id));
  const publish = iconBtn(demo.published === false ? "eye-slash" : "eye", demo.published === false ? "Publish" : "Unpublish", () => toggleFlag(demo.id, "published"));
  const feat = iconBtn("star", demo.featured ? "Remove from featured" : "Make featured", () => toggleFlag(demo.id, "featured"));
  const del = iconBtn("trash", "Delete", () => remove(demo.id), true);

  ops.append(order, edit, publish, feat, del);
  row.append(thumb, info, ops);
  list.appendChild(row);
}

function iconBtn(icon, title, onClick, danger = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn-icon${danger ? " btn-danger" : ""}`;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.innerHTML = `<i class="ph ph-${icon}" aria-hidden="true"></i>`;
  b.addEventListener("click", onClick);
  return b;
}

$("refresh-btn").addEventListener("click", loadList);
$("search").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderList();
});

$("new-btn").addEventListener("click", () => openEditor(null));

async function move(id, dir) {
  const sorted = sortedDemos();
  const idx = sorted.findIndex((d) => d.id === id);
  const target = sorted[idx + dir];
  if (!target) return;
  const a = sorted[idx];
  const b = target;
  const ta = a.sortOrder || 0;
  const tb = b.sortOrder || 0;
  try {
    await Promise.all([
      adminApi("save", { demo: { ...a, sortOrder: tb } }),
      adminApi("save", { demo: { ...b, sortOrder: ta } }),
    ]);
    await loadList();
  } catch (err) {
    toast(err.message, true);
  }
}

async function toggleFlag(id, flag) {
  const d = state.demos.find((x) => x.id === id);
  if (!d) return;
  const patch = { ...d, [flag]: flag === "published" ? d.published === false : !d.featured };
  if (flag === "published") patch.published = d.published === false;
  try {
    await adminApi("save", { demo: patch });
    await loadList();
  } catch (err) {
    toast(err.message, true);
  }
}

async function remove(id) {
  const d = state.demos.find((x) => x.id === id);
  if (!confirm(`Delete "${d?.title || id}"? This cannot be undone.`)) return;
  try {
    await adminApi("delete", { id });
    state.demos = state.demos.filter((x) => x.id !== id);
    renderList();
    toast("Deleted");
  } catch (err) {
    toast(err.message, true);
  }
}

function fillCategoryDatalist() {
  const cats = [...new Set(state.demos.map((d) => d.category).filter(Boolean))].sort();
  $("cat-list").innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
}

/* ---- Editor --------------------------------------------------------------------- */

async function openEditor(idOrNull) {
  const isNew = !idOrNull;
  state.editingId = isNew ? null : idOrNull;
  state.customThumb = null;

  const demo = isNew
    ? { title: "", company: "", companyUrl: "", tagline: "", category: "", tags: [], event: "", capturedAt: "", personName: "", personRole: "", youtubeUrl: "", description: "", notes: "", recordedBy: "tech demo enthusiasts", featured: false, published: false, sortOrder: nextSort() }
    : { ...state.demos.find((d) => d.id === idOrNull) };

  $("editor-title").textContent = isNew ? "New demo" : "Edit demo";
  $("f-title").value = demo.title || "";
  $("f-company").value = demo.company || "";
  $("f-event").value = demo.event || "";
  $("f-tagline").value = demo.tagline || "";
  $("f-description").value = demo.description || "";
  $("f-notes").value = demo.notes || "";
  $("f-youtube").value = demo.youtubeUrl || "";
  $("f-person").value = demo.personName || "";
  $("f-role").value = demo.personRole || "";
  $("f-company-url").value = demo.companyUrl || "";
  $("f-category").value = demo.category || "";
  $("f-captured").value = demo.capturedAt || "";
  $("f-tags").value = (demo.tags || []).join(", ");
  $("f-recorded-by").value = demo.recordedBy || "tech demo enthusiasts";
  $("f-published").checked = demo.published !== false;
  $("f-featured").checked = !!demo.featured;
  $("f-sort").value = demo.sortOrder || 0;
  if (demo.thumbnail && demo.thumbnail.custom) state.customThumb = demo.thumbnail.custom;

  $("f-thumb-file").value = "";
  $("yt-hint").textContent = "";
  updateThumbPreview();
  updateEditorStatus();

  showView("editor");
  $("f-title").focus();
}

function nextSort() {
  return state.demos.reduce((m, d) => Math.max(m, d.sortOrder || 0), 0) + 10;
}

$("cancel-btn").addEventListener("click", () => {
  if (state.editingId) loadList();
  showView("dash");
});

$("editor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("save-btn");
  btn.disabled = true;
  const hint = $("save-hint");
  hint.textContent = "Saving…";
  try {
    const demo = collectForm();
    if (!youtubeId(demo.youtubeUrl)) throw new Error("A valid YouTube link is required.");
    if (state.customThumb) demo.thumbnail = { custom: state.customThumb };
    else demo.thumbnail = { custom: null };
    if (!state.editingId) {
      demo.id = slugify(demo.title) || null;
      demo.createdAt = new Date().toISOString();
    } else {
      demo.id = state.editingId;
    }
    demo.updatedAt = new Date().toISOString();
    const saved = await adminApi("save", { demo });
    state.editingId = saved.id;
    hint.textContent = `Saved. id: ${saved.id}`;
    toast("Saved");
    await loadList();
    showView("dash");
  } catch (err) {
    hint.textContent = "";
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

function collectForm() {
  return {
    title: $("f-title").value.trim(),
    company: $("f-company").value.trim(),
    event: $("f-event").value.trim(),
    tagline: $("f-tagline").value.trim(),
    description: $("f-description").value.trim(),
    notes: $("f-notes").value.trim(),
    youtubeUrl: $("f-youtube").value.trim(),
    personName: $("f-person").value.trim(),
    personRole: $("f-role").value.trim(),
    companyUrl: $("f-company-url").value.trim(),
    category: $("f-category").value.trim() || "General",
    capturedAt: $("f-captured").value || "",
    tags: $("f-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    recordedBy: $("f-recorded-by").value.trim() || "tech demo enthusiasts",
    published: $("f-published").checked,
    featured: $("f-featured").checked,
    sortOrder: Number($("f-sort").value) || 0,
  };
}

$("f-published").addEventListener("change", updateEditorStatus);
$("f-featured").addEventListener("change", updateEditorStatus);

function updateEditorStatus() {
  const published = $("f-published").checked;
  $("editor-dot").classList.toggle("off", !published);
  $("editor-status").textContent = published ? "published" : "draft";
}

/* ---- Thumbnail preview + upload ------------------------------------------------------ */

$("f-youtube").addEventListener("input", () => {
  const id = youtubeId($("f-youtube").value);
  $("yt-hint").textContent = id ? `YouTube id: ${id}` : "";
  if (id && !state.customThumb) {
    showThumb(ytThumb(id, "maxresdefault"));
  }
});

$("f-thumb-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) return toast("Image must be under 4 MB", true);
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const meta = dataUrl.match(/^data:([^;,]+);base64,(.*)$/);
  if (!meta) return toast("Unsupported image", true);
  try {
    const res = await adminApi("upload", {
      id: state.editingId || slugify($("f-title").value) || "new",
      contentType: meta[1],
      dataBase64: meta[2],
    });
    state.customThumb = res.thumb;
    toast("Image uploaded");
    updateThumbPreview();
  } catch (err) {
    toast(err.message, true);
  }
});

function showThumb(src) {
  const img = $("thumb-img");
  img.src = src;
  img.hidden = false;
  img.onerror = () => {
    if (img.src.includes("maxresdefault")) {
      img.src = src.replace("maxresdefault", "hqdefault");
    }
  };
  $("thumb-empty").hidden = true;
}

function updateThumbPreview() {
  const source = $("thumb-source");
  if (state.customThumb) {
    showThumb(`/api/demos?thumb=${encodeURIComponent(state.customThumb.key)}`);
    source.innerHTML = `Custom image · <button type="button" class="btn-link" id="clear-thumb">remove</button>`;
    document.getElementById("clear-thumb").addEventListener("click", () => {
      state.customThumb = null;
      updateThumbPreview();
    });
  } else {
    const id = youtubeId($("f-youtube").value);
    if (id) showThumb(ytThumb(id, "maxresdefault"));
    else {
      $("thumb-img").hidden = true;
      $("thumb-empty").hidden = false;
    }
    source.innerHTML = "Uses the YouTube thumbnail";
  }
}

/* ---- Boot ------------------------------------------------------------------------------ */

async function boot() {
  if (!state.token) return showView("login");
  try {
    await loadList();
    showView("dash");
  } catch {
    showView("login");
  }
}

document.addEventListener("DOMContentLoaded", boot);