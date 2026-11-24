// Graphics card or processor for "Pasar audio a texto". Automatic uses the card glup-voz finds (ggml
// prefers a dedicated one), unless it already failed with the driver it has now: then the processor,
// until that driver changes. "Nunca" always uses the processor.
use serde::{Deserialize, Serialize};

use super::gpu::GpuDevice;

// How many cards are remembered as "no usar" (the oldest go first).
const BLOCKED_LIMIT: usize = 8;
// The probe itself failed (the program died while Vulkan started): remembered for all the drivers.
const PROBE_KEY: &str = "*";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GpuMode {
    #[default]
    Auto,
    Never,
}

// Why the processor (for Ajustes).
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Engine {
    Gpu { name: String },
    // "Nunca" was chosen.
    Chosen,
    // No card with Vulkan (or no glup-voz in this build).
    NoCard,
    // That card failed before with this driver.
    Blocked { name: String },
}

// A display driver as Windows lists it: its name and its version.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Driver {
    pub name    : String,
    pub version : String,
}

fn same_card(a: &str, b: &str) -> bool {
    let (a, b) = (a.trim().to_lowercase(), b.trim().to_lowercase());
    !a.is_empty() && !b.is_empty() && (a.contains(&b) || b.contains(&a))
}

// "NVIDIA GeForce RTX 4050 Laptop GPU|32.0.15.9191": the card with its driver; a new driver is a new key.
pub fn card_key(name: &str, drivers: &[Driver]) -> String {
    let version = drivers.iter().find(|driver| same_card(&driver.name, name)).map_or("?", |driver| driver.version.as_str());
    format!("{name}|{version}")
}

// Every driver at once: when the probe dies, nothing is tried again until one of them changes.
pub fn probe_key(drivers: &[Driver]) -> String {
    let mut parts: Vec<String> = drivers.iter().map(|driver| format!("{}|{}", driver.name, driver.version)).collect();
    parts.sort();
    format!("{PROBE_KEY}{}", parts.join(";"))
}

pub struct ChooseParams<'a> {
    pub mode    : GpuMode,
    // None when the cards were not looked for (or the probe failed).
    pub devices : Option<&'a [GpuDevice]>,
    pub blocked : &'a [String],
    pub drivers : &'a [Driver],
}

pub fn choose(params: &ChooseParams) -> Engine {
    if params.mode == GpuMode::Never {
        return Engine::Chosen;
    }
    if params.blocked.contains(&probe_key(params.drivers)) {
        return Engine::Blocked { name: String::new() };
    }
    let Some(device) = params.devices.and_then(|devices| devices.first()) else { return Engine::NoCard };

    if params.blocked.contains(&card_key(&device.name, params.drivers)) {
        Engine::Blocked { name: device.name.clone() }
    } else {
        Engine::Gpu { name: device.name.clone() }
    }
}

// The list with this key added once, the newest last and no more than BLOCKED_LIMIT.
pub fn with_blocked(mut blocked: Vec<String>, key: String) -> Vec<String> {
    blocked.retain(|known| *known != key);
    blocked.push(key);
    let extra = blocked.len().saturating_sub(BLOCKED_LIMIT);
    blocked.drain(..extra);
    blocked
}

// The display drivers, from the registry's display adapter class (the same place Device Manager reads).
#[cfg(windows)]
pub fn drivers() -> Vec<Driver> {
    use crate::services::registry::{self, Root};

    const DISPLAY_CLASS: &str = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}";

    registry::subkeys(Root::Machine, DISPLAY_CLASS)
        .into_iter()
        .filter(|key| key.chars().all(|letter| letter.is_ascii_digit()))
        .filter_map(|key| {
            let values = registry::values(Root::Machine, &format!(r"{DISPLAY_CLASS}\{key}"));
            let text   = |name: &str| values.iter().find(|value| value.name.eq_ignore_ascii_case(name)).and_then(|value| value.text.clone());
            Some(Driver { name: text("DriverDesc")?, version: text("DriverVersion")? })
        })
        .collect()
}

#[cfg(not(windows))]
pub fn drivers() -> Vec<Driver> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn nvidia() -> GpuDevice {
        GpuDevice { name: "NVIDIA GeForce RTX 4050 Laptop GPU".to_string(), integrated: false, memory: 6 << 30 }
    }

    fn drivers(version: &str) -> Vec<Driver> {
        vec![
            Driver { name: "NVIDIA GeForce RTX 4050 Laptop GPU".to_string(), version: version.to_string() },
            Driver { name: "AMD Radeon(TM) Graphics".to_string(), version: "31.0.21921.1000".to_string() },
        ]
    }

    #[test]
    fn automatic_uses_the_card_and_never_the_processor() {
        let devices = [nvidia()];
        let known   = drivers("32.0.15.9191");
        let auto    = ChooseParams { mode: GpuMode::Auto, devices: Some(&devices), blocked: &[], drivers: &known };
        assert_eq!(choose(&auto), Engine::Gpu { name: nvidia().name });
        assert_eq!(choose(&ChooseParams { mode: GpuMode::Never, ..auto }), Engine::Chosen);
        assert_eq!(choose(&ChooseParams { mode: GpuMode::Auto, devices: Some(&[]), blocked: &[], drivers: &known }), Engine::NoCard);
        assert_eq!(choose(&ChooseParams { mode: GpuMode::Auto, devices: None, blocked: &[], drivers: &known }), Engine::NoCard);
    }

    #[test]
    fn a_card_that_failed_waits_for_a_new_driver() {
        let devices = [nvidia()];
        let old     = drivers("32.0.15.9191");
        let blocked = with_blocked(Vec::new(), card_key(&nvidia().name, &old));
        assert_eq!(blocked, ["NVIDIA GeForce RTX 4050 Laptop GPU|32.0.15.9191"]);

        let now = ChooseParams { mode: GpuMode::Auto, devices: Some(&devices), blocked: &blocked, drivers: &old };
        assert_eq!(choose(&now), Engine::Blocked { name: nvidia().name });

        // The driver was updated: it is tried again.
        let new = drivers("32.0.15.9500");
        assert_eq!(choose(&ChooseParams { drivers: &new, ..now }), Engine::Gpu { name: nvidia().name });
    }

    #[test]
    fn a_probe_that_died_waits_for_any_driver_to_change() {
        let devices = [nvidia()];
        let old     = drivers("1");
        let blocked = vec![probe_key(&old)];
        let now     = ChooseParams { mode: GpuMode::Auto, devices: Some(&devices), blocked: &blocked, drivers: &old };
        assert!(matches!(choose(&now), Engine::Blocked { .. }));
        assert!(matches!(choose(&ChooseParams { drivers: &drivers("2"), ..now }), Engine::Gpu { .. }));
    }

    #[test]
    fn the_list_keeps_each_card_once_and_only_the_last_ones() {
        let mut blocked = Vec::new();
        for index in 0..12 {
            blocked = with_blocked(blocked, format!("tarjeta|{index}"));
        }
        blocked = with_blocked(blocked, "tarjeta|11".to_string());
        assert_eq!(blocked.len(), BLOCKED_LIMIT);
        assert_eq!(blocked.first().map(String::as_str), Some("tarjeta|4"));
        assert_eq!(blocked.last().map(String::as_str), Some("tarjeta|11"));
    }

    #[test]
    fn the_card_is_matched_to_its_driver_by_name() {
        assert_eq!(card_key("NVIDIA GeForce RTX 4050 Laptop GPU", &drivers("9")), "NVIDIA GeForce RTX 4050 Laptop GPU|9");
        assert_eq!(card_key("Intel(R) Arc(TM) Graphics", &drivers("9")), "Intel(R) Arc(TM) Graphics|?");
    }
}
