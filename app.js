(function () {
  "use strict";

  const bookEl = document.getElementById("book");
  const counterEl = document.getElementById("counter");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const topPageInfo = document.getElementById("topPageInfo");

  const N = PAGES.length;
  let order = Array.from({ length: N }, (_, i) => i); // order[0] = current frontmost page id
  let animating = false;

  function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderCover(p) {
    return `
      <div class="page-inner">
        <img class="logo" src="images/vvusd-logo.png" alt="VVUSD logo">
        <div class="district">VAL VERDE UNIFIED SCHOOL DISTRICT</div>
        <div class="title">AUDIO / VIDEO</div>
        <div class="title">EQUIPMENT</div>
        <div class="title">CATALOG</div>
        <div class="subtitle">A Resource Guide for Educators</div>
        <div class="catline">AUDIO&nbsp;&nbsp;|&nbsp;&nbsp;VIDEO&nbsp;&nbsp;|&nbsp;&nbsp;PERIPHERALS&nbsp;&nbsp;|&nbsp;&nbsp;MISCELLANEOUS</div>
        <div class="byline">Created by Jonathan Nuñez — Media Arts TOSA</div>
      </div>`;
  }

  function renderBackCover() {
    return `
      <div class="page-inner">
        <div></div>
        <div>
          <div class="bc-title">End of Catalog</div>
          <div class="bc-note">2026–2027 · Val Verde Unified School District</div>
        </div>
        <div class="bc-footer">Prices and availability subject to change. Verify current pricing before purchase.</div>
      </div>`;
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

  function linkBtn(url, label, cls) {
    if (!url) return "";
    return `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
  }

  function renderItems(p) {
    const cards = p.items
      .map((it) => {
        const img = it.img
          ? `<img src="${esc(it.img)}" alt="${esc(it.item)}" loading="lazy">`
          : `<div style="height:64px;background:#fafafa;border-radius:3px;margin-bottom:4px;"></div>`;
        return `
          <div class="item-card">
            ${img}
            <div class="item-name">${esc(it.item)}</div>
            <div class="item-desc">${esc(it.desc)}</div>
            <div class="item-bottom">
              <span class="item-price">${esc(it.price || "")}</span>
              <span class="item-links">
                ${linkBtn(it.bh, "B&H", "bh")}
                ${linkBtn(it.markertek, "MT", "markertek")}
                ${linkBtn(it.amazon, "AMZ", "amazon")}
              </span>
            </div>
          </div>`;
      })
      .join("");
    return `
      <div class="page-inner">
        <div class="cat-tag">${esc(p.category)}</div>
        <div class="item-grid">${cards}</div>
      </div>`;
  }

  function buildPageEl(p, idx) {
    const el = document.createElement("div");
    el.className = "page " + p.type;
    el.dataset.id = String(idx);
    let inner = "";
    switch (p.type) {
      case "cover": inner = renderCover(p); break;
      case "toc": inner = renderToc(); break;
      case "divider": inner = renderDivider(p); break;
      case "items": inner = renderItems(p); break;
      case "backcover": inner = renderBackCover(); break;
    }
    el.innerHTML = inner + `<div class="page-footer">${idx + 1} / ${N}</div>`;
    return el;
  }

  const pageEls = PAGES.map((p, i) => {
    const el = buildPageEl(p, i);
    bookEl.appendChild(el);
    return el;
  });

  function applyZIndex() {
    order.forEach((pageId, i) => {
      pageEls[pageId].style.zIndex = String(order.length - i);
    });
  }
  applyZIndex();

  function updateUI() {
    const frontId = order[0];
    counterEl.textContent = `Page ${frontId + 1} of ${N}`;
    prevBtn.disabled = frontId === 0;
    nextBtn.disabled = frontId === N - 1;
    const p = PAGES[frontId];
    topPageInfo.textContent = p.type === "items" ? p.category
      : p.type === "divider" ? p.title
      : p.type === "toc" ? "Table of Contents"
      : p.type === "cover" ? "Cover"
      : "";
  }
  updateUI();

  function next() {
    if (animating || order[0] === N - 1) return;
    animating = true;
    const frontId = order[0];
    const el = pageEls[frontId];
    el.style.zIndex = "9999";
    el.style.transition = "transform 0.65s cubic-bezier(.4,.1,.2,1)";
    requestAnimationFrame(() => {
      el.style.transform = "rotateY(-180deg)";
    });
    setTimeout(() => {
      order.push(order.shift());
      applyZIndex();
      updateUI();
      animating = false;
    }, 660);
  }

  function prev() {
    if (animating || order[0] === 0) return;
    animating = true;
    const backId = order[order.length - 1];
    order.unshift(order.pop());
    const el = pageEls[backId];
    el.style.transition = "none";
    el.style.zIndex = "9999";
    el.style.transform = "rotateY(-180deg)";
    void el.offsetWidth; // force reflow
    el.style.transition = "transform 0.65s cubic-bezier(.4,.1,.2,1)";
    requestAnimationFrame(() => {
      el.style.transform = "rotateY(0deg)";
    });
    setTimeout(() => {
      applyZIndex();
      updateUI();
      animating = false;
    }, 660);
  }

  function jumpTo(targetIdx) {
    if (animating || targetIdx === order[0]) return;
    // Rebuild order instantly: target and everything before it "flipped" (rotateY -180 pile order),
    // target becomes front (rotateY 0), rest behind in original order.
    const before = [];
    for (let i = 0; i < N; i++) if (i < targetIdx) before.push(i);
    const after = [];
    for (let i = targetIdx; i < N; i++) after.push(i);
    const newOrder = after.concat(before);
    order = newOrder;
    pageEls.forEach((el, id) => {
      el.style.transition = "none";
      el.style.transform = id < targetIdx ? "rotateY(-180deg)" : "rotateY(0deg)";
    });
    void bookEl.offsetWidth;
    applyZIndex();
    updateUI();
  }

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  document.getElementById("book-wrap").addEventListener("click", (e) => {
    const zone = e.target.closest(".nav-zone");
    if (!zone) return;
    if (zone.classList.contains("left")) prev();
    else next();
  });

  bookEl.addEventListener("click", (e) => {
    const jumpEl = e.target.closest("[data-jump]");
    if (jumpEl) {
      const idx = parseInt(jumpEl.dataset.jump, 10);
      if (!Number.isNaN(idx)) jumpTo(idx);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
  });

  // basic touch swipe support
  let touchStartX = null;
  bookEl.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  bookEl.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });
})();
