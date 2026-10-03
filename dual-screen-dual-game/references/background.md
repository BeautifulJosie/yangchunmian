# 原理与踩坑记录

给 AI 和想深究的人看。下面都是作者实际踩过、验证过的结论（Windows 11 23H2，RTX 4060 Ti，DELL 2K 显示器 + 三星 4K 电视，英雄联盟 + 光与影：33 号远征队）。

## 为什么"直接接上"不行

Windows 同一时刻只有一个**前台窗口**。用鼠标操作主屏游戏时，副屏游戏一直是"后台"状态：

| 现象 | 原因 |
|---|---|
| 副屏游戏没声 | 游戏有"未聚焦时音量"设置，默认 0。远征队把它存在游戏存档里，`GameUserSettings.ini` 里的 `NotFocusedVolume` 只是镜像，改 ini 没用 |
| 手柄 A / View 键失灵，摇杆和镜头正常 | 虚幻引擎的 UI 输入层在窗口不活跃时会丢弃手柄按键；移动和镜头走的是另一条输入通道 |
| 手柄完全不动 | Steam 输入按前台窗口分配手柄信号，前台是别的程序时手柄就被 Steam 截走 |

## Special K 做了什么

[Special K](https://github.com/SpecialKO/SpecialK) 以 `dxgi.dll` 的名字放在游戏 exe 旁边。游戏启动时会先加载它，它再转调系统真正的 `dxgi.dll`，夹在中间改游戏的窗口、输入、帧率行为。

| 配置（`dxgi.ini`） | 作用 |
|---|---|
| `[Window.System] RenderInBackground=true` | 拦截"失去焦点"消息，游戏一直以为自己在前台：照常渲染、收手柄、出声 |
| `MuteInBackground=false` | 后台不静音 |
| `Borderless=true` + `Fullscreen=true` | 无边框窗口铺满所在显示器 |
| `PreferredMonitor` / `PreferredMonitorExact` | 首选显示器。`Exact` 是显示器的硬件接口路径，排列或编号变了也认得；数字 ID 只在找不到 `Exact` 时兜底 |
| `[Display.Output] ForceWindowed=true` | 禁止独占全屏 |
| `[Render.FrameRate] TargetFPS` | 锁帧 |
| `[Scheduler.Boost] RaisePriorityInBackground=true` | 后台时把进程优先级提到"高于正常" |

注意：

- Special K 自己用 **UTF-16 LE（带 BOM）** 保存 `dxgi.ini`，游戏退出时会整份重写。所以只能在游戏关闭时改。
- `PreferredMonitorExact` 的格式是 `\\?\DISPLAY#<型号代码>#<实例>#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}`，对应 Win32 `EnumDisplayDevices(<适配器>, 0, …, EDD_GET_DEVICE_INTERFACE_NAME)` 返回的 `DeviceID`，和 Special K 自己写的 `LastMonitorPath` 一样。
- 游戏不会记住"被外部程序挪过的窗口位置"：远征队退出时写回的还是自己记的旧坐标。所以要靠 Special K 的首选显示器，或者游戏关闭时改游戏配置里的 `WindowPosX/Y`。
- 只能用于单机 / 无反作弊游戏。英雄联盟、无畏契约的 Vanguard 是内核级反作弊，连 Parsec / Moonlight 这类串流软件注入的鼠标都会拦。

## 虚幻引擎的无边框窗口只占副屏一部分

UE 游戏的"无边框"模式按**主屏分辨率**开窗口。主屏 2560×1440、电视 3840×2160 时，窗口只占电视左上角 2/3。解法：Special K 的 `Fullscreen=true` 撑满，或者把电视桌面分辨率设成 2560×1440（电视自己放大）。

## 独占全屏 → 电视没声

电视喇叭走 HDMI，声音和画面共用一条链路。独占全屏启动、切换刷新率、改分辨率，都会让 HDMI 重新握手，电视的音频设备短暂消失，Windows 就把默认播放设备换到别处（比如主板上空着的 Realtek 口）。游戏恰好在这时初始化音频，就绑到了错误的设备上，而且不会自己换回来。用无边框窗口可以避免。

## 按程序固定输出设备（Set-AppAudioDevice.ps1）

用的是 Windows 未公开的 WinRT 激活工厂 `Windows.Media.Internal.AudioPolicyConfig`，接口 `IAudioPolicyConfigFactory`，IID `ab3d4648-e242-459f-b02f-541c70306324`（Windows 10 21H2 起；EarTrumpet、SoundVolumeView 用的也是它）。

- Windows 11 23H2（22631）上，`SetPersistedDefaultAudioEndpoint` / `GetPersistedDefaultAudioEndpoint` 之前有 **19 个**用不到的虚表槽位（一些旧代码写的是 18 个）。作者用一个已知的绑定反读校准过。
- 设备 ID 要传完整的 HSTRING：`\\?\SWD#MMDEVAPI#{0.0.0.00000000}.{端点 GUID}#{e6327cad-dcec-4949-ae8a-991e976a79d2}`。传 `IntPtr.Zero`（空 HSTRING）表示取消固定。
- 只对**当前有音频会话**的进程有效，否则返回 `E_INVALIDARG (0x80070057)`。
- 设置按 exe 持久化。注册表 `HKCU\Software\Microsoft\Internet Explorer\LowRegistry\Audio\PolicyConfig\PropertyStore` 里那一堆 `设备|exe` 条目只是会话历史，不代表当前绑定。
- 这个绑定偶尔会被清掉（之后程序就跟随默认设备），连上蓝牙耳机时就会表现为"声音跑到耳机"。重新设一次即可。

## 其他踩过的坑

- **设备莫名被静音**：Parsec 有个默认开启的选项「连接自己的电脑时静音主机扬声器」（`server_admin_mute`）。正常断开会恢复，异常断开就留着静音。要改它，在 `%APPDATA%\Parsec\config.txt` 里加一行 `server_admin_mute=0`，再重启 Parsec，它会自己迁移进 `config.json`。直接改 `config.json` 会在重启时被丢弃。
- **DLSS 帧生成卡死**：副屏分辨率中途变化（比如电视被重新识别成 2560×1600）后，Special K 日志 `logs\dxgi.log` 每帧都刷 `NVSDK_NGX_D3D12_EvaluateFeature (…, DLSS Frame Generation, …) Failed`，游戏画面卡住、声音停。把分辨率改回去并关掉帧生成即可。
- **主屏被锁 60 帧**：主屏刷新率被系统回落到 59/60Hz。无边框模式下帧率受刷新率限制，改回 144/165Hz 就好。
- **显示器编号会变**：`\\.\DISPLAY1/2` 的编号、主副屏的左右位置都可能变化。脚本一律按主屏优先、再按从左到右排序号，并显示型号，不要凭记忆用旧编号。
