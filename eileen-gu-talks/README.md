# 谷爱凌说 · Eileen Gu, In Her Own Words

一本免费分享的中英双语网页书：按时间读谷爱凌 2022–2026 年的 19 篇公开演讲、访谈和自述，重点是她**怎么看成长、情绪、做决定和待人处事**。每章中英对照、金句加粗，章末可以**页内直接播放原视频**，并给出官方全文入口；右上角可以**搜关键词跳到对应段落**；还能一键下载 EPUB 导入微信读书。

**在线阅读：** https://beautifuljosie.github.io/yangchunmian/eileen-gu-talks/

> 打开方式提醒：请用上面的网址在线看，或者在电脑上起一个本地服务再打开。直接双击 `index.html` 也能读，但 YouTube / B 站不允许在本地文件里内嵌播放，那时点播放会跳到原站。

---

## 页面长什么样

- 封面 + 「写在前面」：这本书是什么、不是什么
- **按主题读**：情绪 / 成长 / 做决定 / 待人 / 自我 五组导读，每条链到对应章节
- 19 章正文，每章「背景 → 她说了什么 → 为什么值得听」，中英对照，加粗的是提炼要点
- 每章末尾：本章金句（每条附报道出处）、**点击即播的原视频**、原文与完整报道入口
- 附录：全部金句合集
- 下载页：EPUB（微信读书 / Apple Books / Kobo）和 Markdown
- 右上角：中 / EN / 双语切换；关键词搜索（回车跳第一条，↑↓ 切换，按 `/` 聚焦）

## 这本书是什么 / 不是什么

- **是**：原创的解读与学习笔记，免费分享、不作商业用途。
- **不是**：演讲逐字稿。演讲与访谈的版权属于讲者和发布平台，书里只保留被公开报道过的极短名句并逐条标注出处；想看原话，用章末的视频和官方全文链接。
- 每条视频链接收录前都核实过存在；找不到可靠来源的讲话不收录。

---

## 怎么用

**只是想读**：打开上面的在线地址就行。想离线看，点页面里的「下载 EPUB」导入微信读书。

**想照着做一本自己关心的人物的书**（比如某位企业家、运动员、作家的演讲合集）：打开你自己的 AI（Claude Code、Cursor、Codex 这类能读写文件、能联网的都可以），把下面这段话整段复制发给它：

```text
请用这个模板帮我做一本「某某说」双语演讲解读网页书：
https://github.com/BeautifulJosie/yangchunmian/tree/main/eileen-gu-talks

1. 先把这个文件夹完整下载到我电脑上一个新文件夹里，比如运行
   npx degit BeautifulJosie/yangchunmian/eileen-gu-talks my-talks-book
   如果用不了这条命令，可以用 git 稀疏检出，或者逐个下载里面的文件。
2. 读 README.md 和 content/book.json，弄清每章的字段：sections（正文，{zh,en} 成对，
   **双星号** 包住的句子会加粗）、quotes（金句，必须附 source 出处链接）、
   videos（原视频，收录前用 YouTube oEmbed 或 B 站接口核实存在）、readings（官方全文入口）。
3. 问我要人物名字和我关心的主题，然后你去联网找 TA 有原视频或官方全文可查的演讲 / 访谈，
   每一条都核实链接存在，找不到的不要编。
4. 按 book.json 的格式写内容：用自己的话写解读，不要抄逐字稿；直接引语只用媒体报道过的短句并附出处。
5. 运行 uv run --python 3.12 build/build.py，生成 index.html、downloads/*.epub 和 *.md，
   然后用 uv run --python 3.12 python -m http.server 8766 打开给我看。
```

## 文件结构

```
index.html             # 生成物：网页书（打开即读）
downloads/*.epub|.md   # 生成物：EPUB 与 Markdown
content/book.json      # 唯一内容源：书名、前言、主题导读、每章正文 / 金句 / 视频 / 原文入口
build/build.py         # 一条命令生成以上全部（需要 uv，会自动拉 Python 3.12）
build/book.css|js      # 网页样式与交互（语言切换、搜索、点击播放、侧边目录）
assets/cover.jpg       # 可选：放一张封面图，会自动打进 EPUB
```

本地构建与预览：

```bash
uv run --python 3.12 build/build.py
```

```bash
uv run --python 3.12 python -m http.server 8766
```

## 版权

- 代码（`build/`）：MIT。
- 正文解读（`content/`、`index.html`、`downloads/`）：CC BY-NC 4.0，可自由转载分享，注明来源，不得用于商业用途。
- 视频与原话版权归原发布者所有，本书仅做链接、内嵌播放与极短引用。
