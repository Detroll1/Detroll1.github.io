#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Персональная страница калькулятора: kalk/<слаг>/index.html по настройкам kalk/t/<слаг>.json.

Адрес после выкладки: https://detroll1.github.io/kalk/<слаг>/
Запуск: python tools/kalk-page.py <слаг> [<слаг> ...]   (без слагов — для всех файлов в kalk/t)
"""
import glob
import json
import os
import sys

KALK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'kalk')

PAGE = """<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#16181b">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <link rel="stylesheet" href="../kalk.css">
  <script>window.KALK = {slug}; window.KALK_BASE = '../';</script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="../kalk.js"></script>
</body>
</html>
"""


def esc(s):
    return str(s).replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def build(slug):
    cfg = json.load(open(os.path.join(KALK, 't', slug + '.json'), encoding='utf-8'))
    out = os.path.join(KALK, slug)
    os.makedirs(out, exist_ok=True)
    html = PAGE.format(title=esc(cfg['company']['name'] + ' — ' + cfg['hero']['title']),
                       desc=esc(cfg['hero']['sub']), slug=json.dumps(slug))
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
    print('kalk/%s/' % slug)


if __name__ == '__main__':
    slugs = sys.argv[1:] or [os.path.basename(p)[:-5] for p in glob.glob(os.path.join(KALK, 't', '*.json'))]
    for s in slugs:
        build(s)
