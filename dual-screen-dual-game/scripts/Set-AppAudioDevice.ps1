<#
.SYNOPSIS
  把正在运行的程序的声音固定输出到指定播放设备，或者取消固定。
  效果等同于：设置 → 系统 → 声音 → 音量合成器 → 应用 → 输出设备。

.EXAMPLE
  .\Set-AppAudioDevice.ps1 -List
  .\Set-AppAudioDevice.ps1 -Process SandFall-Win64-Shipping -Device SAMSUNG
  .\Set-AppAudioDevice.ps1 -Process "League of Legends" -Device Realtek
  .\Set-AppAudioDevice.ps1 -Process "League of Legends" -Clear

.NOTES
  - -Process 填进程名（不带 .exe），-Device 填设备名里的一段文字（-List 能看到完整名字）。
  - 程序必须正在出声（有音频会话）才能设置。没出声时脚本会等待，最多 -WaitSeconds 秒，
    这期间让游戏发出点声音就行（点一下菜单、进游戏）。
  - Windows 按 exe 记住这个设置，以后启动同一个程序会自动沿用。
  - 用的是 Windows 未公开接口 Windows.Media.Internal.AudioPolicyConfig（EarTrumpet、SoundVolumeView 也用它），
    在 Windows 11 23H2 (22631) 上验证过。如果你的系统上报错，用音量合成器手动设置，效果一样。
#>
param(
    [string]$Process,
    [string]$Device,
    [switch]$Clear,
    [switch]$List,
    [int]$WaitSeconds = 60
)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
[Guid("ab3d4648-e242-459f-b02f-541c70306324")]
[InterfaceType(ComInterfaceType.InterfaceIsIInspectable)]
public interface IDsdgAudioPolicyConfigFactory {
    // Windows 11 23H2 上，Set/Get 之前有 19 个用不到的虚表槽位
    int s01(); int s02(); int s03(); int s04(); int s05(); int s06(); int s07(); int s08(); int s09(); int s10();
    int s11(); int s12(); int s13(); int s14(); int s15(); int s16(); int s17(); int s18(); int s19();
    [PreserveSig] int SetPersistedDefaultAudioEndpoint(uint processId, int flow, int role, IntPtr deviceId);
    [PreserveSig] int GetPersistedDefaultAudioEndpoint(uint processId, int flow, int role, [MarshalAs(UnmanagedType.HString)] out string deviceId);
    [PreserveSig] int ClearAllPersistedApplicationDefaultEndpoints();
}
public static class DsdgAudioPolicy {
    [DllImport("combase.dll", PreserveSig = false, EntryPoint = "RoGetActivationFactory")]
    static extern IDsdgAudioPolicyConfigFactory RoGet([MarshalAs(UnmanagedType.HString)] string classId, ref Guid iid);
    [DllImport("combase.dll", CharSet = CharSet.Unicode)] static extern int WindowsCreateString(string s, int len, out IntPtr h);
    [DllImport("combase.dll")] static extern int WindowsDeleteString(IntPtr h);
    static IDsdgAudioPolicyConfigFactory cached;
    static IDsdgAudioPolicyConfigFactory F() {
        if (cached == null) { Guid iid = typeof(IDsdgAudioPolicyConfigFactory).GUID; cached = RoGet("Windows.Media.Internal.AudioPolicyConfig", ref iid); }
        return cached;
    }
    // 返回 HRESULT。0 = 成功（dev 为空串表示没固定、跟随系统默认）；0x80070057 = 这个进程现在没有音频会话
    public static int Query(uint pid, out string dev) { return F().GetPersistedDefaultAudioEndpoint(pid, 0, 1, out dev); }
    public static int Set(uint pid, string fullId) {
        IntPtr h; WindowsCreateString(fullId, fullId.Length, out h);
        try {
            int r = F().SetPersistedDefaultAudioEndpoint(pid, 0, 0, h);   // eConsole
            if (r != 0) return r;
            return F().SetPersistedDefaultAudioEndpoint(pid, 0, 1, h);    // eMultimedia
        } finally { WindowsDeleteString(h); }
    }
    public static int Clear(uint pid) {
        int last = 0;
        for (int role = 0; role < 3; role++) { int r = F().SetPersistedDefaultAudioEndpoint(pid, 0, role, IntPtr.Zero); if (r != 0) last = r; }
        return last;
    }
}
'@

function Get-PlaybackDevices {
    $root = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render'
    foreach ($k in Get-ChildItem $root) {
        if ((Get-ItemProperty $k.PSPath).DeviceState -ne 1) { continue }   # 1 = 已启用并已连接
        $p = Get-ItemProperty (Join-Path $k.PSPath 'Properties') -ErrorAction SilentlyContinue
        $name = $p.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
        $desc = $p.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
        [pscustomobject]@{
            Name = $(if ($desc) { "$name ($desc)" } else { "$name" })
            Guid = $k.PSChildName
            Id   = "{0.0.0.00000000}.$($k.PSChildName)"
        }
    }
}

$devices = @(Get-PlaybackDevices)

function Get-DeviceLabel([string]$dev) {
    if (-not $dev) { return '跟随系统默认' }
    foreach ($d in $devices) { if ($dev -match [regex]::Escape($d.Guid)) { return $d.Name } }
    return $dev
}

if ($List -or (-not $Process)) {
    Write-Host '== 播放设备 ==' -ForegroundColor Cyan
    $devices | ForEach-Object { Write-Host "  $($_.Name)" }
    Write-Host ''
    Write-Host '== 正在出声的程序 → 固定输出到 ==' -ForegroundColor Cyan
    $seen = @{}
    foreach ($p in Get-Process) {
        $dev = $null
        try { $hr = [DsdgAudioPolicy]::Query([uint32]$p.Id, [ref]$dev) } catch { continue }
        if ($hr -ne 0) { continue }
        $key = "$($p.ProcessName)|$dev"
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = 1
        Write-Host ("  {0,-32} → {1}" -f $p.ProcessName, (Get-DeviceLabel $dev))
    }
    if (-not $Process) {
        Write-Host ''
        Write-Host '用法：-Process <进程名> -Device <设备名里的一段>   或   -Process <进程名> -Clear' -ForegroundColor DarkGray
    }
    exit 0
}

if (-not $Clear -and -not $Device) { throw '请指定 -Device <设备名里的一段>，或者用 -Clear 取消固定。' }

$target = $null
if (-not $Clear) {
    $hits = @($devices | Where-Object { $_.Name -like "*$Device*" })
    if ($hits.Count -eq 0) { throw "没有找到名字里包含「$Device」的播放设备。现有设备：`n  " + (($devices | ForEach-Object Name) -join "`n  ") }
    if ($hits.Count -gt 1) { throw "「$Device」匹配到多个设备，请写得更具体：`n  " + (($hits | ForEach-Object Name) -join "`n  ") }
    $target = $hits[0]
}

$name = $Process -replace '\.exe$', ''
if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) { throw "没有找到正在运行的进程「$name」。先启动程序；进程名可以用 -List 查看。" }

$done = @()
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$warned = $false
while ((Get-Date) -lt $deadline) {
    foreach ($p in (Get-Process -Name $name -ErrorAction SilentlyContinue)) {
        if ($done -contains $p.Id) { continue }
        $before = $null
        if ([DsdgAudioPolicy]::Query([uint32]$p.Id, [ref]$before) -ne 0) { continue }   # 这个进程现在没有音频会话
        if ($Clear) {
            $hr = [DsdgAudioPolicy]::Clear([uint32]$p.Id)
        } else {
            $hr = [DsdgAudioPolicy]::Set([uint32]$p.Id, "\\?\SWD#MMDEVAPI#$($target.Id)#{e6327cad-dcec-4949-ae8a-991e976a79d2}")
        }
        $after = $null; [DsdgAudioPolicy]::Query([uint32]$p.Id, [ref]$after) | Out-Null
        if ($hr -eq 0) {
            Write-Host ("{0} (pid {1})：{2}  →  {3}" -f $p.ProcessName, $p.Id, (Get-DeviceLabel $before), (Get-DeviceLabel $after)) -ForegroundColor Green
        } else {
            Write-Host ("{0} (pid {1})：失败 hr=0x{2:X8}" -f $p.ProcessName, $p.Id, $hr) -ForegroundColor Red
        }
        $done += $p.Id
    }
    if ($done.Count -gt 0) { break }
    if (-not $warned) { Write-Host "「$name」现在没有在出声，等它出声（最多 $WaitSeconds 秒）……让游戏发出点声音就行。" -ForegroundColor Yellow; $warned = $true }
    Start-Sleep -Seconds 1
}
if ($done.Count -eq 0) {
    Write-Host '超时：这个程序一直没出声。可以改用 设置 → 系统 → 声音 → 音量合成器 手动设置。' -ForegroundColor Red
    exit 1
}
