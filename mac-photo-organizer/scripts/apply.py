#!/usr/bin/env python3
"""按 plan.json 在「照片」App 里建相簿、加照片,并重建未分类。

不带 --yes 只打印将要做的事。每次执行写一份 runs/*.json 供 undo.py 撤销。
"""
import argparse
from datetime import datetime

from common import read_json, workdir_arg, write_json


def summarize(plan: dict) -> None:
    new = [a for a in plan["actions"] if not a["existing"]]
    old = [a for a in plan["actions"] if a["existing"]]
    print(f"新建相簿 {len(new)} 个,追加到已有相簿 {len(old)} 个,"
          f"共 {sum(len(a['uuids']) for a in plan['actions'])} 张")
    uc = plan["unclassified"]
    print(f"重建 {uc['folder']}:" + ",".join(f"{n} {len(uc['albums'].get(n, []))} 张" for n in uc["all_names"]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--yes", action="store_true", help="用户已确认,真正执行")
    parser.add_argument("--sandbox", metavar="文件夹名",
                        help="试运行:所有相簿都建在这个顶层文件夹里,不碰任何已有相簿")
    parser.add_argument("--limit", type=int, help="试运行用:每个相簿最多加几张")
    args = parser.parse_args()

    plan = read_json(args.workdir / "plan.json")
    if args.sandbox:
        for act in plan["actions"]:
            act["album_path"] = [args.sandbox] + act["album_path"]
    if args.limit:
        for act in plan["actions"]:
            act["uuids"] = act["uuids"][:args.limit]
        uc = plan["unclassified"]["albums"]
        for name in uc:
            uc[name] = uc[name][:args.limit]
    summarize(plan)
    if plan["untranslated"] and any(plan["untranslated"].values()):
        print("提醒:还有未翻译的地名,相簿会用原始地名命名。")
    if not args.yes:
        print("\n未执行。确认后加 --yes 运行。")
        return

    from photos_adapter import Photos
    photos = Photos()
    run = {"started_at": datetime.now().isoformat(), "created_folders": [],
           "created_albums": [], "added": []}
    run_path = args.workdir / "runs" / f"{datetime.now():%Y%m%d-%H%M%S}.json"

    try:
        for act in plan["actions"]:
            path = act["album_path"]
            album = photos.album(path)
            if album is None:
                album = photos.create_album(path, run["created_folders"])
                run["created_albums"].append(path)
            else:
                run["added"].append({"album_path": path, "uuids": act["uuids"]})
            photos.add(album, act["uuids"])
            print(f"✓ {' / '.join(path)}:{len(act['uuids'])} 张")

        # 未分类由 skill 管理:删掉旧的子相簿(照片还在图库里)再按本次计划重建
        uc = plan["unclassified"]
        uc_folder = ([args.sandbox] if args.sandbox else []) + [uc["folder"]]
        for name in uc["all_names"]:
            old = photos.album(uc_folder + [name])
            if old is not None:
                photos.delete_album(old)
            uuids = uc["albums"].get(name, [])
            if uuids:
                path = uc_folder + [name]
                photos.add(photos.create_album(path, run["created_folders"]), uuids)
                run["created_albums"].append(path)
            print(f"✓ {' / '.join(uc_folder)} / {name}:{len(uuids)} 张")
    finally:
        write_json(run_path, run)
        print(f"执行记录:{run_path}")


if __name__ == "__main__":
    main()
