#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Видео на минуту для владельца: как клиент считает цену и отправляет заявку на его странице.

Снимает телефонный экран покадрово (скринкаст Chrome в полном разрешении), касания подсвечиваются
кружком, потом ffmpeg склеивает кадры в mp4. Обычная запись Playwright не годится: при чётком экране
она кладёт страницу в угол кадра.
Нужен локальный сервер из папки сайта: python -m http.server 8000
Запуск: python tools/kalk-video.py <слаг> [--out папка]
"""
import argparse
import asyncio
import base64
import json
import os
import shutil
import subprocess

from playwright.async_api import async_playwright

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# кружок на месте касания и плавная прокрутка — чтобы зритель видел, что происходит
HELPERS = """
window.__tap = (x, y) => {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;
    background:rgba(255,255,255,.35);border:2px solid rgba(20,20,20,.55);z-index:99;pointer-events:none;
    transition:transform .45s ease,opacity .45s ease`;
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = 'scale(1.5)'; d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 600);
};
"""


async def tap(pg, selector):
    el = pg.locator(selector).first
    await el.scroll_into_view_if_needed()
    await pg.evaluate("(sel) => { const r = document.querySelector(sel).getBoundingClientRect(); window.scrollBy({top: r.top - innerHeight * 0.35, behavior: 'smooth'}); }", selector)
    await pg.wait_for_timeout(700)
    box = await el.bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    await pg.evaluate(f'window.__tap({x}, {y})')
    await pg.wait_for_timeout(250)
    await el.click()
    await pg.wait_for_timeout(650)


async def typing(pg, selector, text):
    await tap(pg, selector)
    await pg.locator(selector).first.type(text, delay=70)
    await pg.wait_for_timeout(400)


async def record(slug, out_dir):
    cfg = json.load(open(os.path.join(SITE, 'kalk', 't', slug + '.json'), encoding='utf-8'))
    tmp = os.path.join(out_dir, '_raw')
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    frames = []  # (время, файл)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 780}, device_scale_factor=2, is_mobile=True)
        pg = await ctx.new_page()
        cdp = await ctx.new_cdp_session(pg)

        async def on_frame(ev):
            path = os.path.join(tmp, '%05d.jpg' % len(frames))
            with open(path, 'wb') as f:
                f.write(base64.b64decode(ev['data']))
            frames.append((ev['metadata']['timestamp'], path))
            await cdp.send('Page.screencastFrameAck', {'sessionId': ev['sessionId']})

        cdp.on('Page.screencastFrame', lambda ev: asyncio.ensure_future(on_frame(ev)))
        await pg.goto(f'http://127.0.0.1:8000/kalk/{slug}/')
        await cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 90, 'maxWidth': 780, 'maxHeight': 1560, 'everyNthFrame': 1})
        await pg.add_script_tag(content=HELPERS)
        await pg.wait_for_timeout(2200)
        n = cfg['niche']
        if n == 'tech':
            first = next(i for i in cfg['tech']['items'] if not i.get('busy'))
            await tap(pg, f'[data-item="{first["id"]}"]')
            await typing(pg, 'input[name=address]', cfg.get('demoAddress', 'ул. Ленина, 10'))
            await tap(pg, '[data-key=hours] [data-d="1"]')
            await tap(pg, '[data-key=hours] [data-d="1"]')
        elif n == 'potolki':
            for _ in range(3):
                await tap(pg, '[data-key=area] [data-d="1"]')
            if len(cfg['potolki']['textures']) > 1:
                await tap(pg, '[data-choice=texture][data-i="1"]')
            # пара первых доп. услуг: одну дважды, другую трижды — видно, как растёт цена
            for x, n in zip(cfg['potolki']['extras'][:2], (1, 3)):
                for _ in range(n):
                    await tap(pg, f'[data-key="x:{x["id"]}"] [data-d="1"]')
        else:
            await tap(pg, '[data-choice=type][data-i="1"]')
            await tap(pg, '[data-key=area] [data-d="1"]')
            await tap(pg, '[data-key="x:window"] [data-d="1"]')
            await tap(pg, '[data-key="x:window"] [data-d="1"]')
        await typing(pg, 'input[name=name]', 'Андрей')
        await typing(pg, 'input[name=phone]', '+7 912 345-67-89')
        await pg.wait_for_timeout(600)
        await tap(pg, '#send')
        await pg.wait_for_timeout(3500)
        await cdp.send('Page.stopScreencast')
        await pg.wait_for_timeout(300)
        await ctx.close()
        await b.close()
    # кадры приходят неравномерно (только когда экран меняется) — каждому своя длительность
    lst = os.path.join(tmp, 'list.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for (t, path), nxt in zip(frames, frames[1:] + [(frames[-1][0] + 1.5, None)]):
            f.write("file '%s'\nduration %.3f\n" % (path.replace(os.sep, '/'), max(0.01, nxt[0] - t)))
        f.write("file '%s'\n" % frames[-1][1].replace(os.sep, '/'))
    dst = os.path.join(out_dir, slug + '.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-vf', 'scale=720:-2,fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22',
                    '-movflags', '+faststart', dst], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(dst)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--out', default=os.path.join(os.path.expanduser('~'), 'Documents', 'orders', 'kalk-video'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    asyncio.run(record(a.slug, a.out))
