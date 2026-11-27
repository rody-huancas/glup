// «Conectarme»: the network of a WiFi QR added to Windows (netsh, the profile it keeps for that network)
// and connected to. The profile file with the password lives only for that moment.
use std::path::Path;

use crate::services::qr::content::WifiSecurity;

#[cfg_attr(not(windows), allow(dead_code))]
pub const CONNECT_ERROR: &str = "No pude conectarme a esa red. Revisa que esté cerca y que la contraseña sea la correcta.";

fn escape_xml(value: &str) -> String {
    value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&apos;")
}

// The WLAN profile of Windows for that network (WPA2 personal, WEP or open).
pub fn profile_xml(ssid: &str, password: &str, security: WifiSecurity, hidden: bool) -> String {
    let (auth, encryption, key) = match security {
        WifiSecurity::Wpa  => ("WPA2PSK", "AES", Some(("passPhrase", password))),
        WifiSecurity::Wep  => ("open", "WEP", Some(("networkKey", password))),
        WifiSecurity::Open => ("open", "none", None),
    };
    let key = key
        .map(|(kind, value)| format!("<sharedKey><keyType>{kind}</keyType><protected>false</protected><keyMaterial>{}</keyMaterial></sharedKey>", escape_xml(value)))
        .unwrap_or_default();
    let name = escape_xml(ssid);
    format!(
        "<?xml version=\"1.0\"?>\n<WLANProfile xmlns=\"http://www.microsoft.com/networking/WLAN/profile/v1\"><name>{name}</name><SSIDConfig><SSID><name>{name}</name></SSID><nonBroadcast>{hidden}</nonBroadcast></SSIDConfig><connectionType>ESS</connectionType><connectionMode>auto</connectionMode><MSM><security><authEncryption><authentication>{auth}</authentication><encryption>{encryption}</encryption><useOneX>false</useOneX></authEncryption>{key}</security></MSM></WLANProfile>\n",
    )
}

#[cfg(windows)]
fn netsh(args: &[&std::ffi::OsStr]) -> bool {
    let mut command = std::process::Command::new("netsh");
    command.args(args).stdin(std::process::Stdio::null()).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null());
    crate::services::video::encode::hide_window(&mut command);
    command.status().is_ok_and(|status| status.success())
}

// Adds the network for this user and connects; the profile file is deleted right after.
#[cfg(windows)]
pub fn connect(folder: &Path, ssid: &str, password: &str, security: WifiSecurity, hidden: bool) -> Result<(), String> {
    use std::ffi::OsStr;

    let file = folder.join(format!("glup-wifi-{}.xml", crate::services::media::serve::new_token()));
    std::fs::write(&file, profile_xml(ssid, password, security, hidden)).map_err(|_| CONNECT_ERROR.to_string())?;
    let mut filename = std::ffi::OsString::from("filename=");
    filename.push(file.as_os_str());
    let added = netsh(&[OsStr::new("wlan"), OsStr::new("add"), OsStr::new("profile"), &filename, OsStr::new("user=current")]);
    let _     = std::fs::remove_file(&file);
    if !added {
        return Err(CONNECT_ERROR.to_string());
    }
    let name = format!("name={ssid}");
    if netsh(&[OsStr::new("wlan"), OsStr::new("connect"), OsStr::new(&name)]) { Ok(()) } else { Err(CONNECT_ERROR.to_string()) }
}

#[cfg(not(windows))]
pub fn connect(_folder: &Path, _ssid: &str, _password: &str, _security: WifiSecurity, _hidden: bool) -> Result<(), String> {
    Err(crate::services::platform::unavailable(crate::services::platform::Feature::WifiConnect))
}
