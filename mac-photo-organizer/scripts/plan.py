#!/usr/bin/env python3
"""根据 scan.json + config.yaml + names.yaml 生成整理计划 plan.json 和预览 plan.md。

纯计算,不碰图库。
"""
import argparse
import bisect
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from common import load_config, load_names, read_json, workdir_arg, write_json

ALBUM_RE = re.compile(r"^(?P<place>.+?) (?P<year>\d{4})\.(?P<month>\d{1,2})$")


def parse_date(s: str) -> datetime:
    dt = datetime.fromisoformat(s)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_travel_photo(p: dict) -> bool:
    """截图、网上/聊天存图不是旅行照片,直接忽略。"""
    if p.get("screenshot"):
        return False
    return bool(p.get("has_camera") or p.get("is_movie") or p.get("lat") is not None)


class Translator:
    def __init__(self, names: dict):
        self.names = names
        self.missing = defaultdict(set)

    def __call__(self, kind: str, raw):
        if raw is None:
            return None
        if raw in self.names[kind]:
            return self.names[kind][raw]
        self.missing[kind].add(raw)
        return raw


class ExistingLayout:
    """用户已有的地理相簿结构。"""

    def __init__(self, albums: list, cfg: dict):
        unclassified = cfg["unclassified"]["folder"]
        self.geo_albums = set()                # 完整路径 tuple
        self.by_place = defaultdict(list)      # (国家, 地点) -> [(路径, 年, 月)]
        self.countries_with_region = set()
        self.flat_countries = set()
        self.places_per_country = defaultdict(set)
        for a in albums:
            path = tuple(a["path"])
            m = ALBUM_RE.match(path[-1])
            if len(path) < 2 or path[0] == unclassified or not m:
                continue
            country, place = path[0], m.group("place")
            self.geo_albums.add(path)
            self.by_place[(country, place)].append((path, int(m.group("year")), int(m.group("month"))))
            self.places_per_country[country].add(place)
            (self.countries_with_region if len(path) >= 3 else self.flat_countries).add(country)


def resolve_place(p: dict, cfg: dict, tr: Translator):
    """返回 (国家, 州省, 地点) 显示名;取不到国家或地点返回 None。"""
    alias = cfg["country_aliases"].get(p.get("country_code")) if p.get("country_code") else None
    if alias:
        country, region = alias["country"], alias.get("region")
    else:
        country, region = tr("countries", p.get("country")), tr("regions", p.get("region"))
    if not country:
        return None

    raw_candidates = [p.get("aoi"), p.get("city"), p.get("sub_admin")]
    place = None
    for merged, raws in cfg["place_merge"].items():
        if any(r in raws for r in raw_candidates if r):
            place = merged
            break
    if place is None:
        order = ["aoi", "city", "sub_admin"] if cfg["prefer_area_of_interest"] else ["city", "sub_admin", "aoi"]
        raw = next((p.get(k) for k in order if p.get(k)), None)
        place = tr("places", raw)
    if not place:
        return None

    region = cfg["place_overrides"].get(place, region)
    return country, region, place


def split_trips(dates_uuids: list, cfg: dict) -> list:
    items = sorted(dates_uuids)
    if cfg["trip_mode"] != "split":
        return [items]
    gap = timedelta(days=cfg["trip_gap_days"])
    trips, cur = [], [items[0]]
    for prev, item in zip(items, items[1:]):
        if item[0] - prev[0] > gap:
            trips.append(cur)
            cur = []
        cur.append(item)
    trips.append(cur)
    return trips


def build_plan(scan: dict, cfg: dict, names: dict) -> dict:
    tr = Translator(names)
    layout = ExistingLayout(scan["albums"], cfg)
    protected = set(cfg["protected_albums"])
    stats = defaultdict(int)
    warnings = []

    located, unlocated = [], []
    unclassified = defaultdict(list)
    for p in scan["photos"]:
        stats["total"] += 1
        if p.get("hidden"):
            stats["skipped_hidden"] += 1
            continue
        if any(tuple(a) in layout.geo_albums for a in p["albums"]):
            stats["already_classified"] += 1
            continue
        if cfg["skip_protected_photos"] and any(a[-1] in protected for a in p["albums"]):
            stats["skipped_protected"] += 1
            continue
        if not is_travel_photo(p):
            stats["ignored_screenshots"] += 1
            continue
        dt = parse_date(p["date"])
        if p.get("lat") is None:
            unlocated.append((dt, p["uuid"]))
            continue
        key = resolve_place(p, cfg, tr)
        if key is None:
            unclassified["unknown_place"].append(p["uuid"])
        else:
            located.append((dt, p["uuid"], key))

    # 无定位照片向前后借定位
    located.sort()
    times = [x[0] for x in located]
    window = timedelta(hours=cfg["infer_window_hours"])
    groups = defaultdict(list)
    unlocated_uuids = {u for _, u in unlocated}
    for dt, uuid, key in located:
        groups[key].append((dt, uuid))
    for dt, uuid in unlocated:
        i = bisect.bisect_left(times, dt)
        near = [located[j] for j in (i - 1, i) if 0 <= j < len(located)]
        near = [x for x in near if abs(x[0] - dt) <= window]
        if near:
            key = min(near, key=lambda x: abs(x[0] - dt))[2]
            groups[key].append((dt, uuid))
        else:
            unclassified["no_location"].append(uuid)

    # 每个国家是否用州/省层
    new_places = defaultdict(set)
    for country, _, place in groups:
        new_places[country].add(place)
    always, never = set(cfg["region_layer"]["always"]), set(cfg["region_layer"]["never"])
    threshold = cfg["region_threshold"]

    def use_region(country: str) -> bool:
        if country in always:
            return True
        if country in never:
            return False
        if country in layout.countries_with_region:
            return True
        total = len(layout.places_per_country[country] | new_places[country])
        if country in layout.flat_countries:
            if total > threshold:
                warnings.append(f"「{country}」已有 {total} 个地点,超过阈值 {threshold},"
                                f"但现有结构是扁平的,未自动加州/省层。需要的话把它加进 region_layer.always。")
            return False
        return total > threshold

    region_cache = {}
    actions = {}
    for (country, region, place), items in groups.items():
        if country not in region_cache:
            region_cache[country] = use_region(country)
        existing = layout.by_place.get((country, place), [])
        for trip in split_trips(items, cfg):
            start, end = trip[0][0], trip[-1][0]
            target = None
            if existing and cfg["trip_mode"] != "split":
                target = max(existing, key=lambda e: (e[1], e[2]))[0]
            elif existing:
                target = next((e[0] for e in existing if (e[1], e[2]) == (start.year, start.month)), None)
            if target is None:
                d = start if cfg["album_date"] == "first" else end
                name = cfg["album_name"].format(place=place, year=d.year, month=d.month, mm=f"{d.month:02d}")
                folder = [country]
                if region_cache[country]:
                    folder.append(region or cfg["unknown_region_name"])
                target = tuple(folder + [name])
            act = actions.setdefault(target, {
                "album_path": list(target),
                "existing": target in layout.geo_albums,
                "uuids": [], "first": start.isoformat(), "last": end.isoformat(), "inferred": 0,
            })
            act["uuids"].extend(u for _, u in trip)
            act["first"] = min(act["first"], start.isoformat())
            act["last"] = max(act["last"], end.isoformat())
            act["inferred"] += sum(1 for _, u in trip if u in unlocated_uuids)

    uc = cfg["unclassified"]
    return {
        "version": 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "actions": sorted(actions.values(), key=lambda a: a["album_path"]),
        "unclassified": {
            "folder": uc["folder"],
            "albums": {uc["albums"][k]: v for k, v in unclassified.items() if v},
            "all_names": list(uc["albums"].values()),
        },
        "warnings": warnings,
        "untranslated": {k: sorted(v) for k, v in tr.missing.items()},
        "stats": dict(stats),
    }


def render_markdown(plan: dict) -> str:
    lines = ["# 整理计划预览", ""]
    s = plan["stats"]
    lines.append(f"- 图库共 {s.get('total', 0)} 张;已在地理相簿 {s.get('already_classified', 0)} 张(跳过)")
    lines.append(f"- 忽略:截图/存图 {s.get('ignored_screenshots', 0)} 张,"
                 f"主题相簿 {s.get('skipped_protected', 0)} 张,隐藏 {s.get('skipped_hidden', 0)} 张")
    lines += ["", "## 地理相簿", ""]
    for a in plan["actions"]:
        mark = "↳ 追加" if a["existing"] else "＋ 新建"
        extra = f"(其中 {a['inferred']} 张借前后定位)" if a["inferred"] else ""
        lines.append(f"- {mark} `{' / '.join(a['album_path'])}`:{len(a['uuids'])} 张 "
                     f"[{a['first'][:10]} ~ {a['last'][:10]}]{extra}")
    if not plan["actions"]:
        lines.append("- 没有需要归档的新照片")
    uc = plan["unclassified"]
    lines += ["", f"## {uc['folder']}", ""]
    for name in uc["all_names"]:
        lines.append(f"- {name}:{len(uc['albums'].get(name, []))} 张")
    if plan["warnings"]:
        lines += ["", "## 提醒", ""] + [f"- {w}" for w in plan["warnings"]]
    if any(plan["untranslated"].values()):
        lines += ["", "## 待翻译地名(请补进 names.yaml)", ""]
        for kind, vals in plan["untranslated"].items():
            if vals:
                lines.append(f"- {kind}: {', '.join(vals)}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    plan = build_plan(read_json(args.workdir / "scan.json"), load_config(args.workdir), load_names(args.workdir))
    write_json(args.workdir / "plan.json", plan)
    md = render_markdown(plan)
    (args.workdir / "plan.md").write_text(md, encoding="utf-8")
    print(md)


if __name__ == "__main__":
    main()
