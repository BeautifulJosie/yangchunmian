"""共享的路径和配置读取。"""
import argparse
import json
from pathlib import Path

import yaml

DEFAULT_WORKDIR = Path.home() / ".mac-photo-organizer"
REPO_ROOT = Path(__file__).resolve().parent.parent

DEFAULTS = {
    "home_country": "中国",
    "album_name": "{place} {year}.{month}",
    "album_date": "first",
    "trip_mode": "merge",
    "trip_gap_days": 3,
    "bilingual": "foreign_only",
    "region_threshold": 5,
    "region_layer": {"always": [], "never": []},
    "unknown_region_name": "其他地区",
    "prefer_area_of_interest": True,
    "place_merge": {},
    "place_overrides": {},
    "country_aliases": {},
    "infer_window_hours": 6,
    "protected_albums": [],
    "skip_protected_photos": True,
    "unclassified": {
        "folder": "📥 未分类",
        "albums": {"no_location": "无定位", "unknown_place": "地点不明"},
    },
}


def workdir_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--workdir", type=Path, default=DEFAULT_WORKDIR,
                        help="中间文件目录(默认 ~/.mac-photo-organizer)")


def _merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        elif v is not None:
            out[k] = v
    return out


def load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def load_config(workdir: Path) -> dict:
    return _merge(DEFAULTS, load_yaml(workdir / "config.yaml"))


def load_names(workdir: Path) -> dict:
    names = load_yaml(workdir / "names.yaml")
    return {k: names.get(k) or {} for k in ("countries", "regions", "places")}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
