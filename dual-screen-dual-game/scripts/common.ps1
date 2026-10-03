# 公共函数：被其他脚本 dot-source 引用，不单独运行。

if (-not ('DsdgWin32' -as [type])) {
    Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class DsdgWin32 {
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool EnumDisplayDevices(string device, uint devNum, ref DISPLAY_DEVICE dd, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern bool EnumDisplaySettings(string device, int mode, ref DEVMODE dm);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hgt, uint flags);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct DISPLAY_DEVICE {
        public int cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public int StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct DEVMODE {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public short dmSpecVersion, dmDriverVersion, dmSize, dmDriverExtra; public int dmFields;
        public int dmPositionX, dmPositionY, dmDisplayOrientation, dmDisplayFixedOutput;
        public short dmColor, dmDuplex, dmYResolution, dmTTOption, dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public short dmLogPixels; public int dmBitsPerPel, dmPelsWidth, dmPelsHeight, dmDisplayFlags, dmDisplayFrequency;
        public int dmICMMethod, dmICMIntent, dmMediaType, dmDitherType, dmReserved1, dmReserved2, dmPanningWidth, dmPanningHeight;
    }
}
'@
}

# 按物理像素取坐标（不受 Windows 缩放影响）。必须在读任何窗口/屏幕坐标之前调用。
[void][DsdgWin32]::SetProcessDpiAwarenessContext([IntPtr]::op_Explicit(-4))

# 列出已接入桌面的显示器：序号、GDI 名、型号、分辨率、刷新率、位置、是否主屏、硬件路径（Special K 的 PreferredMonitorExact 用）
function Get-DsdgMonitors {
    $wmiNames = @{}
    try {
        Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID -ErrorAction Stop | ForEach-Object {
            $n = ($_.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ''
            $wmiNames[($_.InstanceName -replace '_\d+$', '').ToUpper()] = $n
        }
    } catch { }

    $list = @()
    $i = 0
    while ($true) {
        $dd = New-Object DsdgWin32+DISPLAY_DEVICE
        $dd.cb = [Runtime.InteropServices.Marshal]::SizeOf($dd)
        # 必须传真正的 NULL；直接写 $null 会被 PowerShell 转成空字符串，调用就失败了
        if (-not [DsdgWin32]::EnumDisplayDevices([NullString]::Value, [uint32]$i, [ref]$dd, 0)) { break }
        $i++
        if (($dd.StateFlags -band 0x1) -eq 0) { continue }   # 没接入桌面
        $dm = New-Object DsdgWin32+DEVMODE
        $dm.dmSize = [Runtime.InteropServices.Marshal]::SizeOf($dm)
        [void][DsdgWin32]::EnumDisplaySettings($dd.DeviceName, -1, [ref]$dm)
        $md = New-Object DsdgWin32+DISPLAY_DEVICE
        $md.cb = [Runtime.InteropServices.Marshal]::SizeOf($md)
        $path = ''
        if ([DsdgWin32]::EnumDisplayDevices($dd.DeviceName, 0, [ref]$md, 1)) { $path = $md.DeviceID }   # 1 = EDD_GET_DEVICE_INTERFACE_NAME
        $model = ''
        if ($path -match '^\\\\\?\\(DISPLAY#[^#]+#[^#]+)#') {
            $inst = ($matches[1] -replace '#', '\').ToUpper()
            $model = $wmiNames[$inst]
            if (-not $model) { $model = ($path -split '#')[1] }
        }
        $list += [pscustomobject]@{
            Index   = 0
            Device  = $dd.DeviceName
            GdiId   = [int]($dd.DeviceName -replace '\D', '')
            Model   = $model
            Primary = (($dd.StateFlags -band 0x4) -ne 0)
            X       = $dm.dmPositionX
            Y       = $dm.dmPositionY
            Width   = $dm.dmPelsWidth
            Height  = $dm.dmPelsHeight
            Hz      = $dm.dmDisplayFrequency
            Path    = $path
        }
    }
    # 序号：主屏是 1，其余按从左到右
    $sorted = @($list | Sort-Object @{ Expression = { -not $_.Primary } }, X, Y)
    for ($k = 0; $k -lt $sorted.Count; $k++) { $sorted[$k].Index = $k + 1 }
    return $sorted
}

function Format-DsdgMonitor($m) {
    $tag = if ($m.Primary) { '主屏' } else { '副屏' }
    "[{0}] {1}  {2}  {3}x{4} @ {5}Hz  位置({6},{7})  {8}" -f $m.Index, $tag, $m.Model, $m.Width, $m.Height, $m.Hz, $m.X, $m.Y, $m.Device
}

# 找进程的主窗口（取第一个有可见主窗口的同名进程）
function Get-DsdgMainWindow([string]$ProcessName) {
    $name = $ProcessName -replace '\.exe$', ''
    foreach ($p in (Get-Process -Name $name -ErrorAction SilentlyContinue)) {
        if ($p.MainWindowHandle -ne [IntPtr]::Zero -and [DsdgWin32]::IsWindowVisible($p.MainWindowHandle)) { return $p }
    }
    return $null
}

function Get-DsdgWindowRect([IntPtr]$Handle) {
    $r = New-Object DsdgWin32+RECT
    [void][DsdgWin32]::GetWindowRect($Handle, [ref]$r)
    [pscustomobject]@{ X = $r.L; Y = $r.T; Width = $r.R - $r.L; Height = $r.B - $r.T }
}
