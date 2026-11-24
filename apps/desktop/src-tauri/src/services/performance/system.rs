// The PC as a whole, read with Windows' own calls: processor, memory, disk activity, free space on
// each disk, the battery and the time since the last restart. Nothing is changed here.
use serde::Serialize;

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSpace {
    // "C:\".
    pub root  : String,
    pub label : String,
    pub free  : u64,
    pub total : u64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub percent  : u8,
    pub charging : bool,
    pub plugged  : bool,
    // What it holds when full against what it held new (0 to 100), when Windows tells both.
    pub health   : Option<u8>,
}

// Processor times of the whole PC (100 ns): idle, and kernel + user (kernel includes idle).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct CpuTimes {
    pub idle  : u64,
    pub total : u64,
}

// Busy share between two readings (0 to 100).
pub fn busy_between(before: CpuTimes, now: CpuTimes) -> f32 {
    let total = now.total.saturating_sub(before.total);
    let idle  = now.idle.saturating_sub(before.idle);
    if total == 0 { 0.0 } else { ((total - idle.min(total)) as f64 / total as f64 * 100.0) as f32 }
}

// Health of a battery: full now against new, rounded, at most 100.
pub fn health(full: Option<i32>, design: Option<i32>) -> Option<u8> {
    match (full, design) {
        (Some(full), Some(design)) if full > 0 && design > 0 => Some((f64::from(full) / f64::from(design) * 100.0).round().min(100.0) as u8),
        _ => None,
    }
}

#[cfg(windows)]
mod engine {
    use std::{mem::size_of, ptr::null_mut};

    use windows_sys::Win32::{
        Foundation::FILETIME,
        Storage::FileSystem::{GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDriveStringsW, GetVolumeInformationW},
        System::{
            Performance::{PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterValue, PdhOpenQueryW, PDH_FMT_COUNTERVALUE, PDH_FMT_DOUBLE},
            Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS},
            SystemInformation::{GetTickCount64, GlobalMemoryStatusEx, MEMORYSTATUSEX},
            Threading::GetSystemTimes,
        },
    };

    use super::{health, BatteryInfo, CpuTimes, DiskSpace};

    const DRIVE_FIXED: u32 = 3;
    const NO_BATTERY: u8   = 128;
    const UNKNOWN: u8      = 255;

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(Some(0)).collect()
    }

    fn ticks(time: FILETIME) -> u64 {
        (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime)
    }

    pub fn cpu_times() -> CpuTimes {
        let (mut idle, mut kernel, mut user) = (FILETIME::default(), FILETIME::default(), FILETIME::default());
        if unsafe { GetSystemTimes(&mut idle, &mut kernel, &mut user) } == 0 {
            return CpuTimes::default();
        }
        CpuTimes { idle: ticks(idle), total: ticks(kernel) + ticks(user) }
    }

    // In use and in total, in bytes.
    pub fn memory() -> (u64, u64) {
        let mut status = MEMORYSTATUSEX { dwLength: size_of::<MEMORYSTATUSEX>() as u32, ..unsafe { std::mem::zeroed() } };
        if unsafe { GlobalMemoryStatusEx(&mut status) } == 0 {
            return (0, 0);
        }
        (status.ullTotalPhys.saturating_sub(status.ullAvailPhys), status.ullTotalPhys)
    }

    // Since Windows last really started (a shutdown with "inicio rápido" does not count, a restart does).
    pub fn uptime_seconds() -> u64 {
        let millis = unsafe { GetTickCount64() };
        millis / 1000
    }

    pub fn disks() -> Vec<DiskSpace> {
        let mut buffer = vec![0_u16; 512];
        let length     = unsafe { GetLogicalDriveStringsW(buffer.len() as u32, buffer.as_mut_ptr()) } as usize;
        buffer.truncate(length.min(buffer.len()));

        buffer
            .split(|unit| *unit == 0)
            .filter(|root| !root.is_empty())
            .map(String::from_utf16_lossy)
            .filter(|root| unsafe { GetDriveTypeW(wide(root).as_ptr()) } == DRIVE_FIXED)
            .filter_map(|root| {
                let path                       = wide(&root);
                let (mut free, mut total, mut all_free) = (0_u64, 0_u64, 0_u64);
                if unsafe { GetDiskFreeSpaceExW(path.as_ptr(), &mut free, &mut total, &mut all_free) } == 0 || total == 0 {
                    return None;
                }
                let mut name = vec![0_u16; 261];
                let read     = unsafe { GetVolumeInformationW(path.as_ptr(), name.as_mut_ptr(), name.len() as u32, null_mut(), null_mut(), null_mut(), null_mut(), 0) } != 0;
                let label    = if read { String::from_utf16_lossy(&name[..name.iter().position(|unit| *unit == 0).unwrap_or(0)]) } else { String::new() };
                Some(DiskSpace { root, label, free, total })
            })
            .collect()
    }

    // The charge and the plug from the power status; the health from the battery report (WinRT).
    pub fn battery() -> Option<BatteryInfo> {
        let mut status: SYSTEM_POWER_STATUS = unsafe { std::mem::zeroed() };
        if unsafe { GetSystemPowerStatus(&mut status) } == 0 || status.BatteryFlag & NO_BATTERY != 0 || status.BatteryLifePercent == UNKNOWN {
            return None;
        }

        let report = windows::Devices::Power::Battery::AggregateBattery().and_then(|battery| battery.GetReport()).ok();
        let full   = report.as_ref().and_then(|report| report.FullChargeCapacityInMilliwattHours().ok()).and_then(|value| value.Value().ok());
        let design = report.as_ref().and_then(|report| report.DesignCapacityInMilliwattHours().ok()).and_then(|value| value.Value().ok());
        let state  = report.as_ref().and_then(|report| report.Status().ok());

        Some(BatteryInfo {
            percent  : status.BatteryLifePercent.min(100),
            charging : state == Some(windows::System::Power::BatteryStatus::Charging) || status.BatteryFlag & 8 != 0,
            plugged  : status.ACLineStatus == 1,
            health   : health(full, design),
        })
    }

    // "% Idle Time" of every disk together: busy is the rest. Needs two readings, as the processor.
    pub struct DiskCounter {
        query   : isize,
        counter : isize,
    }

    // Only Glup's sampler uses it, behind its lock.
    unsafe impl Send for DiskCounter {}

    impl DiskCounter {
        pub fn open() -> Option<DiskCounter> {
            let mut query = 0_isize;
            if unsafe { PdhOpenQueryW(std::ptr::null(), 0, (&mut query as *mut isize).cast()) } != 0 {
                return None;
            }
            let mut counter = 0_isize;
            let path        = wide(r"\PhysicalDisk(_Total)\% Idle Time");
            if unsafe { PdhAddEnglishCounterW(query as _, path.as_ptr(), 0, (&mut counter as *mut isize).cast()) } != 0 {
                unsafe { PdhCloseQuery(query as _) };
                return None;
            }
            unsafe { PdhCollectQueryData(query as _) };
            Some(DiskCounter { query, counter })
        }

        pub fn busy(&mut self) -> Option<f32> {
            if unsafe { PdhCollectQueryData(self.query as _) } != 0 {
                return None;
            }
            let mut value: PDH_FMT_COUNTERVALUE = unsafe { std::mem::zeroed() };
            if unsafe { PdhGetFormattedCounterValue(self.counter as _, PDH_FMT_DOUBLE, null_mut(), &mut value) } != 0 {
                return None;
            }
            let idle = unsafe { value.Anonymous.doubleValue };
            Some((100.0 - idle).clamp(0.0, 100.0) as f32)
        }
    }

    impl Drop for DiskCounter {
        fn drop(&mut self) {
            unsafe { PdhCloseQuery(self.query as _) };
        }
    }
}

#[cfg(windows)]
pub use engine::*;

#[cfg(not(windows))]
mod engine {
    use super::{BatteryInfo, CpuTimes, DiskSpace};

    pub fn cpu_times() -> CpuTimes {
        CpuTimes::default()
    }

    pub fn memory() -> (u64, u64) {
        (0, 0)
    }

    pub fn uptime_seconds() -> u64 {
        0
    }

    pub fn disks() -> Vec<DiskSpace> {
        Vec::new()
    }

    pub fn battery() -> Option<BatteryInfo> {
        None
    }

    pub struct DiskCounter;

    impl DiskCounter {
        pub fn open() -> Option<DiskCounter> {
            None
        }

        pub fn busy(&mut self) -> Option<f32> {
            None
        }
    }
}

#[cfg(not(windows))]
pub use engine::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn processor_share_between_two_readings() {
        let before = CpuTimes { idle: 1_000, total: 2_000 };
        assert_eq!(busy_between(before, CpuTimes { idle: 1_750, total: 3_000 }), 25.0);
        assert_eq!(busy_between(before, before), 0.0);
    }

    #[test]
    fn battery_health_is_full_against_new() {
        assert_eq!(health(Some(41_000), Some(50_000)), Some(82));
        assert_eq!(health(Some(52_000), Some(50_000)), Some(100));
        assert_eq!(health(None, Some(50_000)), None);
        assert_eq!(health(Some(0), Some(0)), None);
    }

    #[cfg(windows)]
    #[test]
    fn this_pc_answers() {
        let (used, total) = memory();
        assert!(total > 0 && used <= total);
        assert!(disks().iter().any(|disk| disk.total > 0 && disk.free <= disk.total));
        assert!(uptime_seconds() > 0);
    }
}
