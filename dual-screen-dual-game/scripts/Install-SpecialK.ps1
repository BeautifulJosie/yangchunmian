<#
.SYNOPSIS
  给"放在副屏、用手柄玩"的那个游戏装上 Special K，并写好配置：
  后台照常渲染、收手柄、出声；无边框铺满指定显示器；锁帧；后台提高优先级。

.EXAMPLE
  # 先启动游戏，再按进程名安装（推荐，能自动找到游戏目录）
  .\Install-SpecialK.ps1 -Process SandFall-Win64-Shipping -Monitor 2 -DryRun
  .\Install-SpecialK.ps1 -Process SandFall-Win64-Shipping -Monitor 2

  # 或者直接给游戏 exe 所在目录（游戏不用开着）
  .\Install-SpecialK.ps1 -GameDir "D:\Steam\steamapps\common\Expedition 33\Sandfall\Binaries\Win64" -Monitor 2

  # AI 被安全策略拦住、不能往游戏目录放 DLL 时：只写配置，打开两个文件夹让用户自己拖
  .\Install-SpecialK.ps1 -GameDir "..." -Monitor 2 -SkipDll

  # 卸载（只删 Special K 的 dxgi.dll，别的不动）
  .\Install-SpecialK.ps1 -GameDir "..." -Uninstall

.NOTES
  - 会拒绝安装到带反作弊的游戏（EasyAntiCheat、BattlEye、Vanguard 等），那样会被当成外挂。
  - 游戏目录里已经有别的 dxgi.dll（比如 ReShade）时会停下，不覆盖。
  - 适用于 DX11 / DX12 游戏（绝大多数新游戏）。DX9、Vulkan、OpenGL 游戏不适用。
  - Special K 官网：https://github.com/SpecialKO/SpecialK
#>
param(
    [string]$Process,
    [string]$GameDir,
    [int]$Monitor = 0,
    [int]$TargetFps = 60,
    [switch]$SkipDll,
    [switch]$Uninstall,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
. (Join-Path $PSScriptRoot 'common.ps1')

function Info($m)  { Write-Host $m }
function Ok($m)    { Write-Host $m -ForegroundColor Green }
function Warn($m)  { Write-Host $m -ForegroundColor Yellow }
function Stop-With($m) { Write-Host $m -ForegroundColor Red; exit 1 }

# ---------- 1. 找到游戏目录 ----------
$proc = $null
if ($Process) {
    $proc = Get-Process -Name ($Process -replace '\.exe$', '') -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1
    if (-not $proc) { Stop-With "没有找到正在运行的「$Process」。先启动游戏，或者改用 -GameDir 直接给目录。" }
    $GameDir = Split-Path $proc.Path
    $exe = $proc.Path
} elseif ($GameDir) {
    if (-not (Test-Path $GameDir -PathType Container)) { Stop-With "目录不存在：$GameDir" }
    $GameDir = (Resolve-Path $GameDir).Path
    $exe = Get-ChildItem $GameDir -Filter *.exe -File | Sort-Object Length -Descending | Select-Object -First 1 | ForEach-Object FullName
} else {
    Stop-With '请用 -Process <进程名>（游戏开着）或 -GameDir <游戏 exe 所在目录> 指定游戏。'
}
Info "游戏目录：$GameDir"
if ($exe) { Info "游戏程序：$(Split-Path $exe -Leaf)" }

$dllPath = Join-Path $GameDir 'dxgi.dll'
$iniPath = Join-Path $GameDir 'dxgi.ini'

function Test-IsSpecialK([string]$path) {
    if (-not (Test-Path $path)) { return $false }
    $vi = (Get-Item $path).VersionInfo
    return (("$($vi.ProductName) $($vi.FileDescription) $($vi.InternalName)") -match 'Special\s*K')
}

# ---------- 卸载 ----------
if ($Uninstall) {
    if (-not (Test-Path $dllPath)) { Ok '游戏目录里没有 dxgi.dll，本来就没装。'; exit 0 }
    if (-not (Test-IsSpecialK $dllPath)) { Stop-With 'dxgi.dll 不是 Special K（可能是 ReShade 等别的工具），不动它。' }
    if ($DryRun) { Info "[试运行] 将删除：$dllPath"; exit 0 }
    Remove-Item $dllPath -Force
    Ok "已删除 $dllPath。dxgi.ini 和 logs 文件夹留着无害，想清干净可以一起删。"
    exit 0
}

# ---------- 2. 安全检查 ----------
# 反作弊：游戏目录及往上 3 层里出现这些名字就拒绝
$acPattern = 'EasyAntiCheat|BattlEye|BEService|EAAntiCheat|Vanguard|vgc\.exe|nProtect|GameGuard|XIGNCODE|PunkBuster|mhyprot|ACE-|AntiCheatExpert|TenProtect|TP3Helper'
$probe = $GameDir
$acHits = @()
for ($lvl = 0; $lvl -le 3 -and $probe; $lvl++) {
    $acHits += @(Get-ChildItem $probe -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $acPattern } | ForEach-Object FullName)
    $probe = Split-Path $probe -Parent
}
if ($GameDir -match 'Riot Games|League of Legends|VALORANT') { $acHits += 'Riot 游戏（Vanguard 反作弊）' }
if ($acHits.Count -gt 0) {
    Stop-With ("检测到反作弊组件，拒绝安装（会被当成外挂，有封号风险）：`n  " + (($acHits | Select-Object -Unique) -join "`n  ") +
               "`nSpecial K 只用于单机 / 无反作弊的游戏。双屏双游戏里，带反作弊的那个游戏放主屏、用键鼠玩，它不需要 Special K。")
}

# 32/64 位
$bits = 64
if ($exe) {
    $fs = [IO.File]::OpenRead($exe)
    try {
        $br = New-Object IO.BinaryReader($fs)
        $fs.Position = 0x3C; $pe = $br.ReadInt32(); $fs.Position = $pe + 4
        $machine = $br.ReadUInt16()
        if ($machine -eq 0x14c) { $bits = 32 }
    } finally { $fs.Close() }
}
Info "程序位数：$bits 位"

# 已有 dxgi.dll
$upgrade = $false
if (Test-Path $dllPath) {
    if (Test-IsSpecialK $dllPath) { $upgrade = $true; Info "已经装过 Special K（版本 $((Get-Item $dllPath).VersionInfo.FileVersion)），这次只更新配置。" }
    else { Stop-With "游戏目录里已经有一个不是 Special K 的 dxgi.dll（可能是 ReShade 等），为了不弄坏它，停止。需要的话请先自己处理。" }
}

# 游戏开着且 Special K 已加载 → Special K 退出时会重写 dxgi.ini，现在改会被覆盖
if ($proc -and $upgrade) {
    $loaded = $false
    try { $loaded = [bool]($proc.Modules | Where-Object { $_.FileName -eq $dllPath }) } catch { }
    if ($loaded) { Stop-With "游戏正在运行且 Special K 已加载，现在改配置会在游戏退出时被覆盖。请先退出游戏，再用 -GameDir `"$GameDir`" 重新运行。" }
}

# ---------- 3. 目标显示器 ----------
$mon = $null
if ($Monitor -gt 0) {
    $mon = Get-DsdgMonitors | Where-Object Index -eq $Monitor
    if (-not $mon) { Stop-With "没有序号为 $Monitor 的显示器。先跑 Diagnose.ps1 或 Move-WindowToMonitor.ps1 -List 看序号。" }
    Info ("目标显示器：" + (Format-DsdgMonitor $mon))
}

# ---------- 4. 下载 Special K ----------
$cache = Join-Path $env:TEMP 'dsdg-specialk'
$srcDll = Join-Path $cache $(if ($bits -eq 32) { 'SpecialK32.dll' } else { 'SpecialK64.dll' })
if (-not $upgrade) {
    if (-not (Test-Path $srcDll)) {
        if ($DryRun) { Info '[试运行] 将从 GitHub 下载最新版 Special K。' }
        else {
            New-Item -ItemType Directory -Force $cache | Out-Null
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Info '正在查询 Special K 最新版本……'
            $rel = Invoke-RestMethod 'https://api.github.com/repos/SpecialKO/SpecialK/releases/latest' -Headers @{ 'User-Agent' = 'dual-screen-dual-game' }
            $asset = $rel.assets | Where-Object { $_.name -match '\.7z$' } | Select-Object -First 1
            if (-not $asset) { Stop-With "最新版本 $($rel.tag_name) 里没找到 .7z 安装包，请到 https://github.com/SpecialKO/SpecialK/releases 手动下载。" }
            $archive = Join-Path $cache $asset.name
            Info "正在下载 $($rel.tag_name) / $($asset.name)（$([math]::Round($asset.size / 1MB, 1)) MB）……"
            Invoke-WebRequest $asset.browser_download_url -OutFile $archive -UseBasicParsing
            & tar.exe -xf $archive -C $cache
            if ($LASTEXITCODE -ne 0 -or -not (Test-Path $srcDll)) {
                Stop-With "解压失败（Windows 自带的 tar 解不开 .7z 时会这样）。请用 7-Zip 手动解压 $archive，把里面的 $(Split-Path $srcDll -Leaf) 放到 $cache 后重新运行。"
            }
            Ok "已下载：Special K $((Get-Item $srcDll).VersionInfo.FileVersion)"
        }
    } else {
        Info "使用已下载的 Special K $((Get-Item $srcDll).VersionInfo.FileVersion)（$srcDll）"
    }
}

# ---------- 5. 写 dxgi.ini（已有就只改相关项，其余保留） ----------
$settings = [ordered]@{
    'Window.System'   = [ordered]@{ RenderInBackground = 'true'; MuteInBackground = 'false'; Borderless = 'true'; Fullscreen = 'true'; Center = 'false' }
    'Display.Output'  = [ordered]@{ ForceWindowed = 'true'; ForceFullscreen = 'false' }
    'Render.FrameRate'= [ordered]@{ TargetFPS = ('{0}.0' -f $TargetFps); BackgroundFPS = '0.0' }
    'Scheduler.Boost' = [ordered]@{ RaisePriorityInBackground = 'true' }
}
if ($mon) {
    $settings['Window.System']['PreferredMonitor'] = "$($mon.GdiId)"
    if ($mon.Path) { $settings['Window.System']['PreferredMonitorExact'] = $mon.Path }
}

function Set-IniValues([string]$text, $sections) {
    $lines = [Collections.Generic.List[string]]::new()
    if ($text) { $text -split "`r?`n" | ForEach-Object { $lines.Add($_) } }
    foreach ($sec in $sections.Keys) {
        $start = -1
        for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -eq "[$sec]") { $start = $i; break } }
        if ($start -lt 0) {
            if ($lines.Count -gt 0 -and $lines[$lines.Count - 1].Trim() -ne '') { $lines.Add('') }
            $lines.Add("[$sec]"); $start = $lines.Count - 1
        }
        $end = $lines.Count
        for ($i = $start + 1; $i -lt $lines.Count; $i++) { if ($lines[$i].Trim() -match '^\[.+\]$') { $end = $i; break } }
        foreach ($key in $sections[$sec].Keys) {
            $val = $sections[$sec][$key]; $hit = $false
            for ($i = $start + 1; $i -lt $end; $i++) {
                if ($lines[$i] -match ('^\s*' + [regex]::Escape($key) + '\s*=')) { $lines[$i] = "$key=$val"; $hit = $true; break }
            }
            if (-not $hit) {
                $ins = $end
                while ($ins -gt $start + 1 -and $lines[$ins - 1].Trim() -eq '') { $ins-- }
                $lines.Insert($ins, "$key=$val"); $end++
            }
        }
    }
    return ($lines -join "`r`n")
}

$enc = New-Object Text.UnicodeEncoding($false, $true)   # Special K 自己用 UTF-16 LE 带 BOM
$oldText = ''
if (Test-Path $iniPath) {
    $bytes = [IO.File]::ReadAllBytes($iniPath)
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { $oldText = [Text.Encoding]::Unicode.GetString($bytes, 2, $bytes.Length - 2) }
    else { $oldText = [Text.Encoding]::UTF8.GetString($bytes).TrimStart([char]0xFEFF) }
}
$newText = Set-IniValues $oldText $settings

if ($DryRun) {
    Write-Host ''
    Info '[试运行] 不做任何修改。将会：'
    if (-not $upgrade) { Info $(if ($SkipDll) { "  - 打开两个文件夹，请你把 $(Split-Path $srcDll -Leaf) 拖进游戏目录并改名为 dxgi.dll" } else { "  - 复制 $(Split-Path $srcDll -Leaf) → $dllPath" }) }
    Info "  - $(if ($oldText) { '更新' } else { '新建' }) $iniPath，写入："
    foreach ($sec in $settings.Keys) { Info "      [$sec]"; foreach ($k in $settings[$sec].Keys) { Info "      $k=$($settings[$sec][$k])" } }
    exit 0
}

if ($oldText) { Copy-Item $iniPath "$iniPath.bak" -Force; Info "原配置已备份：$iniPath.bak" }
[IO.File]::WriteAllText($iniPath, $newText, $enc)
Ok "已写入配置：$iniPath"

# ---------- 6. 放 DLL ----------
if (-not $upgrade) {
    if ($SkipDll) {
        Warn "请你手动完成最后一步：把「$(Split-Path $srcDll -Leaf)」拖进游戏目录，然后改名为 dxgi.dll。"
        Warn "  来源：$srcDll"
        Warn "  目标：$GameDir"
        Start-Process explorer.exe -ArgumentList "/select,`"$srcDll`""
        Start-Process explorer.exe -ArgumentList "`"$GameDir`""
    } else {
        Copy-Item $srcDll $dllPath -Force
        Ok "已安装：$dllPath（Special K $((Get-Item $dllPath).VersionInfo.FileVersion)）"
    }
}

Write-Host ''
Info '接下来：'
Info '  1. 游戏里把显示模式设成「无边框窗口」（Borderless / 无边框）。'
Info '  2. 如果是 Steam 游戏：库 → 右键游戏 → 属性 → 控制器 → 选「禁用 Steam 输入」。'
Info '  3. 重启游戏。第一次启动会弹出 Special K 的许可协议，接受即可。'
Info '  4. 切到另一个游戏，确认这个游戏仍有声音、手柄所有按键都能用。'
if ($proc) { Warn '  游戏现在还开着，Special K 要重启游戏后才生效。' }
