(function () {
  "use strict";

  const bookEl = document.getElementById("book");
  const counterEl = document.getElementById("pageCount");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const topPageInfo = document.getElementById("topPageInfo");
  const slider = document.getElementById("pageSlider");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const gridBtn = document.getElementById("gridBtn");
  const thumbGrid = document.getElementById("thumbGrid");
  const thumbGridInner = document.getElementById("thumbGridInner");
  const thumbClose = document.getElementById("thumbClose");
  const bookWrap = document.getElementById("book-wrap");

  const DOC_TITLE = "Val Verde USD  ·  A/V Equipment Catalog  ·  2026–2027";

  function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ---------- content renderers ----------
  function renderCover() {
    return `
      <div class="page-inner">
        <img class="logo" src="images/vvusd-logo.png" alt="VVUSD logo">
        <div class="district">VAL VERDE UNIFIED SCHOOL DISTRICT</div>
        <div class="title">AUDIO / VIDEO<br>EQUIPMENT<br>CATALOG</div>
        <div class="subtitle">A Resource Guide for Educators</div>
        <div class="catline">AUDIO&nbsp;&nbsp;|&nbsp;&nbsp;VIDEO&nbsp;&nbsp;|&nbsp;&nbsp;PERIPHERALS&nbsp;&nbsp;|&nbsp;&nbsp;MISCELLANEOUS</div>
        <div class="byline">Created by Jonathan Nuñez — Media Arts TOSA</div>
      </div>`;
  }

  function renderBlank() {
    return `<div class="page-inner"></div>`;
  }

  function pageIndexForCategory(cat) {
    return PAGES.findIndex((p) => p.type === "divider" && p.title === cat);
  }

  function renderToc() {
    const rows = PAGES.filter((p) => p.type === "divider")
      .map((p) => {
        const idx = pageIndexForCategory(p.title);
        return `<div class="toc-row" data-jump="${idx}">
          <span class="toc-name">${esc(p.title)}</span>
          <span class="toc-count">${p.count} items</span>
          <span class="toc-page">Page ${idx + 1}</span>
        </div>`;
      })
      .join("");
    return `
      <div class="page-inner">
        <div class="doc-title">${DOC_TITLE}</div>
        <div class="toc-title">Table of Contents</div>
        <hr class="toc-rule">
        ${rows}
      </div>`;
  }

  function renderDivider(p) {
    return `
      <div class="page-inner">
        <div class="div-title">${esc(p.title)}</div>
        <hr class="div-rule">
        <div class="div-count">${p.count} ITEM${p.count === 1 ? "" : "S"}</div>
      </div>`;
  }

  function cleanPrice(raw) {
    if (!raw) return "";
    return raw.replace(/\s*ea\.?\s*$/i, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  }

  function linkRow(url, label) {
    if (!url) return "";
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
  }

  function renderItems(p) {
    const rows = p.items
      .map((it) => {
        const img = it.img
          ? `<img src="${esc(it.img)}" alt="${esc(it.item)}" loading="lazy">`
          : "";
        const parts = it.item.split(" — ");
        const name = parts[0];
        const sub = parts.slice(1).join(" — ");
        return `<tr>
          <td class="col-photo">${img}</td>
          <td class="col-qty">${esc(String(it.qty || 1))}</td>
          <td class="col-item"><div class="ti-name">${esc(name)}</div>${sub ? `<div class="ti-sub">${esc(sub)}</div>` : ""}</td>
          <td class="col-desc"><div class="desc-clamp">${esc(it.desc)}</div></td>
          <td class="col-price">${esc(cleanPrice(it.price))}</td>
          <td class="col-links">
            ${linkRow(it.bh, "B&amp;H")}
            ${linkRow(it.markertek, "MarkerTek")}
            ${linkRow(it.amazon, "Amazon")}
          </td>
        </tr>`;
      })
      .join("");
    return `
      <div class="page-inner">
        <div class="doc-title">${DOC_TITLE}</div>
        <table class="item-table"><tbody>${rows}</tbody></table>
      </div>`;
  }

  function renderPageContent(idx) {
    const p = PAGES[idx];
    let cls = "";
    let html = "";
    switch (p.type) {
      case "cover": cls = "cover-face"; html = renderCover(); break;
      case "blank": cls = "blank-face"; html = renderBlank(); break;
      case "toc": html = renderToc(); break;
      case "divider": cls = "divider-face"; html = renderDivider(p); break;
      case "items": html = renderItems(p); break;
    }
    return { cls, html };
  }

  // ---------- leaf packing ----------
  const N = PAGES.length; // always even
  const LEAF_COUNT = N / 2;

  function buildLeafEl(leafIdx) {
    const frontIdx = leafIdx * 2;
    const backIdx = leafIdx * 2 + 1;
    const leaf = document.createElement("div");
    leaf.className = "leaf";
    leaf.dataset.id = String(leafIdx);

    const front = renderPageContent(frontIdx);
    const back = renderPageContent(backIdx);

    const frontFace = document.createElement("div");
    frontFace.className = "face front " + front.cls;
    frontFace.innerHTML = front.html + `<div class="page-num">${frontIdx + 1}</div>`;

    const backFace = document.createElement("div");
    backFace.className = "face back " + back.cls;
    backFace.innerHTML = back.html + `<div class="page-num">${backIdx + 1}</div>`;

    leaf.appendChild(frontFace);
    leaf.appendChild(backFace);
    return leaf;
  }

  const leafEls = [];
  for (let i = 0; i < LEAF_COUNT; i++) {
    const el = buildLeafEl(i);
    bookEl.appendChild(el);
    leafEls.push(el);
  }

  // Two explicit piles (this matters once each leaf has two faces):
  // unflipped[0]      = next leaf to flip (topmost of the right/unflipped pile)
  // flipped[flipped.length-1] = most recently flipped leaf (topmost of the left/flipped pile)
  let unflipped = Array.from({ length: LEAF_COUNT }, (_, i) => i);
  let flipped = [];
  let animating = false;

  function applyZIndex() {
    const base = LEAF_COUNT + 10;
    unflipped.forEach((leafId, i) => {
      leafEls[leafId].style.zIndex = String(base - i);
    });
    flipped.forEach((leafId, i) => {
      // most recently flipped (last in array) must be highest among the flipped pile
      leafEls[leafId].style.zIndex = String(base - (flipped.length - 1 - i));
    });
  }
  applyZIndex();

  function currentFrontPage() {
    return unflipped.length ? unflipped[0] * 2 : N; // right-hand page currently showing
  }

  function updateUI() {
    const frontPage = currentFrontPage();
    const displayNum = Math.min(frontPage + 1, N);
    counterEl.textContent = `${displayNum} / ${N}`;
    slider.max = String(N - 1);
    slider.value = String(Math.min(frontPage, N - 1));
    prevBtn.disabled = flipped.length === 0;
    nextBtn.disabled = unflipped.length === 0;
    const p = PAGES[Math.min(frontPage, N - 1)];
    topPageInfo.textContent = p.type === "items" ? p.category
      : p.type === "divider" ? p.title
      : p.type === "toc" ? "Table of Contents"
      : p.type === "cover" ? "Cover" : "";
  }
  updateUI();

  function next() {
    if (animating || unflipped.length === 0) return;
    animating = true;
    const frontId = unflipped[0];
    const el = leafEls[frontId];
    el.style.zIndex = "9999";
    requestAnimationFrame(() => {
      el.style.transform = "rotateY(-180deg)";
    });
    setTimeout(() => {
      unflipped.shift();
      flipped.push(frontId);
      applyZIndex();
      updateUI();
      animating = false;
    }, 860);
  }

  function prev() {
    if (animating || flipped.length === 0) return;
    animating = true;
    const backId = flipped[flipped.length - 1];
    const el = leafEls[backId];
    el.style.zIndex = "9999";
    requestAnimationFrame(() => {
      el.style.transform = "rotateY(0deg)";
    });
    setTimeout(() => {
      flipped.pop();
      unflipped.unshift(backId);
      applyZIndex();
      updateUI();
      animating = false;
    }, 860);
  }

  function jumpToPage(targetPage) {
    targetPage = Math.max(0, Math.min(N - 1, targetPage));
    const turned = Math.floor((targetPage + 1) / 2);
    if (turned === (unflipped.length ? unflipped[0] : LEAF_COUNT)) return;

    unflipped = [];
    for (let i = turned; i < LEAF_COUNT; i++) unflipped.push(i);
    flipped = [];
    for (let i = 0; i < turned; i++) flipped.push(i);

    leafEls.forEach((el, id) => {
      el.style.transition = "none";
      el.style.transform = id < turned ? "rotateY(-180deg)" : "rotateY(0deg)";
    });
    void bookEl.offsetWidth;
    leafEls.forEach((el) => { el.style.transition = ""; });
    applyZIndex();
    updateUI();
  }

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  document.querySelectorAll(".nav-zone").forEach((zone) => {
    zone.addEventListener("click", () => {
      zone.classList.contains("left") ? prev() : next();
    });
  });

  bookEl.addEventListener("click", (e) => {
    const jumpEl = e.target.closest("[data-jump]");
    if (jumpEl) {
      const idx = parseInt(jumpEl.dataset.jump, 10);
      if (!Number.isNaN(idx)) jumpToPage(idx);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (thumbGrid.classList.contains("open")) return;
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
  });

  let touchStartX = null;
  bookEl.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  bookEl.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });

  slider.addEventListener("input", () => {
    jumpToPage(parseInt(slider.value, 10));
  });

  // ---------- zoom ----------
  let zoom = 1;
  function applyZoom() {
    bookWrap.style.transform = `scale(${zoom})`;
  }
  zoomInBtn.addEventListener("click", () => { zoom = Math.min(2, zoom + 0.2); applyZoom(); });
  zoomOutBtn.addEventListener("click", () => { zoom = Math.max(1, zoom - 0.2); applyZoom(); });

  // ---------- fullscreen ----------
  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });

  // ---------- thumbnail grid ----------
  function buildThumbGrid() {
    let html = "";
    for (let i = 0; i < N; i++) {
      const p = PAGES[i];
      const label = p.type === "items" ? p.category
        : p.type === "divider" ? p.title
        : p.type === "toc" ? "Contents"
        : p.type === "cover" ? "Cover" : "";
      const bg = (p.type === "cover" || p.type === "divider" || p.type === "blank") ? "#1b3a6b" : "#fff";
      const color = (p.type === "cover" || p.type === "divider" || p.type === "blank") ? "#fff" : "#333";
      html += `<div class="thumb-card" data-jump-thumb="${i}" style="background:${bg};color:${color};align-items:center;justify-content:center;display:flex;text-align:center;padding:6px;">
        <div>${esc(label)}</div>
        <span class="thumb-num">${i + 1}</span>
      </div>`;
    }
    thumbGridInner.innerHTML = html;
  }
  buildThumbGrid();

  gridBtn.addEventListener("click", () => {
    thumbGrid.classList.add("open");
  });
  thumbClose.addEventListener("click", () => {
    thumbGrid.classList.remove("open");
  });
  thumbGridInner.addEventListener("click", (e) => {
    const card = e.target.closest("[data-jump-thumb]");
    if (!card) return;
    const idx = parseInt(card.dataset.jumpThumb, 10);
    thumbGrid.classList.remove("open");
    setTimeout(() => jumpToPage(idx), 50);
  });
})();
