"""plan.py 的离线测试:全部用假数据,不碰图库。运行:python3 -m unittest discover tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from common import DEFAULTS, _merge  # noqa: E402
from plan import build_plan  # noqa: E402

NAMES = {
    "countries": {"United States": "美国", "Japan": "日本", "China": "中国"},
    "regions": {"California": "加州（California）", "Arizona": "亚利桑那州（Arizona）", "Montana": "蒙大拿州（Montana）"},
    "places": {"Lake Tahoe": "太浩湖", "Kyoto": "京都（Kyoto）", "Osaka": "大阪（Osaka）",
               "Hong Kong": "香港", "Yellowstone National Park": "黄石"},
}

ALBUMS = [
    {"path": ["美国", "加州（California）", "太浩湖 2025.11"], "count": 1},
    {"path": ["日本", "京都（Kyoto） 2025.11"], "count": 1},
    {"path": ["滑雪"], "count": 1},
]


def photo(uuid, date, *, country=None, cc=None, region=None, city=None, aoi=None,
          lat=None, albums=(), screenshot=False, camera=True):
    has_loc = country is not None or lat is not None
    return {"uuid": uuid, "date": date, "lat": lat if lat is not None else (1.0 if has_loc else None),
            "lon": 1.0 if has_loc else None, "country_code": cc, "country": country, "region": region,
            "sub_admin": None, "city": city, "aoi": aoi, "screenshot": screenshot,
            "has_camera": camera, "is_movie": False, "hidden": False, "albums": [list(a) for a in albums]}


def make_scan(photos):
    return {"photos": photos, "albums": ALBUMS}


def cfg(**over):
    base = {"protected_albums": ["滑雪"], "region_layer": {"always": ["美国"], "never": []},
            "country_aliases": {"HK": {"country": "中国", "region": "港澳"}}}
    return _merge(_merge(DEFAULTS, base), over)


def by_path(plan):
    return {" / ".join(a["album_path"]): a for a in plan["actions"]}


class PlanTest(unittest.TestCase):
    def test_existing_album_gets_new_photos(self):
        p = photo("a", "2026-01-05T10:00:00-08:00", country="United States", region="California", city="Lake Tahoe")
        plan = build_plan(make_scan([p]), cfg(), NAMES)
        act = by_path(plan)["美国 / 加州（California） / 太浩湖 2025.11"]
        self.assertTrue(act["existing"])
        self.assertEqual(act["uuids"], ["a"])

    def test_new_place_new_region(self):
        p = photo("b", "2026-04-02T10:00:00-07:00", country="United States", region="Arizona", city="Sedona")
        plan = build_plan(make_scan([p]), cfg(), NAMES)
        self.assertIn("美国 / 亚利桑那州（Arizona） / Sedona 2026.4", by_path(plan))
        self.assertEqual(plan["untranslated"], {"places": ["Sedona"]})

    def test_flat_country_stays_flat(self):
        p = photo("c", "2025-11-20T10:00:00+09:00", country="Japan", region="Osaka", city="Osaka")
        plan = build_plan(make_scan([p]), cfg(), NAMES)
        self.assertIn("日本 / 大阪（Osaka） 2025.11", by_path(plan))

    def test_country_alias(self):
        p = photo("d", "2026-02-01T10:00:00+08:00", country="Hong Kong", cc="HK", city="Hong Kong")
        plan = build_plan(make_scan([p]), cfg(region_layer={"always": ["美国", "中国"]}), NAMES)
        self.assertIn("中国 / 港澳 / 香港 2026.2", by_path(plan))

    def test_area_of_interest_and_override(self):
        p = photo("e", "2026-05-10T10:00:00-06:00", country="United States", region="Wyoming",
                  city="Mammoth", aoi="Yellowstone National Park")
        plan = build_plan(make_scan([p]), cfg(place_overrides={"黄石": "蒙大拿州（Montana）"}), NAMES)
        self.assertIn("美国 / 蒙大拿州（Montana） / 黄石 2026.5", by_path(plan))

    def test_already_classified_and_protected_skipped(self):
        done = photo("f", "2025-11-03T10:00:00-08:00", country="United States", region="California",
                     city="Lake Tahoe", albums=[["美国", "加州（California）", "太浩湖 2025.11"]])
        ski = photo("g", "2025-12-03T10:00:00-08:00", albums=[["滑雪"]])
        plan = build_plan(make_scan([done, ski]), cfg(), NAMES)
        self.assertEqual(plan["actions"], [])
        self.assertEqual(plan["stats"]["already_classified"], 1)
        self.assertEqual(plan["stats"]["skipped_protected"], 1)

    def test_screenshots_and_saved_images_ignored(self):
        shot = photo("h", "2026-01-01T10:00:00-08:00", screenshot=True)
        saved = photo("i", "2026-01-01T11:00:00-08:00", camera=False)
        plan = build_plan(make_scan([shot, saved]), cfg(), NAMES)
        self.assertEqual(plan["stats"]["ignored_screenshots"], 2)
        self.assertEqual(plan["unclassified"]["albums"], {})
        self.assertEqual(plan["unclassified"]["all_names"], ["无定位", "地点不明"])

    def test_no_gps_borrows_nearby_location(self):
        kyoto = photo("j", "2025-11-15T10:00:00+09:00", country="Japan", city="Kyoto")
        near = photo("k", "2025-11-15T13:00:00+09:00")          # 3 小时后,无 GPS
        far = photo("l", "2025-12-30T13:00:00+09:00")           # 没有可借的
        plan = build_plan(make_scan([kyoto, near, far]), cfg(), NAMES)
        act = by_path(plan)["日本 / 京都（Kyoto） 2025.11"]
        self.assertEqual(sorted(act["uuids"]), ["j", "k"])
        self.assertEqual(act["inferred"], 1)
        self.assertEqual(plan["unclassified"]["albums"], {"无定位": ["l"]})

    def test_unknown_place(self):
        sea = photo("m", "2025-10-01T10:00:00+00:00", lat=10.0)
        plan = build_plan(make_scan([sea]), cfg(), NAMES)
        self.assertEqual(plan["unclassified"]["albums"], {"地点不明": ["m"]})

    def test_split_trips(self):
        a = photo("n", "2026-03-01T10:00:00+09:00", country="Japan", city="Osaka")
        b = photo("o", "2026-08-01T10:00:00+09:00", country="Japan", city="Osaka")
        plan = build_plan(make_scan([a, b]), cfg(trip_mode="split"), NAMES)
        self.assertIn("日本 / 大阪（Osaka） 2026.3", by_path(plan))
        self.assertIn("日本 / 大阪（Osaka） 2026.8", by_path(plan))

    def test_merge_trips_named_by_first_visit(self):
        a = photo("n", "2026-03-01T10:00:00+09:00", country="Japan", city="Osaka")
        b = photo("o", "2026-08-01T10:00:00+09:00", country="Japan", city="Osaka")
        plan = build_plan(make_scan([a, b]), cfg(), NAMES)
        self.assertEqual(list(by_path(plan)), ["日本 / 大阪（Osaka） 2026.3"])


if __name__ == "__main__":
    unittest.main()
