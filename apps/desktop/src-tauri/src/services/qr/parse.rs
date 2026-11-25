// What a code read means: a link (with its warnings when it looks suspicious), a WiFi network, a
// contact, an email or plain text. Pure: nothing is ever opened from here.
use serde::Serialize;

use crate::services::qr::content::WifiSecurity;

// Links that hide where they lead.
const SHORTENERS: [&str; 16] = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "tiny.cc", "t.ly", "s.id", "lnkd.in", "bitly.com"];

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ReadKind {
    Link { url: String, host: String, warnings: Vec<String> },
    Wifi { ssid: String, password: String, security: WifiSecurity, hidden: bool },
    Contact { name: String, phone: String, email: String, company: String, vcard: String },
    Email { to: String, subject: String, body: String },
    Phone { number: String },
    Text { text: String },
}

// The host of a link, lower case, without "www." nor the port (None when it is not a link).
pub fn host_of(url: &str) -> Option<String> {
    let rest      = url.trim().split_once("://")?.1;
    let authority = rest.split(['/', '?', '#']).next()?;
    let host      = authority.rsplit('@').next()?;
    let host      = if host.starts_with('[') { host.split(']').next().map(|inner| format!("{inner}]"))? } else { host.split(':').next()?.to_string() };
    let host      = host.to_lowercase();
    Some(host.strip_prefix("www.").map(str::to_string).unwrap_or(host))
}

fn is_ip(host: &str) -> bool {
    host.starts_with('[') || (host.split('.').count() == 4 && host.split('.').all(|part| !part.is_empty() && part.parse::<u8>().is_ok()))
}

// Plain words about what looks wrong with a link (nothing: it looks normal).
pub fn warnings_of(url: &str) -> Vec<String> {
    let mut found = Vec::new();
    let trimmed   = url.trim();
    let Some(host) = host_of(trimmed) else { return found };
    let authority = trimmed.split_once("://").map(|(_, rest)| rest.split(['/', '?', '#']).next().unwrap_or_default()).unwrap_or_default();

    if trimmed.to_lowercase().starts_with("http://") {
        found.push("No es seguro: empieza con http, sin «s». Lo que escribas ahí podría verlo alguien más.".to_string());
    }
    if authority.contains('@') {
        found.push("Esconde a dónde va: tiene una @ antes del nombre del sitio.".to_string());
    }
    if is_ip(&host) {
        found.push("Va a una dirección de números, no a un sitio con nombre.".to_string());
    }
    if !host.is_ascii() || host.split('.').any(|label| label.starts_with("xn--")) {
        found.push("El nombre del sitio tiene letras raras que pueden imitar a otras (por ejemplo una «а» que no es «a»).".to_string());
    }
    if SHORTENERS.contains(&host.as_str()) {
        found.push("Es un enlace acortado: no se ve a qué sitio lleva de verdad.".to_string());
    }
    found
}

// A WiFi code ("WIFI:T:WPA;S:Casa;P:clave;;") with its escapes undone.
fn parse_wifi(text: &str) -> Option<ReadKind> {
    let body = text.strip_prefix("WIFI:").or_else(|| text.strip_prefix("wifi:"))?;
    let (mut ssid, mut password, mut kind, mut hidden) = (String::new(), String::new(), String::new(), false);
    let (mut field, mut value, mut escaped) = (String::new(), String::new(), false);
    let mut in_value = false;

    for character in body.chars() {
        if escaped {
            value.push(character);
            escaped = false;
            continue;
        }
        match character {
            '\\' if in_value => escaped = true,
            ':' if !in_value => in_value = true,
            ';' => {
                match field.to_uppercase().as_str() {
                    "S" => ssid = std::mem::take(&mut value),
                    "P" => password = std::mem::take(&mut value),
                    "T" => kind = std::mem::take(&mut value),
                    "H" => hidden = value.eq_ignore_ascii_case("true"),
                    _   => {}
                }
                field.clear();
                value.clear();
                in_value = false;
            }
            _ if in_value => value.push(character),
            _ => field.push(character),
        }
    }
    let security = match kind.to_uppercase().as_str() {
        "WEP"            => WifiSecurity::Wep,
        "NOPASS" | ""    => if password.is_empty() { WifiSecurity::Open } else { WifiSecurity::Wpa },
        _                => WifiSecurity::Wpa,
    };
    Some(ReadKind::Wifi { ssid, password, security, hidden })
}

fn unescape_vcard(value: &str) -> String {
    let mut out     = String::new();
    let mut escaped = false;
    for character in value.chars() {
        match (escaped, character) {
            (true, 'n' | 'N') => out.push('\n'),
            (true, other)     => out.push(other),
            (false, '\\')     => {
                escaped = true;
                continue;
            }
            (false, other)    => out.push(other),
        }
        escaped = false;
    }
    out
}

// A vCard: its name, phone, email and company.
fn parse_vcard(text: &str) -> ReadKind {
    let (mut name, mut phone, mut email, mut company, mut structured) = (String::new(), String::new(), String::new(), String::new(), String::new());
    for line in text.lines() {
        let Some((key, value)) = line.split_once(':') else { continue };
        let key = key.split(';').next().unwrap_or_default().to_uppercase();
        match key.as_str() {
            "FN"    => name = unescape_vcard(value),
            "N"     => structured = value.split(';').filter(|part| !part.is_empty()).rev().map(unescape_vcard).collect::<Vec<_>>().join(" "),
            "TEL" if phone.is_empty()  => phone = value.trim().to_string(),
            "EMAIL" if email.is_empty() => email = value.trim().to_string(),
            "ORG"   => company = unescape_vcard(value).replace(';', " ").trim().to_string(),
            _       => {}
        }
    }
    if name.is_empty() {
        name = structured;
    }
    ReadKind::Contact { name, phone, email, company, vcard: text.to_string() }
}

// "MECARD:N:Ana;TEL:999;EMAIL:a@b.c;;" (the other way of writing a contact), as a vCard.
fn mecard_to_vcard(text: &str) -> Option<String> {
    let body = text.strip_prefix("MECARD:")?;
    let mut lines = vec!["BEGIN:VCARD".to_string(), "VERSION:3.0".to_string()];
    for part in body.split(';') {
        let Some((key, value)) = part.split_once(':') else { continue };
        let value = value.replace("\\,", ",").replace("\\:", ":");
        match key {
            "N"     => {
                let name = value.split(',').rev().collect::<Vec<_>>().join(" ");
                lines.push(format!("FN:{}", name.trim()));
            }
            "TEL"   => lines.push(format!("TEL:{value}")),
            "EMAIL" => lines.push(format!("EMAIL:{value}")),
            "ORG"   => lines.push(format!("ORG:{value}")),
            _       => {}
        }
    }
    lines.push("END:VCARD".to_string());
    Some(lines.join("\r\n"))
}

fn query_value(query: &str, key: &str) -> String {
    query
        .split('&')
        .find_map(|pair| pair.split_once('=').filter(|(name, _)| name.eq_ignore_ascii_case(key)).map(|(_, value)| decode_component(value)))
        .unwrap_or_default()
}

// %XX and + back to their characters.
pub fn decode_component(value: &str) -> String {
    let bytes   = value.as_bytes();
    let mut out = Vec::new();
    let mut at  = 0;
    while at < bytes.len() {
        match bytes[at] {
            b'%' if at + 2 < bytes.len() => {
                let pair = std::str::from_utf8(&bytes[at + 1..at + 3]).ok().and_then(|hex| u8::from_str_radix(hex, 16).ok());
                match pair {
                    Some(byte) => {
                        out.push(byte);
                        at += 3;
                        continue;
                    }
                    None => out.push(b'%'),
                }
            }
            b'+' => out.push(b' '),
            byte => out.push(byte),
        }
        at += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn classify(text: &str) -> ReadKind {
    let trimmed = text.trim();
    let lower   = trimmed.to_lowercase();
    if lower.starts_with("wifi:") {
        if let Some(wifi) = parse_wifi(trimmed) {
            return wifi;
        }
    }
    if lower.starts_with("begin:vcard") {
        return parse_vcard(trimmed);
    }
    if let Some(vcard) = mecard_to_vcard(trimmed) {
        return parse_vcard(&vcard);
    }
    if lower.starts_with("mailto:") {
        let rest           = &trimmed[7..];
        let (to, query)    = rest.split_once('?').unwrap_or((rest, ""));
        return ReadKind::Email { to: decode_component(to), subject: query_value(query, "subject"), body: query_value(query, "body") };
    }
    if lower.starts_with("tel:") {
        return ReadKind::Phone { number: trimmed[4..].to_string() };
    }
    if (lower.starts_with("http://") || lower.starts_with("https://")) && !trimmed.contains(char::is_whitespace) {
        let host = host_of(trimmed).unwrap_or_default();
        return ReadKind::Link { url: trimmed.to_string(), host, warnings: warnings_of(trimmed) };
    }
    ReadKind::Text { text: text.to_string() }
}
