# 可选：跨设备待办同步

默认情况下，`template/index.html` 的待办清单只存在你自己浏览器的 `localStorage` 里——
换设备、换人看，都是各自独立的一份。

如果想要"发出去的这一个链接，不同朋友打开都能加待办、勾待办，谁改了大家都能看到"，
按下面几步配一个免费的 Supabase 项目就行，不用自己写后端。

## 1. 建一个 Supabase 项目

去 [supabase.com](https://supabase.com) 免费注册、新建一个项目（选离自己近的区域，建好等 1~2 分钟初始化）。

## 2. 建表

项目建好后，进左侧 **SQL Editor**，把同目录下 `schema.sql` 整段复制粘贴进去，点 Run。

这会建一张 `todo_items` 表，并打开允许任何人读写的 RLS 策略（同一个 `trip_id` 下的人互相信任，
谁都能加/改/删——如果同行人里有你不完全信任的人，酌情收紧 `schema.sql` 里的策略）。

## 3. 拿到连接信息

左侧 **Project Settings → API**，复制这两项：

- **Project URL**（形如 `https://xxxx.supabase.co`）
- **anon public** key（一长串字符，公开可嵌入前端页面，是 Supabase 设计如此——真正的权限控制在第 2 步的
  RLS 策略上，不在于这个 key 保不保密）

## 4. 填进模板

打开 `template/index.html`，找到靠近 `</head>` 前面 `<script>` 里的这一段（就在待办清单的 JS 最上面）：

```js
var SYNC = {
  enabled: true,
  supabaseUrl: '',
  supabaseAnonKey: '',
  tripId: 'my-trip'
};
```

改成：

```js
var SYNC = {
  enabled: true,
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: '你的 anon public key',
  tripId: '一个不容易被猜到的字符串，比如 osaka-2026-with-friends'
};
```

`enabled` 不用动，默认就是 `true`——只要 `supabaseUrl`/`supabaseAnonKey` 还是空字符串，
同步代码就不会真的发起连接。需要临时强制关闭同步（比如调试）时，把它改成 `false` 即可。

`tripId` 相当于这次旅行的房间号——只有 `SYNC` 配置完全一样（同一个 Supabase 项目 + 同一个
`tripId`）的页面，待办才会同步到一起。**不要用"trip"这种容易被猜到的词**，因为同一个 Supabase
项目下，知道 `tripId` 的人理论上都能读写这些待办（RLS 策略是按 `trip_id` 过滤，不是按访问者身份）。

保存后，把改好的 `index.html` 发布出去（见根目录 README「发布分享」），不同的朋友打开同一个链接，
待办清单就会互相同步了：一个人加了新待办、勾了/改了/删了某一条，其他人打开着的页面会实时更新。

## 5. 没配置的话会怎样

`supabaseUrl`/`supabaseAnonKey` 保持空字符串（默认值）时，就算 `enabled` 是 `true`，
待办清单也完全退回纯本地模式，跟没有这个功能一样正常用；就算填错了 URL/key，页面也只会在
浏览器控制台打一行警告、自动退回本地模式，不会白屏。

## 费用

Supabase 免费额度（Free Plan）对朋友旅行这种量级的读写完全够用，不需要绑卡。
