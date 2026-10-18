(function () {
  var root = document.documentElement;
  var KEY = 'egt-lang';
  function setLang(v) {
    root.setAttribute('data-lang', v);
    root.setAttribute('lang', v === 'en' ? 'en' : 'zh-CN');
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-set') === v);
    });
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'zh' || saved === 'en' || saved === 'both') setLang(saved);
  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set')); });
  });

  var toggle = document.getElementById('tocToggle');
  var toc = document.getElementById('toc');
  toggle.addEventListener('click', function () { document.body.classList.toggle('toc-open'); });
  toc.addEventListener('click', function (e) {
    if (e.target.closest('a')) document.body.classList.remove('toc-open');
  });

  // click-to-play embedded players (nothing loads until the reader clicks)
  function playerSrc(kind, id) {
    if (kind === 'yt') return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    if (kind === 'bili') return 'https://player.bilibili.com/player.html?isOutside=true&bvid=' + id + '&p=1&autoplay=1&high_quality=1';
    return '';
  }
  var isLocalFile = location.protocol === 'file:';
  if (isLocalFile) {
    // Opened by double-clicking the file: YouTube/Bilibili refuse to embed on file:// pages,
    // so play buttons open the original site instead, and a notice explains why.
    var note = document.createElement('div');
    note.className = 'local-note';
    note.innerHTML = '<span class="zh">你正在以本地文件方式打开本页：视频无法页内播放，点击播放会跳到原站。放到网站（GitHub Pages）后即可页内播放。</span>'
      + '<span class="en">You opened this page as a local file: videos cannot play inline here and will open on the original site. Inline playback works once the page is served from a website.</span>';
    document.querySelector('main').insertBefore(note, document.querySelector('main').firstChild);
  }
  document.querySelectorAll('.vcard').forEach(function (card) {
    var btn = card.querySelector('.play');
    var box = card.querySelector('.player');
    var ext = card.querySelector('.ext');
    btn.addEventListener('click', function () {
      if (isLocalFile) { window.open(ext.href, '_blank', 'noopener'); return; }
      var open = !box.hidden;
      document.querySelectorAll('.vcard .player').forEach(function (p) { p.hidden = true; p.innerHTML = ''; });
      document.querySelectorAll('.vcard').forEach(function (c) { c.classList.remove('open'); });
      if (open) return;
      var f = document.createElement('iframe');
      f.src = playerSrc(card.getAttribute('data-kind'), card.getAttribute('data-id'));
      f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      f.setAttribute('loading', 'lazy');
      box.innerHTML = '';
      box.appendChild(f);
      box.hidden = false;
      card.classList.add('open');
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });

  // keyword search: lists matching passages, click to jump and highlight
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var index = [];
  document.querySelectorAll('article.chapter').forEach(function (art) {
    var num = art.querySelector('.ch-num').textContent;
    var title = art.querySelector('h2').textContent.trim();
    art.querySelectorAll('.pair p, aside.quotes li, h2, h3.sec, .meta').forEach(function (el) {
      index.push({ el: el, art: art, num: num, title: title, text: el.textContent.replace(/\s+/g, ' ').trim() });
    });
  });
  document.querySelectorAll('.theme li').forEach(function (el) {
    index.push({ el: el, num: '◎', title: '按主题读', text: el.textContent.replace(/\s+/g, ' ').trim() });
  });
  var current = -1, hits = [];
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function snippet(text, kw) {
    var i = text.toLowerCase().indexOf(kw.toLowerCase());
    var start = Math.max(0, i - 28), end = Math.min(text.length, i + kw.length + 60);
    var s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    var re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    return escapeHtml(s).replace(re, function (m) { return '<mark>' + m + '</mark>'; });
  }
  function render() {
    var kw = q.value.trim();
    results.innerHTML = '';
    hits = [];
    current = -1;
    if (kw.length < 1) { results.hidden = true; return; }
    var lower = kw.toLowerCase();
    index.forEach(function (it) {
      if (it.text.toLowerCase().indexOf(lower) !== -1) hits.push(it);
    });
    if (!hits.length) {
      results.innerHTML = '<div class="none">没有找到 · No match</div>';
      results.hidden = false;
      return;
    }
    hits.slice(0, 40).forEach(function (it, i) {
      var d = document.createElement('div');
      d.className = 'hit';
      d.innerHTML = '<span class="n">' + it.num + '</span><span class="s">' + snippet(it.text, kw) + '</span>';
      d.addEventListener('click', function () { go(i); });
      results.appendChild(d);
    });
    if (hits.length > 40) {
      var more = document.createElement('div');
      more.className = 'none';
      more.textContent = '还有 ' + (hits.length - 40) + ' 条，请输入更具体的词 · ' + (hits.length - 40) + ' more, refine the keyword';
      results.appendChild(more);
    }
    results.hidden = false;
  }
  function go(i) {
    var it = hits[i];
    if (!it) return;
    current = i;
    document.querySelectorAll('.hl').forEach(function (e) { e.classList.remove('hl'); });
    it.el.classList.add('hl');
    it.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    results.hidden = true;
    document.body.classList.remove('toc-open');
  }
  q.addEventListener('input', render);
  q.addEventListener('focus', function () { if (hits.length) results.hidden = false; });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); if (results.hidden) render(); else go(current < 0 ? 0 : current); }
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); go(Math.min(hits.length - 1, current + 1)); results.hidden = true; }
    if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); go(Math.max(0, current - 1)); results.hidden = true; }
    if (e.key === 'Escape') { results.hidden = true; q.blur(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#search')) results.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
  });

  // highlight current chapter in the TOC
  var links = {};
  toc.querySelectorAll('ol a[href^="#ch"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          var a = links[en.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('article.chapter').forEach(function (el) { io.observe(el); });
  }
})();
