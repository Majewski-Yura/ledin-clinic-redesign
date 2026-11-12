/* Ледин Клиника — общий скрипт всех страниц */

// Куда отправлять заявки. Пока пусто: форма показывает «Спасибо», но заявка никуда не уходит.
// Сюда нужно вписать адрес вебхука CRM (Bitrix24) или обработчика формы.
const FORM_ENDPOINT = '';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Шапка: подложка при прокрутке
  const header = $('#header');
  if (header) {
    const solid = header.classList.contains('is-solid');
    const onHeader = () => header.classList.toggle('is-scrolled', solid || scrollY > 60);
    onHeader(); addEventListener('scroll', onHeader, {passive: true});
  }

  // Мобильное меню
  const burger = $('.burger');
  if (burger) burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.mmenu a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  // Лента врачей: стрелки
  const team = $('#team');
  if (team) $$('.arrow').forEach(b => b.addEventListener('click', () => {
    const card = team.querySelector('.doc');
    team.scrollBy({left: (card.offsetWidth + 24) * +b.dataset.dir, behavior: 'smooth'});
  }));

  // Направления: вкладки
  const tabsEl = $$('.dir__tab'), panelsEl = $$('.dir__panel');
  const show = i => { tabsEl.forEach(t => t.classList.toggle('is-active', t.dataset.tab == i));
    panelsEl.forEach(p => p.classList.toggle('is-active', p.dataset.panel == i)); };
  tabsEl.forEach(t => { t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) show(t.dataset.tab); }); });

  // Прайс: поиск и разделы
  const q = $('#price-search');
  if (q) {
    const groups = $$('.pgroup');
    const empty = $('#price-empty');
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase();
      let any = false;
      groups.forEach(g => {
        let hits = 0;
        $$('.prow', g).forEach(r => { const ok = !v || r.textContent.toLowerCase().includes(v); r.hidden = !ok; if (ok) hits++; });
        g.hidden = !hits; if (hits) any = true;
        if (v && hits) g.open = true;
      });
      empty.hidden = any;
    });
  }
  // ===== Плавная прокрутка к якорям =====
  // Свой разгон и торможение вместо резкого прыжка; отступ под фиксированную шапку;
  // раздел-аккордеон раскрывается до расчёта позиции; колесо или касание прерывают анимацию.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let anim = 0;
  const stopAnim = () => { cancelAnimationFrame(anim); anim = 0; };
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, stopAnim, {passive: true}));
  const headerOffset = () => {
    // высота шапки в «прокрученном» состоянии + воздух
    const nav = $('#header .nav');
    return (nav ? Math.min(nav.offsetHeight, 90) : 80) + 24;
  };
  const scrollToEl = (el, instant) => {
    if (el.tagName === 'DETAILS') el.open = true;
    const target = Math.max(0, Math.min(
      el.getBoundingClientRect().top + scrollY - headerOffset(),
      document.documentElement.scrollHeight - innerHeight));
    stopAnim();
    if (instant || reduceMotion) { scrollTo(0, target); return; }
    const start = scrollY, dist = target - start;
    const dur = Math.min(1400, Math.max(550, Math.abs(dist) * .45));
    const t0 = performance.now();
    const step = now => {
      const k = Math.min((now - t0) / dur, 1);
      scrollTo(0, start + dist * ease(k));
      anim = k < 1 ? requestAnimationFrame(step) : 0;
    };
    anim = requestAnimationFrame(step);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || a.hasAttribute('data-book') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    document.body.classList.remove('menu-open');
    history.pushState(null, '', url.hash);
    scrollToEl(el);
  });
  // Пришли по ссылке с якорем с другой страницы: плавно доезжаем после загрузки
  if (location.hash.length > 1) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      scrollTo(0, 0);
      addEventListener('load', () => setTimeout(() => scrollToEl(el), 350), {once: true});
    }
  }
  addEventListener('popstate', () => {
    const el = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    el ? scrollToEl(el) : null;
  });

  // ===== Запись: модальное окно =====
  const modal = $('#book-modal');
  const openBook = (topic) => {
    if (!modal) return;
    const t = $('[name=topic]', modal);
    const label = $('.modal__topic', modal);
    t.value = topic || '';
    label.textContent = topic || '';
    label.hidden = !topic;
    resetForm($('form', modal));
    modal.showModal();
    document.documentElement.classList.add('modal-open');
    setTimeout(() => $('input[name=name]', modal).focus(), 60);
  };
  if (modal) {
    modal.addEventListener('close', () => document.documentElement.classList.remove('modal-open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
    $('.modal__close', modal).addEventListener('click', () => modal.close());
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    e.preventDefault(); openBook(b.dataset.book);
  });

  // Формы записи: проверка и отправка
  const phoneOk = v => v.replace(/\D/g, '').length >= 10;
  const resetForm = f => { if (!f) return; f.classList.remove('is-sent'); f.reset(); $$('.is-error', f).forEach(x => x.classList.remove('is-error')); };
  $$('input[type=tel]').forEach(i => i.addEventListener('input', () => {
    let d = i.value.replace(/\D/g, '');
    if (!d) { i.value = ''; return; }
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    i.value = '+7' + (p[0] ? ' ' + p[0] : '') + (p[1] ? ' ' + p[1] : '') + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
  }));
  $$('form.js-book').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const name = f.elements.name, tel = f.elements.phone, agree = f.elements.agree;
    let bad = false;
    [name, tel].forEach(x => x.classList.remove('is-error'));
    if (agree) agree.closest('label').classList.remove('is-error');
    if (!name.value.trim()) { name.classList.add('is-error'); bad = true; }
    if (!phoneOk(tel.value)) { tel.classList.add('is-error'); bad = true; }
    if (agree && !agree.checked) { agree.closest('label').classList.add('is-error'); bad = true; }
    if (bad) return;
    const data = Object.fromEntries(new FormData(f));
    data.page = location.pathname;
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (FORM_ENDPOINT) await fetch(FORM_ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
    } catch (_) { /* при ошибке всё равно показываем телефон в сообщении */ }
    btn.disabled = false;
    f.classList.add('is-sent');
  }));

  if (reduce) return;

  // ===== Анимации появления =====
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), {rootMargin: '0px 0px -10% 0px'});
  const stagger = (sel, cls, step) => {
    const groups = new Map();
    $$(sel).forEach(el => {
      const key = el.parentElement; const i = groups.get(key) || 0; groups.set(key, i + 1);
      el.classList.add(cls); el.style.setProperty('--d', (Math.min(i, 6) * step) + 's'); io.observe(el);
    });
  };

  // Заголовки секций: построчно из-под маски
  $$('.services h2, .sec .h2, .rv-h').forEach(h => {
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i)
      .map((part, i) => `<span class="ln" style="--i:${i}"><span>${part}</span></span>`).join('');
    h.classList.add('rv-lines'); io.observe(h);
  });

  // Фото: шторка снизу вверх
  ['.space__grid .tile', '.doc__photo', '.chief__frame', '.place', '.rv-photo'].forEach(sel => stagger(sel, 'rv-img', 0.1));

  // Тексты и карточки: из лёгкого размытия
  ['.dir__tab', '.dir__panels', '.chief > div:last-child > *', '.space__lead', '.space__feats > div',
   '.team__nav', '.doc h4, .doc p, .doc small', '.how .step', '.book > *', '.contacts dl > *',
   '.footer__cta > *', '.footer__top > div', '.rv'].forEach(sel => stagger(sel, 'reveal', 0.07));

  // Счётчики цифр
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const tick = t => { const k = Math.min((t - t0) / dur, 1); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick); };
    el.textContent = '0'; requestAnimationFrame(tick); cio.unobserve(el);
  }), {threshold: .6});
  $$('[data-count]').forEach(el => cio.observe(el));

  // Параллакс и прогресс этапов
  const par = $$('[data-parallax]');
  const stepsAll = $$('.steps');
  const frame = () => {
    const vh = innerHeight;
    par.forEach(el => { const r = el.parentElement.getBoundingClientRect();
      const off = (r.top + r.height / 2 - vh / 2) * +el.dataset.parallax;
      el.style.transform = `translateY(${off}px)`; });
    stepsAll.forEach(steps => {
      const r = steps.getBoundingClientRect(), line = vh * .55;
      const prog = Math.max(0, Math.min(1, (line - r.top) / r.height));
      steps.style.setProperty('--p', prog.toFixed(3));
      $$('.step', steps).forEach(it => it.classList.toggle('is-on', it.getBoundingClientRect().top < line));
    });
  };
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, {passive: true});
  addEventListener('resize', frame); frame();
})();
