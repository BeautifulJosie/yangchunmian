<#
.SYNOPSIS
  查看每个播放设备的音量、静音状态，以及哪些程序正在从它出声。加 -Unmute 一键解除所有播放设备的静音。

.EXAMPLE
  .\Get-AudioDevices.ps1
  .\Get-AudioDevices.ps1 -Unmute

.NOTES
  "音量 100% 但就是没声"多半是设备被静音了：一些远程控制软件（比如 Parsec 的「连接时静音主机扬声器」）
  连接异常断开后不会恢复。
#>
param([switch]$Unmute)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices; using System.Collections.Generic;
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgMMDevice { int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); int OpenPropertyStore(int access, out IDsdgPropertyStore ps); int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id); int GetState(out int s); }
[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgMMDeviceCollection { int GetCount(out int n); int Item(int i, out IDsdgMMDevice d); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgMMDeviceEnumerator { int EnumAudioEndpoints(int flow, int state, out IDsdgMMDeviceCollection c); int GetDefaultAudioEndpoint(int flow, int role, out IDsdgMMDevice d); }
[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgPropertyStore { int GetCount(out int n); int GetAt(int i, out DsdgPropKey k); int GetValue(ref DsdgPropKey k, out DsdgPropVariant v); }
[StructLayout(LayoutKind.Sequential)] public struct DsdgPropKey { public Guid fmtid; public int pid; }
[StructLayout(LayoutKind.Explicit)] public struct DsdgPropVariant { [FieldOffset(0)] public short vt; [FieldOffset(8)] public IntPtr p; }
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgSessionManager2 { int GetAudioSessionControl(IntPtr g, int f, out IntPtr o); int GetSimpleAudioVolume(IntPtr g, int f, out IntPtr o); int GetSessionEnumerator(out IDsdgSessionEnumerator e); }
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgSessionEnumerator { int GetCount(out int n); int GetSession(int i, out IDsdgSessionControl2 s); }
[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgSessionControl2 { int GetState(out int s); int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string n); int SetDisplayName(string n, IntPtr g); int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string p); int SetIconPath(string p, IntPtr g); int GetGroupingParam(out Guid g); int SetGroupingParam(ref Guid g, IntPtr c); int RegisterAudioSessionNotification(IntPtr n); int UnregisterAudioSessionNotification(IntPtr n); int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string s); int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string s); int GetProcessId(out int pid); int IsSystemSoundsSession(); int SetDuckingPreference(bool b); }
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IDsdgEndpointVolume { int RegisterControlChangeNotify(IntPtr p); int UnregisterControlChangeNotify(IntPtr p); int GetChannelCount(out int n); int SetMasterVolumeLevel(float f, IntPtr g); int SetMasterVolumeLevelScalar(float f, IntPtr g); int GetMasterVolumeLevel(out float f); int GetMasterVolumeLevelScalar(out float f); int SetChannelVolumeLevel(int c, float f, IntPtr g); int SetChannelVolumeLevelScalar(int c, float f, IntPtr g); int GetChannelVolumeLevel(int c, out float f); int GetChannelVolumeLevelScalar(int c, out float f); int SetMute(bool b, IntPtr g); int GetMute(out bool b); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] public class DsdgMMDeviceEnumerator {}

public class DsdgDeviceInfo { public string Name; public string Id; public bool IsDefault; public int Volume; public bool Muted; public bool MuteChanged; public List<string> Playing = new List<string>(); }

public static class DsdgAudio {
    static string Name(IDsdgMMDevice d) {
        IDsdgPropertyStore ps; d.OpenPropertyStore(0, out ps);
        DsdgPropKey k = new DsdgPropKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
        DsdgPropVariant v; ps.GetValue(ref k, out v); return Marshal.PtrToStringUni(v.p);
    }
    public static List<DsdgDeviceInfo> Scan(bool unmute) {
        var list = new List<DsdgDeviceInfo>();
        var e = (IDsdgMMDeviceEnumerator)new DsdgMMDeviceEnumerator();
        string defId = null;
        try { IDsdgMMDevice def; e.GetDefaultAudioEndpoint(0, 0, out def); def.GetId(out defId); } catch { }
        IDsdgMMDeviceCollection c; e.EnumAudioEndpoints(0, 1, out c); int n; c.GetCount(out n);
        for (int i = 0; i < n; i++) {
            IDsdgMMDevice d; c.Item(i, out d); string id; d.GetId(out id);
            var info = new DsdgDeviceInfo { Name = Name(d), Id = id, IsDefault = (id == defId) };
            Guid gv = typeof(IDsdgEndpointVolume).GUID; object ov; d.Activate(ref gv, 23, IntPtr.Zero, out ov);
            var ev = (IDsdgEndpointVolume)ov; float vol; ev.GetMasterVolumeLevelScalar(out vol); bool m; ev.GetMute(out m);
            if (unmute && m) { ev.SetMute(false, IntPtr.Zero); ev.GetMute(out m); info.MuteChanged = true; }
            info.Volume = (int)Math.Round(vol * 100); info.Muted = m;
            Guid gs = typeof(IDsdgSessionManager2).GUID; object os; d.Activate(ref gs, 23, IntPtr.Zero, out os);
            IDsdgSessionEnumerator en; ((IDsdgSessionManager2)os).GetSessionEnumerator(out en); int cnt; en.GetCount(out cnt);
            for (int j = 0; j < cnt; j++) {
                IDsdgSessionControl2 sc; en.GetSession(j, out sc); int st; sc.GetState(out st);
                if (st != 1) continue;   // 1 = 正在出声
                int pid; sc.GetProcessId(out pid); if (pid == 0) continue;
                try { string pn = System.Diagnostics.Process.GetProcessById(pid).ProcessName; if (!info.Playing.Contains(pn)) info.Playing.Add(pn); } catch { }
            }
            list.Add(info);
        }
        return list;
    }
}
'@

$devs = [DsdgAudio]::Scan([bool]$Unmute)
Write-Host '== 播放设备 ==' -ForegroundColor Cyan
foreach ($d in $devs) {
    $flag = if ($d.IsDefault) { '[默认] ' } else { '       ' }
    $mute = if ($d.Muted) { '  ★已静音' } elseif ($d.MuteChanged) { '  （已解除静音）' } else { '' }
    $color = if ($d.Muted) { 'Red' } elseif ($d.MuteChanged) { 'Green' } else { 'Gray' }
    Write-Host ("{0}{1}  音量 {2}%{3}" -f $flag, $d.Name, $d.Volume, $mute) -ForegroundColor $color
    if ($d.Playing.Count -gt 0) { Write-Host ("         正在出声：" + ($d.Playing -join '、')) }
}
if (-not $Unmute -and @($devs | Where-Object Muted).Count -gt 0) {
    Write-Host ''
    Write-Host '有设备处于静音状态。运行 .\Get-AudioDevices.ps1 -Unmute 可以一键解除。' -ForegroundColor Yellow
}
