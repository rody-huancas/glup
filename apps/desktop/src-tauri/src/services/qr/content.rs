// What a QR keeps, written the way phones read it: a link or text, a WiFi network (it connects by
// itself), a WhatsApp chat, a contact (vCard) or an email. Pure.
use serde::{Deserialize, Serialize};

pub const EMPTY_ERROR: &str = "Completa lo que va en el QR";
// Perú.
pub const DEFAULT_COUNTRY: &str = "51";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WifiSecurity {
    #[default]
    Wpa,
    Wep,
    // Without password.
    Open,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum QrContent {
    Text { text: String },
    Wifi { ssid: String, password: String, security: WifiSecurity, #[serde(default)] hidden: bool },
    #[serde(rename_all = "camelCase")]
    Whatsapp { country: String, number: String, message: String },
    Contact { name: String, phone: String, email: String, company: String },
    Email { to: String, subject: String, body: String },
}

// A value of the WiFi code: \ ; , : and " go with a backslash before them.
pub fn escape_wifi(value: &str) -> String {
    value.chars().fold(String::new(), |mut out, character| {
        if matches!(character, '\\' | ';' | ',' | ':' | '"') {
            out.push('\\');
        }
        out.push(character);
        out
    })
}

// A value of a vCard: \ , ; and line breaks escaped.
pub fn escape_vcard(value: &str) -> String {
    value.replace('\\', "\\\\").replace(',', "\\,").replace(';', "\\;").replace("\r\n", "\\n").replace('\n', "\\n")
}

// For a link: every byte but letters, digits and - _ . ~ as %XX (UTF-8).
pub fn encode_component(value: &str) -> String {
    value.bytes().map(|byte| if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) { (byte as char).to_string() } else { format!("%{byte:02X}") }).collect()
}

// The WhatsApp number with its country code: only digits, the country added when it is not there.
pub fn whatsapp_number(country: &str, number: &str) -> String {
    let country = country.chars().filter(char::is_ascii_digit).collect::<String>();
    let digits  = number.chars().filter(char::is_ascii_digit).collect::<String>();
    let digits  = digits.trim_start_matches("00").to_string();
    let country = if country.is_empty() { DEFAULT_COUNTRY.to_string() } else { country };
    // Written with its country already (+51 987…) or as a local number (987…).
    if number.trim_start().starts_with('+') || (digits.starts_with(&country) && digits.len() > 9) { digits } else { format!("{country}{digits}") }
}

// The text the QR holds.
pub fn payload(content: &QrContent) -> Result<String, String> {
    let filled = |value: &str| !value.trim().is_empty();
    let text = match content {
        QrContent::Text { text } if filled(text) => text.clone(),
        QrContent::Wifi { ssid, password, security, hidden } if filled(ssid) => {
            let kind = match security {
                WifiSecurity::Wpa  => "WPA",
                WifiSecurity::Wep  => "WEP",
                WifiSecurity::Open => "nopass",
            };
            let password = if *security == WifiSecurity::Open { String::new() } else { format!("P:{};", escape_wifi(password)) };
            let hidden   = if *hidden { "H:true;" } else { "" };
            format!("WIFI:T:{kind};S:{};{password}{hidden};", escape_wifi(ssid))
        }
        QrContent::Whatsapp { country, number, message } if filled(number) => {
            let link = format!("https://wa.me/{}", whatsapp_number(country, number));
            if filled(message) { format!("{link}?text={}", encode_component(message.trim())) } else { link }
        }
        QrContent::Contact { name, phone, email, company } if filled(name) || filled(phone) || filled(email) => {
            let mut lines = vec!["BEGIN:VCARD".to_string(), "VERSION:3.0".to_string()];
            if filled(name) {
                lines.push(format!("N:;{};;;", escape_vcard(name.trim())));
                lines.push(format!("FN:{}", escape_vcard(name.trim())));
            }
            if filled(company) {
                lines.push(format!("ORG:{}", escape_vcard(company.trim())));
            }
            if filled(phone) {
                lines.push(format!("TEL;TYPE=CELL:{}", escape_vcard(phone.trim())));
            }
            if filled(email) {
                lines.push(format!("EMAIL:{}", escape_vcard(email.trim())));
            }
            lines.push("END:VCARD".to_string());
            lines.join("\r\n")
        }
        QrContent::Email { to, subject, body } if filled(to) => {
            let mut query = Vec::new();
            if filled(subject) {
                query.push(format!("subject={}", encode_component(subject.trim())));
            }
            if filled(body) {
                query.push(format!("body={}", encode_component(body.trim())));
            }
            let address = to.trim();
            if query.is_empty() { format!("mailto:{address}") } else { format!("mailto:{address}?{}", query.join("&")) }
        }
        _ => return Err(EMPTY_ERROR.to_string()),
    };
    Ok(text)
}

// What its history line says: never the WiFi password.
pub fn describe(content: &QrContent) -> String {
    match content {
        QrContent::Text { text } if text.starts_with("http") => format!("QR de un enlace · {}", super::parse::host_of(text).unwrap_or_default()),
        QrContent::Text { .. }                    => "QR de un texto".to_string(),
        QrContent::Wifi { ssid, .. }              => format!("QR de WiFi «{}»", ssid.trim()),
        QrContent::Whatsapp { country, number, .. } => format!("QR de WhatsApp +{}", whatsapp_number(country, number)),
        QrContent::Contact { name, phone, .. }    => format!("QR de contacto «{}»", if name.trim().is_empty() { phone.trim() } else { name.trim() }),
        QrContent::Email { to, .. }               => format!("QR de correo a {}", to.trim()),
    }
}

// The name of the file: "qr-wifi-MiCasa", "qr-enlace-google.com".
pub fn file_stem(content: &QrContent) -> String {
    let (kind, what) = match content {
        QrContent::Text { text } if text.starts_with("http") => ("enlace", super::parse::host_of(text).unwrap_or_default()),
        QrContent::Text { .. }               => ("texto", String::new()),
        QrContent::Wifi { ssid, .. }         => ("wifi", ssid.clone()),
        QrContent::Whatsapp { number, .. }   => ("whatsapp", number.chars().filter(char::is_ascii_digit).collect()),
        QrContent::Contact { name, .. }      => ("contacto", name.clone()),
        QrContent::Email { to, .. }          => ("correo", to.split('@').next().unwrap_or_default().to_string()),
    };
    let clean: String = what.chars().filter(|character| character.is_alphanumeric() || matches!(character, '-' | '_' | '.')).take(40).collect();
    if clean.is_empty() { format!("qr-{kind}") } else { format!("qr-{kind}-{clean}") }
}
