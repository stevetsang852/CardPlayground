#!/usr/bin/env python3
"""Pull older Traditional Chinese cards from KADO set pages and the official HK card search.

KADO pages supply the scan URL. Official pages cover sets KADO has not listed yet
(Sword & Shield, 25th anniversary, Sun & Moon combo sets).
"""
from __future__ import annotations

import re
import html
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0"}
OUT = Path(__file__).resolve().parents[2] / "client" / "src" / "game" / "olderCards.ts"

KADO_SETS = [
    ("tw-012", "閃色明星V"),
    ("tw-010-a", "傳說交鋒"),
    ("tw-009-a", "美夢成真組合篇"),
    ("tw-006", "天地萬物VSTAR"),
    ("tw-007", "寶可夢卡牌151"),
    ("tw-003", "閃色寶藏ex"),
    ("tw-002", "太晶慶典ex"),
    ("tw-004", "純白閃焰"),
    ("tw-005", "漆黑伏特"),
    ("tw-036", "火箭隊的榮耀"),
]

OFFICIAL_SETS = [
    ("AC1a", "眾星雲集組合篇"),
    ("AS5a", "雙倍爆擊"),
    ("SC1a", "劍&盾"),
    ("S8a", "25週年收藏款"),
    ("S6a", "伊布英雄"),
]


def get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as res:
        return res.read().decode("utf-8", "ignore")


def spread(items: list, count: int) -> list:
    if len(items) <= count:
        return items
    picked = []
    seen = set()
    for i in range(count):
        idx = round(i * (len(items) - 1) / (count - 1))
        if idx not in seen:
            seen.add(idx)
            picked.append(items[idx])
    return picked


def rarity_from_label(label: str, name: str) -> str:
    text = label.lower()
    if any(token in text for token in ("special art", "illustration rare", "hyper", "ultra rare", "secret")):
        return "legendary"
    if any(token in text for token in ("art rare", "super rare", "double rare", "ace")):
        return "epic"
    if "uncommon" in text or text.strip() in {"c", "u", "common"}:
        return "common"
    if "rare" in text:
        return "rare"
    return rarity_from_name(name)


def rarity_from_name(name: str) -> str:
    if any(token in name for token in ("VSTAR", "VMAX", "GX")):
        return "legendary"
    if "ex" in name.lower():
        return "epic"
    if name.endswith("V") or " V " in name:
        return "rare"
    return "common"


def parse_kado_set(html: str) -> list[tuple[str, str, str]]:
    found = []
    seen = set()
    pattern = re.compile(r'href="(/card/tw/[a-f0-9-]+)"[^>]*>(\d{3}|[A-Z]{3})(?:\s|<!--\s*-->)*([^<]+)</a>')
    for href, number, name in pattern.findall(html):
        if href in seen:
            continue
        seen.add(href)
        found.append((href, number, html.unescape(name.strip())))
    return found


def kado_card(href: str, number: str, name: str, series: str) -> dict | None:
    html = get("https://www.kado.hk" + href)
    image = re.search(r'property="og:image" content="([^"]+)"', html)
    title = re.search(r"<title>([^<]+)</title>", html)
    if not image or "card-images/tw-cards" not in image.group(1):
        return None
    label = ""
    if title:
        marks = re.findall(r"（([^）]+)）", title.group(1))
        label = marks[-1] if marks else ""
    return {
        "name": name,
        "rarity": rarity_from_label(label, name),
        "series": series,
        "imageUrl": image.group(1),
        "dex": 0,
        "number": number,
    }


def official_ids(code: str) -> list[str]:
    first = get(f"https://asia.pokemon-card.com/hk/card-search/list/?expansionCodes={code}")
    pages = [int(n) for n in re.findall(r"pageNo=(\d+)", first)]
    last_no = max(pages) if pages else 1
    htmls = [first]
    if last_no > 1:
        htmls.append(get(f"https://asia.pokemon-card.com/hk/card-search/list/?pageNo={last_no}&expansionCodes={code}"))
    ids = []
    for html in htmls:
        ids.extend(re.findall(r"/hk/card-search/detail/(\d+)/", html))
    # unique, keep order
    out = []
    seen = set()
    for card_id in ids:
        if card_id in seen:
            continue
        seen.add(card_id)
        out.append(card_id)
    head = out[:12]
    tail = out[-8:] if len(out) > 12 else []
    merged = []
    seen.clear()
    for card_id in head + tail:
        if card_id not in seen:
            seen.add(card_id)
            merged.append(card_id)
    return merged


def official_card(card_id: str, series: str) -> dict | None:
    html = get(f"https://asia.pokemon-card.com/hk/card-search/detail/{card_id}/")
    title = re.search(r"<title>([^<|]+)", html)
    image = re.search(rf"https://asia\.pokemon-card\.com/hk/card-img/hk0*{card_id}\.png", html)
    if not title or not image:
        return None
    name = html.unescape(title.group(1).strip())
    dex = 0
    dex_match = re.search(r"No\.(\d+)", html)
    if dex_match:
        dex = int(dex_match.group(1))
    number = ""
    number_match = re.search(r"(\d{3}/\d{3})", re.sub("<[^>]+>", " ", html))
    if number_match:
        number = number_match.group(1).split("/")[0]
    return {
        "name": name,
        "rarity": rarity_from_name(name),
        "series": series,
        "imageUrl": image.group(0),
        "dex": dex,
        "number": number,
    }


def ts_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def main() -> None:
    rows: list[dict] = []

    def collect_kado(spec: tuple[str, str]) -> list[dict]:
        code, series = spec
        html = get(f"https://www.kado.hk/database/tw/{code}")
        listed = spread(parse_kado_set(html), 16)
        found = []
        with ThreadPoolExecutor(6) as pool:
            futures = [pool.submit(kado_card, href, number, name, series) for href, number, name in listed]
            for future in as_completed(futures):
                card = future.result()
                if card:
                    found.append(card)
        print(f"kado {code} {len(found)}/{len(listed)}", flush=True)
        return found

    def collect_official(spec: tuple[str, str]) -> list[dict]:
        code, series = spec
        ids = official_ids(code)
        found = []
        with ThreadPoolExecutor(6) as pool:
            futures = [pool.submit(official_card, card_id, series) for card_id in ids]
            for future in as_completed(futures):
                card = future.result()
                if card:
                    found.append(card)
        print(f"official {code} {len(found)}/{len(ids)}", flush=True)
        return found

    for spec in KADO_SETS:
        rows.extend(collect_kado(spec))
    for spec in OFFICIAL_SETS:
        rows.extend(collect_official(spec))

    seen_images = set()
    unique = []
    for row in rows:
        if row["imageUrl"] in seen_images:
            continue
        seen_images.add(row["imageUrl"])
        unique.append(row)

    lines = [
        "import type { Rarity } from '../cardData';",
        "",
        "/** Older Traditional Chinese scans. KADO set pages plus official HK card search. */",
        "export const OLDER_CARDS: Array<[number, string, Rarity, number, string, string]> = [",
    ]
    next_id = 5001
    for row in unique:
        lines.append(
            "  ["
            f"{next_id}, {ts_string(row['name'])}, {ts_string(row['rarity'])}, {row['dex']}, "
            f"{ts_string(row['imageUrl'])}, {ts_string(row['series'])}"
            "],"
        )
        next_id += 1
    lines.append("];")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT} cards={len(unique)}")


if __name__ == "__main__":
    main()
