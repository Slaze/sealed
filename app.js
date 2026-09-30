(function () {
  const fixture = window.SEALED_FIXTURE;
  const KEY = "sealed-state-v1";
  const state = loadState();
  const $ = (id) => document.getElementById(id);
  const views = {
    desk: $("view-desk"),
    list: $("view-list"),
    letter: $("view-letter"),
    chronicle: $("view-chronicle"),
    people: $("view-people"),
    settings: $("view-settings")
  };

  function loadState() {
    const saved = safeParse(localStorage.getItem(KEY));
    return {
      tab: "desk",
      selectedId: null,
      sheetId: null,
      filedIds: saved?.filedIds || [],
      readIds: saved?.readIds || [],
      starredIds: saved?.starredIds || [],
      chronicle: saved?.chronicle || [],
      chapterOpened: saved?.chapterOpened || null
    };
  }
  function persist() {
    localStorage.setItem(KEY, JSON.stringify({
      filedIds: state.filedIds,
      readIds: state.readIds,
      starredIds: state.starredIds,
      chronicle: state.chronicle,
      chapterOpened: state.chapterOpened
    }));
  }
  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function liveMessages() {
    return fixture.messages
      .map((m) => ({
        ...m,
        isUnread: m.isUnread && !state.readIds.includes(m.id),
        filed: state.filedIds.includes(m.id),
        starred: state.starredIds.includes(m.id)
      }))
      .filter((m) => !m.filed);
  }
  function character(id) {
    return fixture.characters.find((c) => c.id === id);
  }
  function piles() {
    const humans = liveMessages().filter((m) => m.isHuman);
    const map = new Map();
    humans.forEach((m) => {
      if (!map.has(m.characterId)) map.set(m.characterId, []);
      map.get(m.characterId).push(m);
    });
    return [...map.entries()].map(([characterId, messages]) => {
      messages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
      return { character: character(characterId), messages };
    });
  }
  function chapterFor(characterId) {
    const ch = fixture.chapters.find((c) => c.characterId === characterId);
    if (!ch) return null;
    const extra = state.chapterOpened?.[characterId] || 0;
    return { ...ch, opened: Math.min(ch.needed, ch.opened + extra) };
  }
  function formatWhen(iso) {
    const d = new Date(iso);
    const now = new Date("2026-09-30T13:00:00+01:00");
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function portraitStyle(ch) {
    return `background: hsl(${ch.hue} 28% 32%)`;
  }
  function showTab(tab) {
    state.tab = tab;
    state.sheetId = null;
    if (tab !== "letter") state.selectedId = null;
    render();
  }
  function openSheet(id) {
    state.sheetId = id;
    render();
  }
  function openLetter(id) {
    const msg = fixture.messages.find((m) => m.id === id);
    if (!msg) return;
    state.sheetId = null;
    state.selectedId = id;
    state.tab = "letter";
    if (!state.readIds.includes(id)) state.readIds.push(id);
    persist();
    render();
  }
  function fileLetter(id) {
    const msg = fixture.messages.find((m) => m.id === id);
    if (!msg) return;
    if (!state.filedIds.includes(id)) state.filedIds.push(id);
    if (!state.readIds.includes(id)) state.readIds.push(id);
    if (msg.characterId) {
      state.chapterOpened = state.chapterOpened || {};
      state.chapterOpened[msg.characterId] = (state.chapterOpened[msg.characterId] || 0) + 1;
    }
    const ch = character(msg.characterId);
    const worldLine = msg.isPromo
      ? "A flyer from the merchant caravan is pinned to the noticeboard."
      : ch
        ? `The ${ch.titleInWorld}'s seal breaks. The court records it.`
        : "The letter is filed in the archive.";
    state.chronicle.unshift({
      id: "c_" + Date.now(),
      messageId: msg.id,
      characterId: msg.characterId,
      text: worldLine,
      footnote: msg.subject + (ch ? " · " + ch.name.split(" ")[0] : ""),
      createdAt: new Date().toISOString()
    });
    persist();
    state.selectedId = null;
    state.tab = "desk";
    state.justFiled = { msg, line: worldLine };
    render();
  }
  function toggleStar(id) {
    const i = state.starredIds.indexOf(id);
    if (i >= 0) state.starredIds.splice(i, 1);
    else state.starredIds.push(id);
    persist();
    render();
  }
  function renderTabs() {
    document.querySelectorAll(".tabs button").forEach((b) => {
      b.classList.toggle("on", b.dataset.tab === state.tab || (state.tab === "list" && b.dataset.tab === "desk"));
    });
  }
  function renderDesk() {
    const harbor = chapterFor("ada");
    $("brief-text").textContent = fixture.briefing;
    $("chapter-ribbon").textContent = harbor ? `${harbor.title} ${harbor.opened}/${harbor.needed}` : "";
    $("desk-piles").innerHTML = piles().map(({ character: ch, messages }) => {
      const top = messages[0];
      const urgent = messages.some((m) => m.priority === "urgent");
      const waiting = messages.find((m) => m.waitingDays);
      return `<button class="envelope ${urgent ? "urgent" : ""}" type="button" data-open="${top.id}">
        <div class="portrait" style="${portraitStyle(ch)}">${ch.initials}</div>
        <div class="who">${ch.name.split(" ")[0]}${waiting ? `<small class="wait">waiting ${waiting.waitingDays}d</small>` : `<small>${ch.titleInWorld}</small>`}</div>
        <span class="wax"></span><span class="count">${messages.length}</span>
      </button>`;
    }).join("");
    const promos = liveMessages().filter((m) => m.isPromo);
    $("noticeboard").classList.toggle("hidden", promos.length === 0);
    $("notice-count").textContent = String(promos.length);
  }
  function renderList() {
    const q = ($("search").value || "").toLowerCase();
    const rows = liveMessages().slice().sort((a, b) => {
      const rank = (m) => (m.priority === "urgent" ? 0 : m.isPromo ? 2 : 1);
      const r = rank(a) - rank(b);
      return r !== 0 ? r : new Date(b.sentAt) - new Date(a.sentAt);
    }).filter((m) => !q || m.subject.toLowerCase().includes(q) || m.fromName.toLowerCase().includes(q) || m.fromEmail.toLowerCase().includes(q));
    $("list-rows").innerHTML = rows.map((m) => `<button class="list-row" type="button" data-open="${m.id}">
      <div class="portrait" style="width:40px;height:40px;margin:0;${m.characterId ? portraitStyle(character(m.characterId)) : "background:#5a4a3a"}">${m.isPromo ? "N" : character(m.characterId)?.initials || "?"}</div>
      <div><strong>${m.fromName}</strong><div>${m.subject}</div>
      <div class="sub">${formatWhen(m.sentAt)} · ${m.isUnread ? "sealed" : "opened"}${m.priority === "urgent" ? " · urgent" : ""}</div></div>
    </button>`).join("");
  }
  function renderSheet() {
    const wrap = $("sheet");
    if (!state.sheetId) { wrap.classList.add("hidden"); wrap.innerHTML = ""; return; }
    const m = liveMessages().find((x) => x.id === state.sheetId) || fixture.messages.find((x) => x.id === state.sheetId);
    if (!m) { wrap.classList.add("hidden"); return; }
    const ch = character(m.characterId);
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<div class="sheet">
      <div class="env-art"><div class="wax-lg">${(ch?.name || m.fromName).slice(0, 1)}</div></div>
      <div class="meta"><h3>${m.fromName}</h3><time>${formatWhen(m.sentAt)}</time></div>
      <div class="email">${m.fromEmail}</div>
      <p class="world-title">${m.isPromo ? "A flyer on the noticeboard" : ch ? `A letter from the ${ch.titleInWorld}` : "A sealed letter"}</p>
      <p class="real-sub">${m.subject}</p>
      <p class="warn">This is a real email. Opening marks it read.</p>
      <button class="primary" type="button" data-read="${m.id}">Break the seal</button>
      <button class="ghost" type="button" data-file="${m.id}">File unopened</button>
    </div>`;
  }
  function renderLetter() {
    const m = fixture.messages.find((x) => x.id === state.selectedId);
    if (!m) return;
    const ch = character(m.characterId);
    const chap = chapterFor(m.characterId);
    $("letter-portrait").style.cssText = "width:44px;height:44px;margin:0;" + (ch ? portraitStyle(ch) : "background:#5a4a3a");
    $("letter-portrait").textContent = ch ? ch.initials : "N";
    $("letter-name").textContent = ch ? `${ch.titleInWorld} ${ch.name.split(" ")[0]}` : m.fromName;
    $("letter-email").textContent = `${m.fromEmail} · ${formatWhen(m.sentAt)}`;
    $("letter-subject").textContent = m.subject;
    $("letter-body").textContent = m.body;
    $("letter-attach").classList.toggle("hidden", !m.attachment);
    if (m.attachment) $("letter-attach").textContent = m.attachment.name;
    $("star-btn").textContent = state.starredIds.includes(m.id) ? "\u2605 Starred" : "\u2606 Star";
    if (chap) {
      $("letter-chapter").textContent = `Chapter \u00b7 ${chap.title} ${chap.opened}/${chap.needed}`;
      $("letter-bar").style.width = Math.round((chap.opened / chap.needed) * 100) + "%";
    } else {
      $("letter-chapter").textContent = "Noticeboard";
      $("letter-bar").style.width = "10%";
    }
  }
  function renderChronicle() {
    const items = state.chronicle;
    $("chronicle-list").innerHTML = items.length
      ? items.map((e) => `<article class="entry"><div class="when">${new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div><p>${e.text}</p><div class="fn">${e.footnote}</div></article>`).join("")
      : `<article class="entry"><p>The book is empty. File a letter and a page will appear.</p></article>`;
  }
  function renderPeople() {
    $("people-list").innerHTML = fixture.characters.map((ch) => {
      const sealed = liveMessages().filter((m) => m.characterId === ch.id).length;
      const waiting = liveMessages().find((m) => m.characterId === ch.id && m.waitingDays);
      return `<button class="person-row" type="button" data-person="${ch.id}">
        <div class="portrait" style="width:44px;height:44px;margin:0;${portraitStyle(ch)}">${ch.initials}</div>
        <div style="flex:1"><strong>${ch.name}</strong>
        <div class="sub">${ch.titleInWorld.toUpperCase()} \u00b7 ${ch.email}</div>
        ${waiting ? `<div class="wait">waiting ${waiting.waitingDays} days</div>` : ""}</div>
        <div class="sub">${sealed} sealed</div></button>`;
    }).join("");
  }
  function renderFiledToast() {
    const wrap = $("toast");
    if (!state.justFiled) { wrap.classList.add("hidden"); wrap.innerHTML = ""; return; }
    const { msg, line } = state.justFiled;
    const chap = chapterFor(msg.characterId);
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<div class="sheet" style="background:transparent;display:flex;align-items:center;">
      <div class="toast-card" style="width:100%">
        <div class="broken">\u25C9</div>
        <h2>Letter filed in the archive.</h2>
        <p>${chap ? `${chap.title} ${chap.opened}/${chap.needed}` : "Noticeboard"}</p>
        <p><em>${line}</em></p>
        <p class="fn">${msg.subject}</p>
        <button class="primary" type="button" id="keep-reading">Keep reading</button>
        <button class="ghost" type="button" id="open-chronicle">Open chronicle</button>
      </div></div>`;
  }
  function render() {
    Object.values(views).forEach((v) => v.classList.add("hidden"));
    const tab = state.tab === "list" ? "list" : state.tab;
    if (views[tab]) views[tab].classList.remove("hidden");
    $("list-toggle").textContent = state.tab === "list" ? "Desk" : "List";
    renderTabs();
    if (tab === "desk") renderDesk();
    if (tab === "list") renderList();
    if (tab === "letter") renderLetter();
    if (tab === "chronicle") renderChronicle();
    if (tab === "people") renderPeople();
    renderSheet();
    renderFiledToast();
  }
  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab], [data-open], [data-read], [data-file], [data-person], #list-toggle, #back-letter, #file-btn, #star-btn, #keep-reading, #open-chronicle, #reset-btn, #noticeboard");
    if (!t) return;
    e.preventDefault();
    if (t.id === "list-toggle") { state.tab = state.tab === "list" ? "desk" : "list"; render(); return; }
    if (t.dataset.tab) { showTab(t.dataset.tab); return; }
    if (t.id === "noticeboard") {
      state.tab = "list"; $("search").value = ""; render();
      const promo = liveMessages().find((m) => m.isPromo);
      if (promo) openSheet(promo.id);
      return;
    }
    if (t.dataset.open) { openSheet(t.dataset.open); return; }
    if (t.dataset.read) { openLetter(t.dataset.read); return; }
    if (t.dataset.file) { fileLetter(t.dataset.file); return; }
    if (t.dataset.person) {
      const first = liveMessages().find((m) => m.characterId === t.dataset.person);
      if (first) openSheet(first.id);
      return;
    }
    if (t.id === "back-letter") { showTab("desk"); return; }
    if (t.id === "file-btn" && state.selectedId) { fileLetter(state.selectedId); return; }
    if (t.id === "star-btn" && state.selectedId) { toggleStar(state.selectedId); return; }
    if (t.id === "keep-reading") { state.justFiled = null; showTab("desk"); return; }
    if (t.id === "open-chronicle") { state.justFiled = null; showTab("chronicle"); return; }
    if (t.id === "reset-btn") { localStorage.removeItem(KEY); location.reload(); }
  });
  $("search").addEventListener("input", () => { if (state.tab === "list") renderList(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  render();
})();
