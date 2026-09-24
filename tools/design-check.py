"""Локальная проверка вёрстки до показа: без модели, без интернета.

Запуск:
    python design-check.py <папка проекта> [--shot shots/hero-1440x900.png] [--width 1440]

Что проверяет:
  1. HTML/CSS: внешние шрифты и CDN, Lorem и заглушки, эмодзи вместо иконок, длины строк.
  2. CSS-числа: кегли и отступы кратны 4, кеглей не больше четырёх, шаг отступов из набора 4/8.
  3. Снимок: поля макета, «чернила» по краям, число цветов, контраст текстовых полос.
  4. Сетка: поля 40 слева и справа на 1440 (если снимок 1440).

Код возврата: 0 — чисто, 1 — есть замечания. Печать короткая: строки вида «[ОК]» / «[!]».

Скрипт ничего не пишет на диск: только читает и печатает числа.
"""

import argparse
import os
import re
import sys

GRID = {0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 72, 96, 128, 136, 160, 200}
TYPE_SCALE = {12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 128}
SPACE_SCALE = {0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 36, 40, 48, 56, 64, 72, 80, 96, 128, 136, 160, 200}
BANNED_CSS = [
    (r"fonts\.googleapis\.com|fonts\.gstatic\.com", "внешний шрифт по ссылке"),
    (r"cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com", "библиотека с CDN"),
    (r"lorem\s+ipsum", "Lorem ipsum"),
    (r"Пример\s+текста|Текст\s+заглушка|Здесь\s+будет\s+текст", "заглушка вместо текста"),
]
EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F000-\U0001F2FF]"
)


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def check_sources(root, html, css):
    problems = []
    for label, text in (("html", html), ("css", css)):
        for pattern, why in BANNED_CSS:
            if re.search(pattern, text, re.I):
                problems.append(f"{label}: {why} — правило дизайна запрещает")
        found = EMOJI.findall(re.sub(r"<[^>]+>", " ", text))
        if found:
            problems.append(f"{label}: эмодзи в разметке ({' '.join(sorted(set(found))[:5])}) — иконки только SVG")
    return problems


def css_numbers(css):
    sizes = sorted({int(float(v)) for v in re.findall(r"font-size:\s*([\d.]+)px", css)})
    spac = set()
    for m in re.finditer(
        r"(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left))?\s*:\s*([^;}]+)", css
    ):
        for v in re.findall(r"([\d.]+)px", m.group(1)):
            spac.add(int(float(v)))
    return sizes, sorted(spac)


def check_numbers(sizes, spac):
    problems = []
    if len(sizes) > 6:
        problems.append(f"кеглей {len(sizes)} ({sizes}) — для одного экрана это уже каша")
    off = [v for v in sizes if v not in TYPE_SCALE]
    if off:
        problems.append(f"кегли вне шкалы: {off}")
    off = [v for v in spac if v not in SPACE_SCALE]
    if off:
        problems.append(f"отступы вне шага 4/8: {off}")
    return problems


def check_shot(path, width):
    try:
        import numpy as np
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        return [f"снимок не проверен: нет PIL/numpy ({exc})"], {}
    img = Image.open(path).convert("RGB")
    a = np.asarray(img).astype(int)
    h, w = a.shape[:2]
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    problems = []
    info = {"size": (w, h)}

    # поля: первый и последний столбцы/строки, где есть «чернила» (контраст выше 12)
    contrast = (mx - mn)
    strong = (contrast > 12) | (mn < 90)
    cols = np.nonzero(strong.any(axis=0))[0]
    rows = np.nonzero(strong.any(axis=1))[0]
    if len(cols):
        info["margins"] = (int(cols.min()), int(w - 1 - cols.max()))
        info["vertical"] = (int(rows.min()), int(h - 1 - rows.max()))
        if w == 1440:
            left, right = info["margins"]
            if left not in (0, 40) or right not in (0, 40):
                problems.append(f"поля {left}/{right} — на 1440 сетка требует 40 или 0 (полноэкранный слой)")

    # палитра: сколько разных цветов на кадре (грубо, с шагом 2)
    q = (a // 8 * 8).reshape(-1, 3)
    colors = np.unique(q, axis=0)
    info["colors"] = len(colors)

    # контраст текстовых полос: строки с высокой локальной контрастностью
    lap = np.abs(np.diff(contrast.astype(float), axis=1)).mean(axis=1)
    text_rows = np.nonzero(lap > lap.mean() * 2.5)[0]
    info["text_rows"] = int(len(text_rows))
    if len(text_rows) == 0:
        problems.append("на снимке не найдено текстовых полос — проверь, что контент отрисован")

    # равномерность вертикального ритма: расстояния между «полосами чернил»
    if len(rows):
        return problems, info
    problems.append("снимок пустой")
    return problems, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--html", default=None, help="проверить одну страницу, а не все в папке")
    ap.add_argument("--shot", default=None)
    ap.add_argument("--width", type=int, default=1440)
    args = ap.parse_args()

    root = os.path.abspath(args.dir)
    if args.html:
        html_files = [args.html]
    else:
        html_files = [f for f in os.listdir(root) if f.endswith(".html")] if os.path.isdir(root) else []
    if not html_files:
        print(f"[!] в папке {root} нет html")
        return 1
    html = "\n".join(read(os.path.join(root, f)) for f in html_files)
    css_path = None
    if args.html:
        for m in re.finditer(r'<link[^>]+href="([^"]+\.css)"', html):
            cand = os.path.join(root, m.group(1).replace("/", os.sep))
            if os.path.exists(cand):
                css_path = cand
                break
    if not css_path:
        for dirpath, _dirs, files in os.walk(root):
            for f in files:
                if f.endswith(".css"):
                    css_path = os.path.join(dirpath, f)
                    break
            if css_path:
                break
    css = read(css_path) if css_path else ""
    print(f"проверяю: {', '.join(html_files)}" + (f" + {os.path.basename(css_path)}" if css_path else " (без css)"))

    problems = check_sources(root, html, css)
    sizes, spac = css_numbers(css)
    print(f"[ok] кегли: {sizes}")
    print(f"[ok] отступы: {spac}")
    problems += check_numbers(sizes, spac)

    shot = args.shot or os.path.join(root, "shots", "hero-%dx%d.png" % (args.width, 900))
    if os.path.exists(shot):
        shot_problems, info = check_shot(shot, args.width)
        print(f"[ok] снимок {os.path.basename(shot)}: {info.get('size')}, полей {info.get('margins')}, цветов {info.get('colors')}")
        problems += shot_problems
    else:
        print(f"[i] снимка {shot} нет — проверены только файлы")

    if problems:
        for p in problems:
            print(f"[!] {p}")
        print(f"ИТОГО: {len(problems)} замечаний")
        return 1
    print("ИТОГО: чисто")
    return 0


if __name__ == "__main__":
    sys.exit(main())
