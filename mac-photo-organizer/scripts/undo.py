#!/usr/bin/env python3
"""撤销一次 apply:删除那次新建的相簿(照片仍在图库),把追加进已有相簿的照片移出。

未分类不恢复——它每次都按计划重建,重新跑 plan + apply 即可。
"""
import argparse

from common import read_json, workdir_arg


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--run", help="runs/ 下的文件名,默认最近一次")
    parser.add_argument("--yes", action="store_true", help="用户已确认,真正执行")
    args = parser.parse_args()

    runs = sorted((args.workdir / "runs").glob("*.json"))
    if not runs:
        print("没有可撤销的执行记录")
        return
    run_path = args.workdir / "runs" / args.run if args.run else runs[-1]
    run = read_json(run_path)
    print(f"撤销 {run_path.name}:删除 {len(run['created_albums'])} 个新建相簿,"
          f"从 {len(run['added'])} 个已有相簿移出照片")
    if not args.yes:
        print("\n未执行。确认后加 --yes 运行。")
        return

    from photos_adapter import Photos
    photos = Photos()
    for item in run["added"]:
        album = photos.album(item["album_path"])
        if album is not None:
            photos.remove(album, item["uuids"])
            print(f"✓ 移出 {' / '.join(item['album_path'])}:{len(item['uuids'])} 张")
    for path in run["created_albums"]:
        album = photos.album(path)
        if album is not None:
            photos.delete_album(album)
            print(f"✓ 删除相簿 {' / '.join(path)}")
    # 嵌套文件夹删不可靠,只删顶层的;删掉顶层后它下面的也一起没了
    deleted = set()
    for path in run["created_folders"]:
        if len(path) == 1 and photos.delete_top_folder_if_empty(path):
            deleted.add(path[0])
            print(f"✓ 删除空文件夹 {path[0]}")
    for path in run["created_folders"]:
        if path[0] not in deleted:
            print(f"· 请在「照片」里手动删除空文件夹:{' / '.join(path)}")
    run_path.rename(run_path.with_suffix(".undone"))


if __name__ == "__main__":
    main()
