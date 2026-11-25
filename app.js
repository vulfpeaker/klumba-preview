(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NB = ' ';
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const cfg = JSON.parse($('#cfg').textContent);
  const EASE = 'cubic-bezier(.2,.8,.2,1)';

  /* ---------- splash (оверлей поверх готовой страницы) ---------- */
  const splash = $('#splash');
  if (splash && root.classList.contains('splash-on')) {
    const finish = () => { root.classList.add('splash-done'); splash.remove(); document.removeEventListener('keydown', onKey); };
    const skip = () => {
      if (splash.classList.contains('is-skip') || performance.now() > 1250) return; // уже уезжает
      root.style.setProperty('--hd', (performance.now() / 1000 + 0.1).toFixed(2) + 's');
      splash.classList.add('is-skip');
    };
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    splash.addEventListener('animationend', (e) => { if (e.target === splash && /^splash(Out|Skip)$/.test(e.animationName)) finish(); });
    $('.splash__skip', splash).addEventListener('click', skip);
    document.addEventListener('keydown', onKey);
    setTimeout(() => { if (document.body.contains(splash)) finish(); }, 3200); // страховка
  } else if (splash) splash.remove();

  /* ---------- reveal on scroll ---------- */
  const rv = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));

  /* ---------- progress line in "how it works" (scroll-linked stroke-dashoffset) ---------- */
  const prog = $('[data-prog]');
  if (prog && !reduce) {
    let tick = false;
    const upd = () => {
      tick = false;
      const r = prog.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.1)));
      prog.style.setProperty('--p', p.toFixed(3));
    };
    const req = () => { if (!tick) { tick = true; requestAnimationFrame(upd); } };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); requestAnimationFrame(upd);
  } else if (prog) prog.style.setProperty('--p', 1);

  /* ---------- odometer (transform + opacity) ---------- */
  class Odo {
    constructor(el) {
      this.el = el; this.max = String(cfg.maxPrice).length; this.nodes = []; this.len = 0;
      el.textContent = '';
      for (let j = this.max - 1; j >= 0; j--) {
        if (j % 3 === 2 && j < this.max - 1) { const s = document.createElement('span'); s.className = 'od-sep'; s.dataset.j = j; el.appendChild(s); this.nodes.push(s); }
        const d = document.createElement('span'); d.className = 'od'; d.dataset.j = j;
        const c = document.createElement('span'); c.className = 'od-col';
        for (let k = 0; k < 10; k++) { const i = document.createElement('span'); i.textContent = k; c.appendChild(i); }
        d.appendChild(c); el.appendChild(d); this.nodes.push(d);
      }
    }
    set(v, first) {
      const s = String(v), L = s.length, grow = this.len && L > this.len, shrink = this.len && L < this.len;
      this.nodes.forEach((n) => {
        const j = +n.dataset.j, isSep = n.classList.contains('od-sep');
        const hide = isSep ? j >= L - 1 : j >= L;
        const wasOff = n.classList.contains('is-off');
        if (hide) {
          if (!wasOff) {
            if (reduce || first || !shrink) n.classList.add('is-off');
            else { // уходящая цифра гаснет и уезжает вниз, затем скрывается
              const a = n.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(.4em)' }], { duration: 350, easing: EASE, fill: 'forwards' });
              a.onfinish = () => { n.classList.add('is-off'); a.cancel(); };
            }
          }
          return;
        }
        n.getAnimations && n.getAnimations().forEach((a) => a.cancel());
        if (isSep) { n.classList.remove('is-off'); return; }
        const col = n.firstChild, d = +s[L - 1 - j];
        col.style.transitionDelay = reduce ? '0s' : `${j * 45}ms`;
        if (wasOff) { // новая цифра: появляется с подъёмом, колонка докручивается от нуля
          col.style.transition = 'none'; col.style.transform = 'translateY(0)';
          n.classList.remove('is-off'); void col.offsetWidth; col.style.transition = '';
          if (!reduce && !first) n.animate([{ opacity: 0, transform: 'translateY(.45em)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: j * 45, easing: EASE, fill: 'backwards' });
        }
        col.style.transform = `translateY(${-d}em)`;
      });
      this.len = L;
    }
  }
  const odos = $$('[data-odo]').map((el) => new Odo(el));

  /* ---------- masked text (построчная маска) ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const wordsHTML = (t) => { const w = t.split(' '); return w.map((x, i) => (i === w.length - 1 && w.length > 1 ? `<span class="mw mw--em" style="--k:${i}"><span class="mw__in"><em>${esc(x)}</em></span></span>` : `<span class="mw" style="--k:${i}"><span class="mw__in">${esc(x)}</span></span>`)).join(' '); };
  const lineHTML = (t) => `<span class="mw" style="--k:2"><span class="mw__in">${esc(t)}</span></span>`;
  const swapText = (el, html, animate) => {
    el.classList.remove('is-swap'); el.innerHTML = html;
    if (animate && !reduce) { void el.offsetWidth; el.classList.add('is-swap'); }
  };

  /* ---------- state + selection ---------- */
  const radios = $$('input[name=bouquet]');
  const layers = $$('.layer');
  const sr = $('[data-total-sr]');
  const sum = { date: $('[data-sum-date]'), time: $('[data-sum-time]'), card: $('[data-sum-card]'), name: $('[data-sum-name]'), no: $('[data-sum-no]'), wrap: $('[data-sum-wrap]'), photo: $('[data-sum-photo]') };
  const state = { price: 0, name: '', no: '' };
  const barName = $('[data-bar-name]');

  function select(first) {
    const r = radios.find((x) => x.checked) || radios[0];
    state.price = +r.dataset.price; state.name = r.dataset.name; state.no = r.dataset.no;
    layers.forEach((l) => { const on = l.dataset.layer === r.value; l.classList.toggle('is-active', on); on ? l.removeAttribute('aria-hidden') : l.setAttribute('aria-hidden', 'true'); });
    const card = r.closest('.card');
    if (!first) {
      swapText($('[data-cur-name]'), wordsHTML(state.name), true);
      swapText($('[data-cur-tags]'), lineHTML(r.dataset.tags), true);
      swapText(barName, wordsHTML(state.name), true);
    } else barName.innerHTML = wordsHTML(state.name);
    $('[data-cur-no]').textContent = `${state.no} / ${String(cfg.n).padStart(2, '0')}`;
    $('[data-bar-tags]').textContent = r.dataset.tags;
    sum.name.textContent = state.name; sum.no.textContent = state.no; if (sum.wrap) sum.wrap.textContent = r.dataset.wrap;
    sum.photo.innerHTML = card.querySelector('picture').outerHTML.replace(/sizes="[^"]*"/g, 'sizes="120px"');
    odos.forEach((o) => o.set(state.price, first));
    sr.textContent = `${fmt(state.price)} ${cfg.cur}`;
    if (!first && !reduce) sum.photo.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: EASE });
    // карточка в ленте прокручивается в видимую область (только горизонтально)
    const row = card.parentElement;
    if (!first && row.scrollWidth > row.clientWidth) row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }
  radios.forEach((r) => r.addEventListener('change', () => select(false)));
  select(true);

  /* ---------- date chips (next 7 days) / time / card ---------- */
  const dateBox = $('[data-dates]'), dateFallback = $('[data-date-fallback]');
  const cardTxt = $('#f-card'), count = $('[data-card-count]');
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const wd = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }), mo = new Intl.DateTimeFormat('uk-UA', { month: 'short' });
  const longFmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const lab = document.createElement('label'); lab.className = 'chip chip--date';
    const label = i === 0 ? 'Сьогодні' : i === 1 ? 'Завтра' : wd.format(d);
    lab.innerHTML = `<input type="radio" name="date" value="${iso(d)}"><span class="dw">${label}</span><b>${d.getDate()}</b><span class="dm">${mo.format(d).replace('.', '')}</span>`;
    lab.querySelector('input').setAttribute('aria-label', longFmt.format(d));
    dateBox.appendChild(lab);
  }
  dateFallback.min = iso(today);
  const dateVal = () => ($('input[name=date]:checked') || {}).value || '';
  const dateText = () => { const v = dateVal(); return v ? longFmt.format(new Date(v + 'T12:00:00')) : '—'; };
  const timeVal = () => ($('input[name=time]:checked') || {}).value || '—';
  const cardText = () => cardTxt.value.trim() ? 'з текстом' : 'за бажанням';
  function upd() { sum.date.textContent = dateText(); sum.time.textContent = timeVal(); sum.card.textContent = cardText(); count.textContent = `${cardTxt.value.length} / ${cardTxt.maxLength}`; }
  cardTxt.addEventListener('input', upd);
  $$('input[name=time],input[name=date]').forEach((r) => r.addEventListener('change', upd));

  /* ---------- phone mask ---------- */
  const phone = $('#f-phone');
  const digits = (v) => { let d = v.replace(/\D/g, ''); if (d.startsWith('380')) d = d.slice(3); else if ('380'.startsWith(d)) d = ''; if (d.startsWith('0')) d = d.slice(1); return d.slice(0, 9); };
  const mask = (d) => { let o = '+380'; if (d.length) o += ' (' + d.slice(0, 2); if (d.length >= 2) o += ')'; if (d.length > 2) o += ' ' + d.slice(2, 5); if (d.length > 5) o += ' ' + d.slice(5, 7); if (d.length > 7) o += ' ' + d.slice(7, 9); return o; };
  phone.addEventListener('input', (e) => {
    if (e.inputType && e.inputType.startsWith('delete') && !digits(phone.value).length) { phone.value = ''; return; }
    phone.value = mask(digits(phone.value));
  });
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+380'; });
  phone.addEventListener('blur', () => { if (!digits(phone.value).length) phone.value = ''; });

  /* ---------- validation + submit ---------- */
  const form = $('#order-form');
  const setErr = (input, id, msg) => { $('#' + id).textContent = msg; if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
  function validate() {
    const bad = [];
    if (!dateVal()) { setErr(null, 'err-date', 'Оберіть дату доставки.'); bad.push($('input[name=date]')); } else setErr(null, 'err-date', '');
    if (!$('input[name=time]:checked')) { setErr(null, 'err-time', 'Оберіть зручний інтервал.'); bad.push($('input[name=time]')); } else setErr(null, 'err-time', '');
    const name = $('#f-name');
    if (name.value.trim().length < 2) { setErr(name, 'err-name', 'Вкажіть ім’я.'); bad.push(name); } else setErr(name, 'err-name', '');
    if (digits(phone.value).length !== 9) { setErr(phone, 'err-phone', 'Введіть номер повністю: +380 і 9 цифр.'); bad.push(phone); } else setErr(phone, 'err-phone', '');
    const addr = $('#f-address');
    if (addr.value.trim().length < 5) { setErr(addr, 'err-address', 'Вкажіть адресу доставки.'); bad.push(addr); } else setErr(addr, 'err-address', '');
    return bad;
  }
  ['f-name', 'f-address'].forEach((id) => $('#' + id).addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') validate(); }));
  phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid') === 'true') validate(); });
  $$('input[name=time]').forEach((r) => r.addEventListener('change', () => setErr(null, 'err-time', '')));
  $$('input[name=date]').forEach((r) => r.addEventListener('change', () => setErr(null, 'err-date', '')));

  const done = $('[data-done]'), grid = $('[data-order-grid]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad.length) { bad[0].focus(); return; }
    const rows = [['Букет', `${state.no} · ${state.name}`], ['Сума', `${fmt(state.price)} ${cfg.cur}`], ['Дата', dateText()], ['Час', timeVal()], ['Листівка', cardTxt.value.trim() || 'без тексту'], [cfg.delivery[0], cfg.delivery[1]], ['Ім’я', $('#f-name').value.trim()], ['Телефон', phone.value], ['Адреса', $('#f-address').value.trim()]];
    const dl = $('[data-recap]'); dl.textContent = '';
    rows.forEach(([k, v]) => { const d = document.createElement('div'), a = document.createElement('dt'), b = document.createElement('dd'); a.textContent = k; b.textContent = v; d.append(a, b); dl.appendChild(d); });
    grid.hidden = true;
    done.hidden = false; done.classList.remove('in'); void done.offsetWidth; done.classList.add('in');
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  $('[data-again]').addEventListener('click', () => {
    done.hidden = true; grid.hidden = false; form.reset(); upd(); select(false);
    ['err-date', 'err-time', 'err-name', 'err-phone', 'err-address'].forEach((id) => setErr(null, id, ''));
    $$('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    $('#choose').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });
  upd();
})();
