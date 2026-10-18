# -*- coding: utf-8 -*-
"""Build the bilingual HTML book and EPUB from content/book.json.

Usage:  uv run --python 3.12 build/build.py
Outputs: index.html, downloads/<slug>.epub, downloads/<slug>.md (project root = site root)
"""
import json, re, html, zipfile, uuid, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BOOK = json.loads((ROOT / "content" / "book.json").read_text(encoding="utf-8"))
DOCS = ROOT
DL = DOCS / "downloads"
DL.mkdir(parents=True, exist_ok=True)
SLUG = BOOK["slug"]

QUOTE_RE = re.compile(r"\*\*(.+?)\*\*")


def esc(s: str) -> str:
    return html.escape(s or "", quote=False)


def rich(s: str, cls: str = "q") -> str:
    """Escape text and turn **bold** into <strong>."""
    out, pos = [], 0
    for m in QUOTE_RE.finditer(s):
        out.append(esc(s[pos:m.start()]))
        out.append(f'<strong class="{cls}">{esc(m.group(1))}</strong>')
        pos = m.end()
    out.append(esc(s[pos:]))
    return "".join(out)


def platform_of(url: str) -> str:
    if "youtube.com" in url or "youtu.be" in url:
        return "YouTube"
    if "bilibili.com" in url:
        return "Bilibili"
    if "cctv.com" in url or "yangshipin" in url or "cntv" in url:
        return "央视"
    if "xinhuanet" in url or "news.cn" in url:
        return "新华网"
    if "olympics.com" in url:
        return "Olympics.com"
    return "视频"


def embed_of(url: str):
    """Return (kind, id) for embeddable players, else None."""
    m = re.search(r"(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{6,})", url)
    if m:
        return "yt", m.group(1)
    m = re.search(r"bilibili\.com/video/(BV[0-9A-Za-z]+)", url)
    if m:
        return "bili", m.group(1)
    return None


def bi(zh: str, en: str, tag: str = "span") -> str:
    return f'<{tag} class="zh" lang="zh">{esc(zh)}</{tag}><{tag} class="en" lang="en">{esc(en)}</{tag}>'


def pair(p: dict) -> str:
    return ('<div class="pair">'
            f'<p class="zh" lang="zh">{rich(p["zh"])}</p>'
            f'<p class="en" lang="en">{rich(p["en"])}</p>'
            '</div>')


# ---------------------------------------------------------------- HTML book
def render_chapter_html(i: int, ch: dict) -> str:
    n = i + 1
    body = []
    for sec in ch["sections"]:
        if sec.get("heading_zh") or sec.get("heading_en"):
            body.append(f'<h3 class="sec">{bi(sec.get("heading_zh", ""), sec.get("heading_en", ""))}</h3>')
        body.extend(pair(p) for p in sec["paras"])
    quotes = "".join(
        '<li>'
        f'<strong class="q zh" lang="zh">{esc(q["zh"])}</strong>'
        f'<strong class="q en" lang="en">{esc(q["en"])}</strong>'
        + (f'<a class="src" href="{esc(q["source"])}" target="_blank" rel="noopener">出处 · source ↗</a>' if q.get("source") else "")
        + '</li>'
        for q in ch.get("quotes", []))
    videos = ""
    for v in ch.get("videos", []):
        emb = embed_of(v["url"])
        head = ('<span class="ico">▶</span><span class="vtxt">'
                f'{bi(v.get("label_zh", "观看原视频"), v.get("label_en", "Watch the original"))}'
                f'<small>{esc(platform_of(v["url"]))} · {esc(v.get("title", ""))}</small></span>')
        if emb:
            kind, vid = emb
            videos += (f'<div class="vcard" data-kind="{kind}" data-id="{esc(vid)}">'
                       f'<button type="button" class="btn video play">{head}</button>'
                       f'<div class="player" hidden></div>'
                       f'<a class="ext" href="{esc(v["url"])}" target="_blank" rel="noopener">'
                       f'{bi("在原站打开 ↗", "Open on the original site ↗")}</a></div>')
        else:
            videos += (f'<a class="btn video" href="{esc(v["url"])}" target="_blank" rel="noopener">{head}</a>')
    quotes_block = (f'<aside class="quotes"><h4>{bi("本章金句", "Key lines")}</h4><ul>{quotes}</ul></aside>'
                    if quotes else "")
    videos_block = (f'<div class="videos"><h4>{bi("跳转原视频", "Original video")}</h4>{videos}</div>'
                    if videos else "")
    readings = "".join(
        f'<li><a href="{esc(r["url"])}" target="_blank" rel="noopener">{bi(r.get("label_zh", r["url"]), r.get("label_en", r["url"]))}</a>'
        f'<small>{esc(r.get("note", ""))}</small></li>'
        for r in ch.get("readings", []))
    readings_block = (f'<div class="readings"><h4>{bi("原文与完整报道", "Full text & further reading")}</h4><ul>{readings}</ul></div>'
                      if readings else "")
    transcript = ch.get("transcript") or []
    transcript_block = ""
    if transcript:
        t_paras = "".join(pair(p) if isinstance(p, dict) else f'<p>{rich(p)}</p>' for p in transcript)
        transcript_block = (f'<details class="transcript"><summary>{bi("访谈原文（点击展开）", "Transcript (click to expand)")}</summary>'
                            f'{t_paras}</details>')
    return f'''
<article class="chapter" id="ch{n}">
  <header class="ch-head">
    <div class="ch-num">{n:02d}</div>
    <h2>{bi(ch["title_zh"], ch["title_en"])}</h2>
    <p class="meta"><time>{esc(ch["date"])}</time> · {bi(ch["occasion_zh"], ch["occasion_en"])}</p>
  </header>
  {"".join(body)}
  {quotes_block}
  {transcript_block}
  {videos_block}
  {readings_block}
</article>'''


def render_html() -> str:
    chapters = BOOK["chapters"]
    toc = "".join(
        f'<li><a href="#ch{i+1}"><span class="n">{i+1:02d}</span>{bi(ch["title_zh"], ch["title_en"])}</a></li>'
        for i, ch in enumerate(chapters))
    body = "".join(render_chapter_html(i, ch) for i, ch in enumerate(chapters))
    all_quotes = "".join(
        f'<li><strong class="q zh" lang="zh">{esc(q["zh"])}</strong><strong class="q en" lang="en">{esc(q["en"])}</strong>'
        f'<a class="where" href="#ch{i+1}">{i+1:02d}</a></li>'
        for i, ch in enumerate(chapters) for q in ch.get("quotes", []))
    intro = "".join(pair(p) for p in BOOK["intro"])
    idx = {ch["date"]: i + 1 for i, ch in enumerate(chapters)}
    themes = "".join(
        f'<section class="theme"><h3>{bi(t["name_zh"], t["name_en"])}</h3><ul>'
        + "".join(
            f'<li><a href="#ch{idx[it["ch"]]}" class="where">{idx[it["ch"]]:02d}</a>'
            f'<span class="zh" lang="zh">{esc(it["zh"])}</span><span class="en" lang="en">{esc(it["en"])}</span></li>'
            for it in t["items"])
        + '</ul></section>'
        for t in BOOK.get("themes", []))
    themes_block = (f'<section class="appendix themes" id="themes"><h2>{bi("按主题读 · 她怎么看成长、情绪与处事", "Read by theme · growth, emotions and dealing with things")}</h2>'
                    f'<div class="pair"><p class="zh">如果你更关心她看待事情的角度而不是比赛本身，可以从这里进：每条都链到对应章节。</p>'
                    f'<p class="en">If what interests you is how she looks at things rather than the competitions, start here: every line links to its chapter.</p></div>{themes}</section>'
                    if themes else "")
    year = datetime.date.today().year
    css = (ROOT / "build" / "book.css").read_text(encoding="utf-8")
    js = (ROOT / "build" / "book.js").read_text(encoding="utf-8")
    dl_help = BOOK["download_help"]
    return f'''<!doctype html>
<html lang="zh-CN" data-lang="both">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(BOOK["title_zh"])} · {esc(BOOK["title_en"])}</title>
<meta name="description" content="{esc(BOOK["subtitle_zh"])}">
<meta name="color-scheme" content="light dark">
<style>{css}</style>
</head>
<body>
<nav class="side" id="toc">
  <a class="brand" href="#top">{bi(BOOK["title_zh"], BOOK["title_en"])}</a>
  <a class="toc-x top" href="#themes">{bi("◎ 按主题读", "◎ Read by theme")}</a>
  <ol>{toc}</ol>
  <a class="toc-x" href="#quotes">{bi("✦ 金句合集", "✦ All key lines")}</a>
  <a class="toc-x" href="#download">{bi("⬇ 电子书下载", "⬇ Download e-book")}</a>
</nav>
<div class="search" id="search">
  <input type="search" id="q" placeholder="搜索关键词 · Search" autocomplete="off" aria-label="搜索">
  <div class="results" id="results" hidden></div>
</div>
<div class="lang-switch" role="group" aria-label="language">
  <button data-set="both" class="on">中 / EN</button><button data-set="zh">中文</button><button data-set="en">English</button>
</div>
<button class="toc-toggle" id="tocToggle" aria-label="目录">☰</button>
<main id="top">
  <section class="cover">
    <p class="kicker">{bi(BOOK["kicker_zh"], BOOK["kicker_en"])}</p>
    <h1>{bi(BOOK["title_zh"], BOOK["title_en"])}</h1>
    <p class="sub">{bi(BOOK["subtitle_zh"], BOOK["subtitle_en"])}</p>
    <p class="by">{(bi("编著 · " + BOOK["author"], "Written & compiled by " + BOOK["author"]) + " · ") if BOOK.get("author") else ""}v{esc(BOOK["version"])} · {bi("免费分享", "Free to share")}</p>
    <a class="btn primary" href="downloads/{SLUG}.epub" download>{bi("⬇ 下载 EPUB · 可导入微信读书", "⬇ Download EPUB")}</a>
  </section>

  <section class="intro">
    <h2>{bi("写在前面", "Before you start")}</h2>
    {intro}
  </section>

  {themes_block}

  {body}

  <section class="appendix" id="quotes">
    <h2>{bi("附录 · 金句合集", "Appendix · All key lines")}</h2>
    <ul class="quotes-all">{all_quotes}</ul>
  </section>

  <section class="download" id="download">
    <h2>{bi("把这本书带走", "Take the book with you")}</h2>
    {pair(dl_help)}
    <div class="dl-row">
      <a class="btn primary" href="downloads/{SLUG}.epub" download>⬇ EPUB</a>
      <a class="btn" href="downloads/{SLUG}.md" download>⬇ Markdown</a>
      <a class="btn" href="{esc(BOOK["repo_url"])}" target="_blank" rel="noopener">GitHub ↗</a>
    </div>
  </section>

  <footer>
    {pair(BOOK["footer"])}
    <p class="copy">{year} · <a href="{esc(BOOK["repo_url"])}" target="_blank" rel="noopener">GitHub</a></p>
  </footer>
</main>
<script>{js}</script>
</body>
</html>'''


# ---------------------------------------------------------------- EPUB
XHTML_HEAD = ('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
              '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN" xml:lang="zh-CN">\n')


def xhtml(title: str, body: str) -> str:
    return (XHTML_HEAD + f'<head><meta charset="utf-8"/><title>{esc(title)}</title>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
            f'<body>{body}</body></html>')


EPUB_CSS = """
body{font-family:serif;line-height:1.7;margin:0 .5em}
h1,h2,h3,h4{font-family:sans-serif;line-height:1.3}
h2{margin-top:1.6em;border-bottom:1px solid #ccc;padding-bottom:.2em}
h2 small{font-weight:normal;color:#666;font-size:.7em}
h3{font-size:1.05em;margin-top:1.4em}
p.en{color:#444;font-size:.95em;margin-top:-.4em;margin-bottom:1.1em}
p.meta{color:#666;font-size:.9em}
strong.q{font-weight:bold}
.quotes{border-left:3px solid #c8102e;padding:.3em 1em;margin:1.4em 0;background:#fafafa}
.quotes h4,.video h4{margin:.2em 0 .6em}
.quotes li,.video li{margin:.5em 0}
.video a{word-break:break-all}
ol.toc li{margin:.3em 0}
"""


def ch_xhtml(i: int, ch: dict) -> str:
    n = i + 1
    b = [f'<h2 id="ch{n}">{n:02d} · {esc(ch["title_zh"])}<br/><small>{esc(ch["title_en"])}</small></h2>',
         f'<p class="meta">{esc(ch["date"])} · {esc(ch["occasion_zh"])} / {esc(ch["occasion_en"])}</p>']
    for sec in ch["sections"]:
        if sec.get("heading_zh"):
            b.append(f'<h3>{esc(sec["heading_zh"])} · {esc(sec.get("heading_en", ""))}</h3>')
        for p in sec["paras"]:
            b.append(f'<p class="zh">{rich(p["zh"])}</p><p class="en">{rich(p["en"])}</p>')
    if ch.get("quotes"):
        b.append('<div class="quotes"><h4>本章金句 · Key lines</h4><ul>')
        for q in ch["quotes"]:
            src = f' <a href="{esc(q["source"])}">[出处]</a>' if q.get("source") else ""
            b.append(f'<li><strong class="q">{esc(q["zh"])}</strong><br/><strong class="q">{esc(q["en"])}</strong>{src}</li>')
        b.append('</ul></div>')
    if ch.get("transcript"):
        b.append('<h3>访谈原文 · Transcript</h3>')
        for p in ch["transcript"]:
            if isinstance(p, dict):
                b.append(f'<p class="zh">{rich(p["zh"])}</p><p class="en">{rich(p["en"])}</p>')
            else:
                b.append(f'<p>{rich(p)}</p>')
    if ch.get("videos"):
        b.append('<div class="video"><h4>跳转原视频 · Original video</h4><ul>')
        for v in ch["videos"]:
            b.append(f'<li>{esc(platform_of(v["url"]))} · {esc(v.get("title", ""))}<br/>'
                     f'<a href="{esc(v["url"])}">{esc(v["url"])}</a></li>')
        b.append('</ul></div>')
    if ch.get("readings"):
        b.append('<div class="video"><h4>原文与完整报道 · Full text &amp; further reading</h4><ul>')
        for r in ch["readings"]:
            b.append(f'<li>{esc(r.get("label_zh", ""))} · {esc(r.get("label_en", ""))}<br/>'
                     f'<a href="{esc(r["url"])}">{esc(r["url"])}</a></li>')
        b.append('</ul></div>')
    return xhtml(ch["title_zh"], "".join(b))


def build_epub(path: pathlib.Path):
    uid = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, BOOK["repo_url"] + SLUG))
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    chapters = BOOK["chapters"]
    files = {"style.css": EPUB_CSS}
    files["title.xhtml"] = xhtml(
        BOOK["title_zh"],
        f'<h1>{esc(BOOK["title_zh"])}</h1><h2>{esc(BOOK["title_en"])}</h2>'
        f'<p>{esc(BOOK["subtitle_zh"])}</p><p class="en">{esc(BOOK["subtitle_en"])}</p>'
        f'<p class="meta">{("编著 " + esc(BOOK["author"]) + " · ") if BOOK.get("author") else ""}v{esc(BOOK["version"])} · 免费分享 · {esc(BOOK["repo_url"])}</p>')
    intro = "".join(f'<p class="zh">{rich(p["zh"])}</p><p class="en">{rich(p["en"])}</p>' for p in BOOK["intro"])
    files["intro.xhtml"] = xhtml("写在前面", f'<h2>写在前面 · Before you start</h2>{intro}')
    nav_items = ['<li><a href="title.xhtml">封面 · Cover</a></li>',
                 '<li><a href="intro.xhtml">写在前面 · Before you start</a></li>']
    if BOOK.get("themes"):
        idx = {c["date"]: i + 1 for i, c in enumerate(chapters)}
        tb = ['<h2>按主题读 · Read by theme</h2>']
        for t in BOOK["themes"]:
            tb.append(f'<h3>{esc(t["name_zh"])} · {esc(t["name_en"])}</h3><ul>')
            for it in t["items"]:
                n = idx[it["ch"]]
                tb.append(f'<li><a href="ch{n:02d}.xhtml">{n:02d}</a> {esc(it["zh"])}<br/><span class="en">{esc(it["en"])}</span></li>')
            tb.append('</ul>')
        files["themes.xhtml"] = xhtml("按主题读", "".join(tb))
        nav_items.append('<li><a href="themes.xhtml">按主题读 · Read by theme</a></li>')
    for i, ch in enumerate(chapters):
        files[f"ch{i+1:02d}.xhtml"] = ch_xhtml(i, ch)
        nav_items.append(f'<li><a href="ch{i+1:02d}.xhtml">{i+1:02d} · {esc(ch["title_zh"])} · {esc(ch["title_en"])}</a></li>')
    allq = "".join(
        f'<li><strong class="q">{esc(q["zh"])}</strong><br/><strong class="q">{esc(q["en"])}</strong> <small>（{i+1:02d}）</small></li>'
        for i, ch in enumerate(chapters) for q in ch.get("quotes", []))
    files["quotes.xhtml"] = xhtml("金句合集", f'<h2>附录 · 金句合集 · All key lines</h2><ul>{allq}</ul>')
    nav_items.append('<li><a href="quotes.xhtml">附录 · 金句合集</a></li>')
    files["nav.xhtml"] = (XHTML_HEAD + '<head><meta charset="utf-8"/><title>目录</title>'
                          '<link rel="stylesheet" type="text/css" href="style.css"/></head>'
                          f'<body><nav epub:type="toc" id="toc"><h2>目录 · Contents</h2><ol class="toc">{"".join(nav_items)}</ol></nav></body></html>')
    manifest, spine = [], []
    for name in files:
        mt = "text/css" if name.endswith(".css") else "application/xhtml+xml"
        props = ' properties="nav"' if name == "nav.xhtml" else ""
        iid = name.replace(".", "_")
        manifest.append(f'<item id="{iid}" href="{name}" media-type="{mt}"{props}/>')
        if name.endswith(".xhtml"):
            spine.append(f'<itemref idref="{iid}"/>')
    cover = ROOT / "assets" / "cover.jpg"
    if cover.exists():
        manifest.append('<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>')
    opf = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="zh-CN">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{uid}</dc:identifier>
<dc:title>{esc(BOOK["title_zh"])} · {esc(BOOK["title_en"])}</dc:title>
<dc:language>zh-CN</dc:language>
<dc:creator>{esc(BOOK.get("author") or "谷爱凌说 · 编者")}</dc:creator>
<dc:description>{esc(BOOK["subtitle_zh"])}</dc:description>
<meta property="dcterms:modified">{now}</meta>
</metadata>
<manifest>{"".join(manifest)}</manifest>
<spine>{"".join(spine)}</spine>
</package>'''
    container = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
                 '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container, compress_type=zipfile.ZIP_DEFLATED)
        z.writestr("OEBPS/content.opf", opf, compress_type=zipfile.ZIP_DEFLATED)
        for name, data in files.items():
            z.writestr(f"OEBPS/{name}", data, compress_type=zipfile.ZIP_DEFLATED)
        if cover.exists():
            z.write(cover, "OEBPS/cover.jpg")


# ---------------------------------------------------------------- Markdown
def build_md() -> str:
    out = [f'# {BOOK["title_zh"]} · {BOOK["title_en"]}', "", BOOK["subtitle_zh"], "", BOOK["subtitle_en"], "",
           f'{("编著 " + BOOK["author"] + " · ") if BOOK.get("author") else ""}v{BOOK["version"]} · 免费分享 · {BOOK["repo_url"]}', "",
           "## 写在前面 · Before you start", ""]
    for p in BOOK["intro"]:
        out += [p["zh"], "", p["en"], ""]
    if BOOK.get("themes"):
        idx = {c["date"]: i + 1 for i, c in enumerate(BOOK["chapters"])}
        out += ["## 按主题读 · Read by theme", ""]
        for t in BOOK["themes"]:
            out += [f'### {t["name_zh"]} · {t["name_en"]}', ""]
            for it in t["items"]:
                out.append(f'- （{idx[it["ch"]]:02d}）{it["zh"]} / {it["en"]}')
            out.append("")
    for i, ch in enumerate(BOOK["chapters"]):
        out += [f'## {i+1:02d} · {ch["title_zh"]} · {ch["title_en"]}', "",
                f'*{ch["date"]} · {ch["occasion_zh"]} / {ch["occasion_en"]}*', ""]
        for sec in ch["sections"]:
            if sec.get("heading_zh"):
                out += [f'### {sec["heading_zh"]} · {sec.get("heading_en", "")}', ""]
            for p in sec["paras"]:
                out += [p["zh"], "", p["en"], ""]
        if ch.get("quotes"):
            out += ["**本章金句 · Key lines**", ""]
            for q in ch["quotes"]:
                src = f' （[出处]({q["source"]})）' if q.get("source") else ""
                out.append(f'- **{q["zh"]}** / **{q["en"]}**{src}')
            out.append("")
        if ch.get("transcript"):
            out += ["### 访谈原文 · Transcript", ""]
            for p in ch["transcript"]:
                out += ([p["zh"], "", p["en"], ""] if isinstance(p, dict) else [p, ""])
        if ch.get("videos"):
            out += ["**跳转原视频 · Original video**", ""]
            for v in ch["videos"]:
                out.append(f'- {platform_of(v["url"])} · {v.get("title", "")}：{v["url"]}')
            out.append("")
        if ch.get("readings"):
            out += ["**原文与完整报道 · Full text & further reading**", ""]
            for r in ch["readings"]:
                out.append(f'- {r.get("label_zh", "")} · {r.get("label_en", "")}：{r["url"]}')
            out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    (DOCS / "index.html").write_text(render_html(), encoding="utf-8")
    build_epub(DL / f"{SLUG}.epub")
    (DL / f"{SLUG}.md").write_text(build_md(), encoding="utf-8")
    print("built:", DOCS / "index.html", DL / f"{SLUG}.epub", DL / f"{SLUG}.md")
