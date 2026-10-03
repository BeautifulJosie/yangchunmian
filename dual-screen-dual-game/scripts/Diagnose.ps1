<#
.SYNOPSIS
  只读体检：显示器、声音设备、正在运行的游戏、显卡负载、游戏模式。不改任何东西。
  AI 开始配置前先跑一次，配置完再跑一次对比。

.EXAMPLE
  .\Diagnose.ps1
#>
$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
. (Join-Path $PSScriptRoot 'common.ps1')

function Section($t) { Write-Host ''; Write-Host "== $t ==" -ForegroundColor Cyan }

Section '系统'
$os = Get-CimInstance Win32_OperatingSystem
Write-Host ("  {0}  版本 {1}  内部版本 {2}" -f $os.Caption, $os.Version, $os.BuildNumber)

Section '显示器（序号给 Install-SpecialK.ps1 -Monitor / Move-WindowToMonitor.ps1 -Monitor 用）'
$mons = @(Get-DsdgMonitors)
$mons | ForEach-Object { Write-Host ('  ' + (Format-DsdgMonitor $_)) }
if ($mons.Count -lt 2) { Write-Host '  只检测到一块屏幕。电视/副屏开机了吗？' -ForegroundColor Yellow }
$primary = $mons | Where-Object Primary
foreach ($m in ($mons | Where-Object { -not $_.Primary })) {
    if ($primary -and ($m.Width -gt $primary.Width -or $m.Height -gt $primary.Height)) {
        Write-Host ("  提示：副屏 [{0}] 分辨率比主屏高。虚幻引擎游戏的无边框窗口按主屏分辨率开，只会占副屏一部分；" -f $m.Index) -ForegroundColor Yellow
        Write-Host '        要么用 Special K 铺满，要么把副屏桌面分辨率设成和主屏一样（还能省显卡）。' -ForegroundColor Yellow
    }
}

Section '声音设备'
& (Join-Path $PSScriptRoot 'Get-AudioDevices.ps1')

Section '正在运行的游戏（Steam / Riot / Epic / GOG / 战网 / WeGame 目录下、有窗口的进程）'
$gameDirPattern = 'steamapps\\common|Riot Games|Epic Games|GOG Galaxy\\Games|Battle\.net|WeGameApps|XboxGames'
$found = $false
foreach ($p in (Get-Process | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero })) {
    $path = $null; try { $path = $p.Path } catch { }
    if (-not $path -or $path -notmatch $gameDirPattern) { continue }
    $found = $true
    $r = Get-DsdgWindowRect $p.MainWindowHandle
    $cx = $r.X + [int]($r.Width / 2); $cy = $r.Y + [int]($r.Height / 2)
    $on = $mons | Where-Object { $cx -ge $_.X -and $cx -lt ($_.X + $_.Width) -and $cy -ge $_.Y -and $cy -lt ($_.Y + $_.Height) } | Select-Object -First 1
    $dir = Split-Path $path
    $sk = $false
    try { $sk = [bool]($p.Modules | Where-Object { $_.FileName -eq (Join-Path $dir 'dxgi.dll') -or $_.FileName -eq (Join-Path $dir 'd3d11.dll') -or $_.ModuleName -like 'SpecialK*' }) } catch { }
    Write-Host ("  {0}  (pid {1})" -f $p.ProcessName, $p.Id) -ForegroundColor White
    Write-Host ("     路径：{0}" -f $path)
    Write-Host ("     窗口：({0},{1}) {2}x{3}  在 {4}" -f $r.X, $r.Y, $r.Width, $r.Height, $(if ($on) { "[$($on.Index)] $($on.Model)" } else { '屏幕外/最小化' }))
    Write-Host ("     Special K：{0}" -f $(if ($sk) { '已加载' } elseif (Test-Path (Join-Path $dir 'dxgi.dll')) { '目录里有 dxgi.dll，但这次没加载' } else { '没装' }))
}
if (-not $found) { Write-Host '  没有找到。先把两个游戏都启动起来再跑一次。' -ForegroundColor Yellow }

Section '显卡'
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi) {
    & nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader | ForEach-Object { Write-Host "  $_（名称, 占用, 显存已用, 显存总量, 温度）" }
} else {
    Get-CimInstance Win32_VideoController | ForEach-Object { Write-Host "  $($_.Name)" }
    Write-Host '  （非 NVIDIA 显卡看不到实时占用，可以打开任务管理器 → 性能 → GPU 看）' -ForegroundColor DarkGray
}

Section 'Windows 设置'
$gm = (Get-ItemProperty 'HKCU:\Software\Microsoft\GameBar' -ErrorAction SilentlyContinue).AutoGameModeEnabled
Write-Host ("  游戏模式：{0}" -f $(if ($gm -eq 0) { '关' } else { '开（会偏袒前台游戏，后台那个游戏可能被压帧）' }))
Write-Host ''
