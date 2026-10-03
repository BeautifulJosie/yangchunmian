---
name: mac-photo-organizer
description: 按「国家 → 州/省 → 地点 年.月」框架整理 Mac「照片」App 图库——读照片的拍摄时间和定位,自动建文件夹和相簿,分不出来的放进「📥 未分类」供用户手动拖。凡是用户说"整理照片/整理图库/整理相册/按旅行地点分类照片/把新照片归档"时使用。只加相簿,不移动、不删除、不修改任何照片。
---

# Mac 图库整理

把 Mac「照片」App 里的照片按旅行地点自动归进分层相簿。框架规则详见 [references/framework.md](references/framework.md)。

## 红线(任何时候都不能违反)

1. **不删、不移、不改任何照片。** 只做两件事:建文件夹/相簿,把照片加进相簿。
2. **没有用户明确确认,不执行 apply。** 先给计划预览,用户在对话里说"确认/执行"才跑 `apply.py --yes`。
3. **只碰 skill 自己管的东西。** 地理文件夹(国家层)里新建的相簿、`📥 未分类` 文件夹。用户的主题相簿(如"滑雪""婚礼")和 `protected_albums` 里的一律不动。
4. **尊重手动归类。** 已经在任何地理相簿里的照片,永远不重新分配——哪怕自动判断的地点不同。
5. **不手写删除命令。** 不要自己拼 AppleScript 去删文件夹或相簿——「照片」按名字引用嵌套文件夹时会忽略父级,`folder "日本" of folder "试运行"` 会删掉顶层真正的「日本」。删除只走 `apply.py` / `undo.py`,它们按对象定位且只删顶层空文件夹。
6. **隐私:** `scan.json` 含 GPS 坐标,只留在本地工作目录 `.mac-photo-organizer/`;对话里不要贴坐标,只说地名和数量。

## 工作目录

所有中间文件放在 `~/.mac-photo-organizer/`(可用 `--workdir` 改):

| 文件 | 谁写 | 内容 |
|---|---|---|
| `config.yaml` | 首次从 `config.example.yaml` 复制,用户/Claude 调整 | 层级、命名、未分类等规则 |
| `names.yaml` | Claude 维护 | 原始地名 → 显示名(翻译、双语、合并) |
| `scan.json` | `scan.py` | 每张照片的时间、定位、所在相簿(只读快照) |
| `plan.json` / `plan.md` | `plan.py` | 整理计划 + 给人看的预览 |
| `runs/*.json` | `apply.py` | 每次执行的记录,用于撤销 |

## 流程

### 0. 环境(首次)

用户多半不懂命令行,环境由你装好,不要让用户自己敲命令。依赖需要 **Python 3.10+**(macOS 自带的 3.9 不行)。在本文件夹里建一个虚拟环境:

```bash
# 有 uv 就用 uv(会自动下载合适的 Python)
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt
# 没有 uv:找一个 3.10+ 的 python3(如 Homebrew 的),再
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

之后所有脚本都用 `.venv/bin/python` 运行(下文写的 `python3` 都指它)。哪种都装不上,告诉用户需要先装 Python 3.10+ 或 uv,给出官网链接,不要替用户改系统设置。

需要用户在「系统设置 → 隐私与安全性 → 完全磁盘访问权限」里给终端或 Claude 授权(scan 要读图库数据库),这一步只能用户自己点;scan 报 `Operation not permitted` 就是没开。首次写入时 macOS 还会弹窗请求控制「照片」,让用户点允许。脚本只在 macOS 上可用。

### 1. 扫描(只读)

先告诉用户要读图库的时间和定位,得到同意再跑:

```bash
python3 scripts/scan.py
```

### 2. 首次使用:推断用户已有的框架

如果 `~/.mac-photo-organizer/config.yaml` 不存在:

1. 复制 `config.example.yaml` 过去。
2. 读 `scan.json` 里的 `albums` 列表(只有相簿路径和张数),看用户是否已经有手工整理的结构。有的话,按 [framework.md](references/framework.md) 的「从已有结构反推配置」一节调整 config:哪些国家有州/省层、相簿名格式、双语习惯、根目录主题相簿要加进 `protected_albums`。
3. 把推断结果用三五行告诉用户,有拿不准的(比如同地多次旅行怎么分)再问。

图库是空的或完全没整理过,就用默认配置。

### 3. 生成计划(纯计算,不碰图库)

```bash
python3 scripts/plan.py
```

看输出里的 `untranslated`:有没翻译的地名时,按 framework.md 的命名规则把它们写进 `names.yaml`,再跑一次 plan,直到 `untranslated` 为空。

### 4. 给用户看预览

把 `plan.md` 的要点讲给用户:新建哪些相簿、往哪些已有相簿追加多少张、未分类各多少张、有什么 warning(例如"某国家地点已超过阈值,建议加州/省层")。**等用户确认。**

用户想调整(改名、换归属、合并地点)→ 改 `names.yaml` / `config.yaml` 的 `place_overrides`,回到第 3 步。

### 5. 执行

建议先试运行:所有相簿建在一个独立的顶层文件夹里,不碰任何已有相簿,让用户在「照片」里直观看一遍效果:

```bash
python3 scripts/apply.py --yes --sandbox "🧪 试运行" --limit 5
python3 scripts/undo.py --yes      # 看完撤掉试运行
```

用户满意后正式执行:

```bash
python3 scripts/apply.py --yes
```

不带 `--yes` 只打印将要做的事,不执行。

### 6. 告诉用户未分类怎么处理

- `📥 未分类` 下按原因分子相簿:无定位 / 地点不明。截图和存图不是旅行照片,直接忽略,不会出现在这里。
- 用户把照片**拖进**已建好的地理相簿即可。照片 App 的拖拽是"添加",原照片还会留在未分类里——**下次运行会自动从未分类里去掉**,不用手动删。
- 未分类文件夹由本 skill 管理,每次 apply 都重建。用户别往里面放自己的东西。

### 7. 撤销

```bash
python3 scripts/undo.py                 # 先看会撤销什么
python3 scripts/undo.py --yes           # 用户确认后撤销最近一次
python3 scripts/undo.py --run <文件名> --yes
```

删除本次新建的相簿(只删相簿,照片还在图库里),把追加进已有相簿的照片移出。

## 增量整理

以后用户说"把新照片归档",直接从第 1 步跑:已在地理相簿里的照片自动跳过,新照片能对上已有相簿就追加,对不上才新建。

## 排错

- `scan.py` 报权限错误:系统设置 → 隐私与安全性 → 照片 / 完全磁盘访问权限,给终端或 Claude 授权。
- 地名全是英文:照片 App 的反向地理编码跟随系统语言,靠 `names.yaml` 翻译,不需要改系统语言。
- 某景点被归错州/省:在 `config.yaml` 的 `place_overrides` 里指定。
