#!/usr/bin/env python3
"""把封面 HTML 渲染成 1080x1440 的 PNG。

用法：
    python3 render.py cover.html out.png [--accent "#B5541E"] [--scale 1]

- 封面根元素必须是 id="cover" 的 1080x1440 div（模板里已写好）。
- --accent 可临时覆盖主色，不用改 HTML。
- --scale 2 可导出 2160x2880 高清图。
需要 playwright + chromium；中文字体优先用本机 Noto Sans CJK SC。
"""
import argparse
import asyncio
import pathlib

from playwright.async_api import async_playwright


async def render(src, out, accent=None, scale=1):
    html = pathlib.Path(src).read_text(encoding="utf-8")
    if accent:
        html = html.replace("</head>", f"<style>:root{{--accent:{accent}}}</style></head>", 1)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": 1080, "height": 1440}, device_scale_factor=scale
        )
        await page.set_content(html, wait_until="load")
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(300)
        await page.locator("#cover").screenshot(path=out)
        await browser.close()
    print("saved", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--accent")
    ap.add_argument("--scale", type=float, default=1)
    a = ap.parse_args()
    asyncio.run(render(a.src, a.out, a.accent, a.scale))
