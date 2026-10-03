"""对「照片」App 的写操作,集中在这里。只建文件夹/相簿、加照片、删 skill 自己建的相簿。

删相簿只删相簿本身,照片仍在图库里。
"""
import photoscript

BATCH = 200


class Photos:
    def __init__(self):
        self.lib = photoscript.PhotosLibrary()

    def _children(self, parent):
        return self.lib.folders(top_level=True) if parent is None else parent.subfolders

    def folder(self, path, create=False, created=None):
        parent = None
        for depth, name in enumerate(path):
            found = next((f for f in self._children(parent) if f.name == name), None)
            if found is None:
                if not create:
                    return None
                found = self.lib.create_folder(name, folder=parent)
                if created is not None:
                    created.append(list(path[: depth + 1]))
            parent = found
        return parent

    def album(self, path):
        if len(path) == 1:
            return next((a for a in self.lib.albums(top_level=True) if a.name == path[0]), None)
        folder = self.folder(path[:-1])
        if folder is None:
            return None
        return next((a for a in folder.albums if a.name == path[-1]), None)

    def create_album(self, path, created_folders=None):
        folder = self.folder(path[:-1], create=True, created=created_folders) if len(path) > 1 else None
        return self.lib.create_album(path[-1], folder=folder)

    def add(self, album, uuids):
        for i in range(0, len(uuids), BATCH):
            album.add([photoscript.Photo(u) for u in uuids[i:i + BATCH]])

    def remove(self, album, uuids):
        # 照片 App 不支持直接移出,photoscript 的做法是重建相簿
        return album.remove([photoscript.Photo(u) for u in uuids])

    def delete_album(self, album):
        self.lib.delete_album(album)

    def _has_albums(self, folder):
        return bool(folder.albums) or any(self._has_albums(f) for f in folder.subfolders)

    def delete_top_folder_if_empty(self, path):
        """只删顶层、且整棵子树里没有相簿的文件夹。

        「照片」App 删嵌套文件夹不可靠:photoscript 会报错,按名字引用
        (folder "X" of folder "Y")会忽略父级、删掉同名的顶层文件夹。
        所以嵌套文件夹一律不删,留给用户手动处理。
        """
        if len(path) != 1:
            return False
        matches = [f for f in self.lib.folders(top_level=True) if f.name == path[0]]
        if len(matches) != 1 or self._has_albums(matches[0]):
            return False
        self.lib.delete_folder(matches[0])
        return True
