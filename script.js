(function () {
  const C = window.CONFIG;
  const DEMO = !C.scriptUrl;
  const $ = (s) => document.querySelector(s);

  // ---------- safe storage ----------
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- fill text ----------
  const date = new Date(C.date);
  const dateLong = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
  const time = "в " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const values = {
    name: C.name,
    dateLong: dateLong.charAt(0).toUpperCase() + dateLong.slice(1),
    time,
    invitedLine: C.invitedLine,
    title: C.title,
    age: C.age,
    quoteQ: C.quote ? `«${C.quote}»` : "",
    dateLine: C.dateLine,
    placeLine: `${C.place.title}, ${C.place.address}`,
    placeTitle: C.place.title,
    placeAddress: C.place.address,
    dressCode: C.dressCode,
    rsvpDeadline: C.rsvpDeadline,
    initial: C.name.charAt(0),
  };
  document.querySelectorAll("[data-bind]").forEach((el) => { el.textContent = values[el.dataset.bind] ?? ""; });
  document.title = C.title;
  $("#map-link").href = C.place.mapUrl;
  if (!C.dressCode) $("#dress-card").remove();
  const contact = $("#contact-link");
  contact.href = C.contact.url;
  contact.textContent = C.contact.label;
  if (DEMO) $("#demo-banner").hidden = false;

  // ---------- music ----------
  const audio = $("#bg-music");
  const musicBtn = $("#music-btn");
  const MUSIC_VOL = 0.55;
  let fadeTimer;
  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    const start = audio.volume, steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      audio.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) { clearInterval(fadeTimer); done && done(); }
    }, 50);
  }
  function setMusicUi(playing) {
    musicBtn.classList.toggle("playing", playing);
    musicBtn.setAttribute("aria-label", playing ? "Выключить музыку" : "Включить музыку");
  }
  function startMusic() {
    if (!C.music) return;
    audio.volume = 0;
    audio.play().then(() => { setMusicUi(true); fadeTo(MUSIC_VOL, 2500); }).catch(() => setMusicUi(false));
    musicBtn.hidden = false;
  }
  if (C.music) {
    audio.src = C.music;
    musicBtn.addEventListener("click", () => {
      if (audio.paused) {
        audio.volume = 0;
        audio.play().then(() => { setMusicUi(true); fadeTo(MUSIC_VOL, 800); }).catch(() => {});
      } else {
        setMusicUi(false);
        fadeTo(0, 400, () => audio.pause());
      }
    });
  }

  // ---------- envelope ----------
  const envScreen = $("#env-screen");
  const env = $("#env");
  let opened = false;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function openEnvelope() {
    if (opened) return;
    opened = true;
    startMusic(); // must run inside the click so the browser allows sound
    const fast = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.3 : 1;
    env.classList.add("seal-off");
    $("#env-hint").classList.add("hide");
    await wait(380 * fast);
    env.classList.add("flap-open");
    await wait(750 * fast);
    env.classList.add("card-out");
    await wait(2300 * fast);
    envScreen.classList.add("done");
    document.body.classList.remove("locked");
    window.scrollTo(0, 0);
    await wait(900 * fast);
    envScreen.remove();
  }
  $("#env-seal").addEventListener("click", openEnvelope);
  env.addEventListener("click", openEnvelope);

  // ---------- countdown ----------
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    let diff = Math.max(0, date - new Date());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    $("#cd-days").textContent = d;
    $("#cd-hours").textContent = pad(h);
    $("#cd-mins").textContent = pad(m);
    $("#cd-secs").textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);

  // ---------- petals ----------
  const petals = $(".petals");
  for (let i = 0; i < 16; i++) {
    const p = document.createElement("span");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDuration = 9 + Math.random() * 10 + "s";
    p.style.animationDelay = -Math.random() * 18 + "s";
    p.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
    const size = 8 + Math.random() * 10;
    p.style.width = p.style.height = size + "px";
    petals.appendChild(p);
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- API ----------
  async function api(payload) {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 400));
      if (payload.action === "reserve") {
        const r = store.get("demo_reserved", []);
        if (r.includes(payload.giftId)) return { ok: false, error: "taken" };
        r.push(payload.giftId);
        store.set("demo_reserved", r);
      }
      if (payload.action === "rsvp") {
        const list = store.get("demo_rsvp", []);
        list.push(payload);
        store.set("demo_rsvp", list);
      }
      return { ok: true };
    }
    // text/plain avoids CORS preflight, which Apps Script does not support
    const res = await fetch(C.scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function loadGifts() {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 500));
      return { wishlist: C.wishlist, reserved: store.get("demo_reserved", []) };
    }
    const res = await fetch(C.scriptUrl);
    const data = await res.json();
    if (!data.ok) throw new Error();
    return data;
  }

  // Ссылку «поделиться» из Google Drive превращаем в прямую картинку
  function imageUrl(src) {
    if (!src) return "";
    const m = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([\w-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : src;
  }

  // ---------- wishlist ----------
  const grid = $("#wishlist-grid");
  const mine = new Set(store.get("my_gifts", []));
  let reserved = new Set();
  let gifts = [];

  function renderSkeleton() {
    grid.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const s = document.createElement("div");
      s.className = "gift skeleton";
      s.innerHTML = '<div class="gift-img"></div><div class="gift-body"><span></span><span></span><span></span></div>';
      grid.appendChild(s);
    }
  }

  function renderMessage(text, retry) {
    grid.innerHTML = "";
    const p = document.createElement("div");
    p.className = "wishlist-msg";
    p.textContent = text;
    if (retry) {
      const b = document.createElement("button");
      b.className = "btn btn-ghost btn-sm";
      b.textContent = "Обновить";
      b.onclick = refreshGifts;
      p.appendChild(document.createElement("br"));
      p.appendChild(b);
    }
    grid.appendChild(p);
  }

  async function refreshGifts() {
    renderSkeleton();
    try {
      const data = await loadGifts();
      gifts = data.wishlist || [];
      reserved = new Set(data.reserved || []);
      if (!gifts.length) renderMessage("Вишлист скоро появится 🎀");
      else renderGifts();
    } catch {
      renderMessage("Не удалось загрузить вишлист.", true);
    }
  }

  function renderGifts() {
    grid.innerHTML = "";
    gifts.forEach((g) => {
      const isReserved = reserved.has(g.id);
      const card = document.createElement("article");
      card.className = "gift reveal in" + (isReserved ? " reserved" : "");
      card.innerHTML = `
        <div class="gift-img"></div>
        <div class="gift-body">
          <h3 class="gift-title"></h3>
          <p class="gift-note"></p>
          <p class="gift-price"></p>
          <div class="gift-actions"></div>
        </div>`;
      const img = imageUrl(g.image);
      if (img) card.querySelector(".gift-img").style.backgroundImage = `url("${img.replace(/["\\\n]/g, encodeURIComponent)}")`;
      else card.querySelector(".gift-img").classList.add("no-img");
      card.querySelector(".gift-title").textContent = g.title;
      card.querySelector(".gift-note").textContent = g.note || "";
      card.querySelector(".gift-price").textContent = g.price || "";
      const actions = card.querySelector(".gift-actions");

      if (isReserved) {
        const b = document.createElement("span");
        b.className = "gift-badge";
        b.textContent = mine.has(g.id) ? "Ты выбрал(а) этот подарок ✓" : "Уже кто-то выбрал";
        actions.appendChild(b);
      } else {
        const btn = document.createElement("button");
        btn.className = "btn btn-primary btn-sm";
        btn.textContent = "Забронировать";
        btn.onclick = () => openReserve(g);
        actions.appendChild(btn);
      }
      grid.appendChild(card);
    });
  }

  const modal = $("#reserve-modal");
  const reserveForm = $("#reserve-form");
  let currentGift = null;

  function openReserve(g) {
    currentGift = g;
    $("#reserve-gift-name").textContent = g.title;
    reserveForm.who.value = store.get("guest_name", "");
    modal.showModal();
    reserveForm.who.focus();
  }
  $("#reserve-cancel").onclick = () => modal.close();

  reserveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const who = reserveForm.who.value.trim();
    if (!who) { reserveForm.who.classList.add("invalid"); return; }
    reserveForm.who.classList.remove("invalid");
    const btn = reserveForm.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api({ action: "reserve", giftId: currentGift.id, giftTitle: currentGift.title, who });
      if (res.ok) {
        mine.add(currentGift.id);
        store.set("my_gifts", [...mine]);
        store.set("guest_name", who);
        reserved.add(currentGift.id);
        toast("Подарок забронирован 💝");
      } else if (res.error === "taken") {
        reserved.add(currentGift.id);
        toast("Ой, этот подарок уже успели забронировать");
      } else {
        toast("Не получилось, попробуй ещё раз");
      }
    } catch {
      toast("Нет связи, попробуй ещё раз");
    }
    btn.disabled = false;
    modal.close();
    renderGifts();
  });

  refreshGifts();

  // ---------- RSVP ----------
  const form = $("#rsvp-form");
  const status = $("#form-status");
  const guestsField = $("#guests-field");

  form.addEventListener("change", () => {
    guestsField.style.display = form.attending.value === "yes" ? "" : "none";
  });
  if (store.get("guest_name", "")) form.name.value = store.get("guest_name", "");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) {
      form.name.classList.add("invalid");
      form.name.focus();
      status.className = "form-status err";
      status.textContent = "Напиши, пожалуйста, своё имя";
      return;
    }
    form.name.classList.remove("invalid");
    const attending = form.attending.value;
    const payload = {
      action: "rsvp",
      name,
      attending: attending === "yes" ? "Да" : "Нет",
      guests: attending === "yes" ? Number(form.guests.value) : 0,
      comment: form.comment.value.trim(),
    };
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    status.className = "form-status";
    status.textContent = "Отправляем…";
    try {
      const res = await api(payload);
      if (!res.ok) throw new Error();
      store.set("guest_name", name);
      status.className = "form-status ok";
      status.textContent = attending === "yes" ? "Ура! Жду тебя 💕" : "Спасибо, что ответил(а)! Будем скучать";
      form.comment.value = "";
    } catch {
      status.className = "form-status err";
      status.textContent = "Не получилось отправить. Попробуй ещё раз.";
    }
    btn.disabled = false;
  });

  // ---------- reveal on scroll ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".section-title, .section-sub, .detail-card, .rsvp-form").forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
})();
