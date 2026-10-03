<#
.SYNOPSIS
  把游戏窗口挪到指定显示器并铺满。适合"游戏总是开在主屏"时临时救急。

.EXAMPLE
  .\Move-WindowToMonitor.ps1 -List
  .\Move-WindowToMonitor.ps1 -Process SandFall-Win64-Shipping -Secondary
  .\Move-WindowToMonitor.ps1 -Process SandFall-Win64-Shipping -Monitor 2

.NOTES
  - 游戏要用「无边框窗口」模式；独占全屏的窗口挪不动。
  - 这是一次性的：很多游戏退出时不会记住被外部挪过的位置。想永久固定，用 Install-SpecialK.ps1 -Monitor。
#>
param(
    [string]$Process,
    [int]$Monitor = 0,
    [switch]$Secondary,
    [switch]$List
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
. (Join-Path $PSScriptRoot 'common.ps1')

$mons = @(Get-DsdgMonitors)
if ($List -or -not $Process) {
    Write-Host '== 显示器 ==' -ForegroundColor Cyan
    $mons | ForEach-Object { Write-Host ('  ' + (Format-DsdgMonitor $_)) }
    if (-not $Process) { Write-Host ''; Write-Host '用法：-Process <进程名> -Monitor <序号>   或   -Process <进程名> -Secondary' -ForegroundColor DarkGray }
    exit 0
}

if ($Secondary) {
    $target = $mons | Where-Object { -not $_.Primary } | Select-Object -First 1
    if (-not $target) { throw '只检测到一块屏幕。电视/副屏开机了吗？' }
} elseif ($Monitor -gt 0) {
    $target = $mons | Where-Object Index -eq $Monitor
    if (-not $target) { throw "没有序号为 $Monitor 的显示器。用 -List 查看。" }
} else {
    throw '请指定 -Monitor <序号> 或 -Secondary。'
}

$p = Get-DsdgMainWindow $Process
if (-not $p) { throw "没有找到「$Process」的窗口。游戏启动了吗？进程名不带 .exe。" }

$before = Get-DsdgWindowRect $p.MainWindowHandle
[void][DsdgWin32]::SetWindowPos($p.MainWindowHandle, [IntPtr]::Zero, $target.X, $target.Y, $target.Width, $target.Height, 0x0044)   # SWP_NOZORDER | SWP_SHOWWINDOW
Start-Sleep -Seconds 2
$after = Get-DsdgWindowRect $p.MainWindowHandle
Write-Host ("{0}：({1},{2}) {3}x{4}  →  ({5},{6}) {7}x{8}" -f $p.ProcessName, $before.X, $before.Y, $before.Width, $before.Height, $after.X, $after.Y, $after.Width, $after.Height)
if ($after.X -eq $target.X -and $after.Y -eq $target.Y) {
    Write-Host ("已挪到：" + (Format-DsdgMonitor $target)) -ForegroundColor Green
} else {
    Write-Host '窗口被游戏弹回去了。确认游戏是「无边框窗口」模式；独占全屏的窗口挪不动。' -ForegroundColor Yellow
    exit 1
}
