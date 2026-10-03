#!/usr/bin/env python3
"""只读扫描「照片」图库,输出每张照片的时间、定位、所在相簿到 scan.json。

不修改图库。scan.json 含 GPS 坐标,只留在本地工作目录。
"""
import argparse
from datetime import datetime, timezone

from common import workdir_arg, write_json


def _first(values):
    return values[0] if values else None


def photo_record(p) -> dict:
    lat, lon = p.location if p.location else (None, None)
    place = p.place
    names = place.names if place else None
    exif = p.exif_info
    return {
        "uuid": p.uuid,
        "date": p.date.isoformat(),
        "lat": lat,
        "lon": lon,
        "country_code": place.country_code if place else None,
        "country": _first(names.country) if names else None,
        "region": _first(names.state_province) if names else None,
        "sub_admin": _first(names.sub_administrative_area) if names else None,
        "city": _first(names.city) if names else None,
        "aoi": _first(names.area_of_interest) if names else None,
        "screenshot": bool(getattr(p, "screenshot", False)),
        "has_camera": bool(exif and exif.camera_make),
        "is_movie": bool(p.ismovie),
        "hidden": bool(p.hidden),
        "albums": [list(a.folder_names) + [a.title] for a in p.album_info],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--library", help="图库路径,默认用系统图库")
    args = parser.parse_args()

    import osxphotos  # 只在 macOS 上可用,放这里方便其他脚本在别处跑测试

    db = osxphotos.PhotosDB(dbfile=args.library) if args.library else osxphotos.PhotosDB()
    photos = [photo_record(p) for p in db.photos(intrash=False)]
    albums = [
        {"path": list(a.folder_names) + [a.title], "count": len(a.photos)}
        for a in db.album_info
    ]
    write_json(args.workdir / "scan.json", {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "photos": photos,
        "albums": albums,
    })
    located = sum(1 for p in photos if p["lat"] is not None)
    print(f"扫描完成:{len(photos)} 张照片,{located} 张有定位,{len(albums)} 个相簿")
    print(f"已写入 {args.workdir / 'scan.json'}")


if __name__ == "__main__":
    main()
