use image::{DynamicImage, Rgba, RgbaImage};

use super::{
    content::{describe, escape_wifi, file_stem, payload, whatsapp_number, QrContent, WifiSecurity},
    parse::{classify, decode_component, host_of, warnings_of, ReadKind},
    read::read_codes,
    reads_back,
    render::{contrast, matrix, to_image, to_svg, QrStyle, Shape, SvgParams},
    warnings_for,
    wifi::profile_xml,
};

fn style() -> QrStyle {
    QrStyle::default()
}

fn picture(text: &str, style: &QrStyle) -> RgbaImage {
    to_image(&matrix(text, style.logo.is_some()).unwrap(), style, 400)
}

// Made, drawn and read back by Glup's own reader.
fn round_trip(content: &QrContent) -> ReadKind {
    let text  = payload(content).unwrap();
    let codes = read_codes(&DynamicImage::ImageRgba8(picture(&text, &style())));
    assert_eq!(codes.len(), 1, "{text}");
    assert_eq!(codes[0].text, text);
    assert_eq!(codes[0].format, "QR");
    codes[0].read.clone()
}

#[test]
fn every_kind_goes_and_comes_back() {
    let link = round_trip(&QrContent::Text { text: "https://www.glup.app/descargar".to_string() });
    assert!(matches!(link, ReadKind::Link { ref host, ref warnings, .. } if host == "glup.app" && warnings.is_empty()), "{link:?}");

    let text = round_trip(&QrContent::Text { text: "Hola, ¿qué tal?".to_string() });
    assert_eq!(text, ReadKind::Text { text: "Hola, ¿qué tal?".to_string() });

    let wifi = round_trip(&QrContent::Wifi { ssid: "Casa; 2,4G".to_string(), password: "a\\b:c\"d;".to_string(), security: WifiSecurity::Wpa, hidden: false });
    assert_eq!(wifi, ReadKind::Wifi { ssid: "Casa; 2,4G".to_string(), password: "a\\b:c\"d;".to_string(), security: WifiSecurity::Wpa, hidden: false });

    let open = round_trip(&QrContent::Wifi { ssid: "Cafetería".to_string(), password: "no se usa".to_string(), security: WifiSecurity::Open, hidden: true });
    assert!(matches!(open, ReadKind::Wifi { ref password, security: WifiSecurity::Open, hidden: true, .. } if password.is_empty()));

    let chat = round_trip(&QrContent::Whatsapp { country: "51".to_string(), number: "987 654 321".to_string(), message: "Hola, quiero info".to_string() });
    assert!(matches!(chat, ReadKind::Link { ref url, .. } if url == "https://wa.me/51987654321?text=Hola%2C%20quiero%20info"), "{chat:?}");

    let contact = round_trip(&QrContent::Contact { name: "Ana Pérez".to_string(), phone: "+51 999 888 777".to_string(), email: "ana@correo.pe".to_string(), company: "Panadería, S.A.".to_string() });
    assert!(matches!(contact, ReadKind::Contact { ref name, ref phone, ref email, ref company, .. } if name == "Ana Pérez" && phone == "+51 999 888 777" && email == "ana@correo.pe" && company == "Panadería, S.A."), "{contact:?}");

    let mail = round_trip(&QrContent::Email { to: "hola@glup.app".to_string(), subject: "Una duda".to_string(), body: "¿Funciona sin internet?".to_string() });
    assert_eq!(mail, ReadKind::Email { to: "hola@glup.app".to_string(), subject: "Una duda".to_string(), body: "¿Funciona sin internet?".to_string() });
}

#[test]
fn wifi_and_vcard_escape_what_would_break_them() {
    assert_eq!(escape_wifi(r#"a;b,c:d\e"f"#), r#"a\;b\,c\:d\\e\"f"#);
    let text = payload(&QrContent::Wifi { ssid: "Mi;Red".to_string(), password: "p:1".to_string(), security: WifiSecurity::Wep, hidden: false }).unwrap();
    assert_eq!(text, r"WIFI:T:WEP;S:Mi\;Red;P:p\:1;;");

    let vcard = payload(&QrContent::Contact { name: "Ana; Luz".to_string(), phone: "999".to_string(), email: String::new(), company: String::new() }).unwrap();
    assert!(vcard.starts_with("BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Ana\\; Luz;;;\r\nFN:Ana\\; Luz\r\nTEL;TYPE=CELL:999\r\nEND:VCARD"), "{vcard}");
    assert!(matches!(classify(&vcard), ReadKind::Contact { ref name, .. } if name == "Ana; Luz"));
    // The other way of writing a contact, MECARD, is understood too.
    assert!(matches!(classify("MECARD:N:Pérez,Ana;TEL:999;EMAIL:a@b.pe;;"), ReadKind::Contact { ref name, ref phone, .. } if name == "Ana Pérez" && phone == "999"));

    assert!(payload(&QrContent::Wifi { ssid: " ".to_string(), password: String::new(), security: WifiSecurity::Wpa, hidden: false }).is_err());
    assert_eq!(whatsapp_number("51", "+51 987-654-321"), "51987654321");
    assert_eq!(whatsapp_number("", "987654321"), "51987654321");
    assert_eq!(decode_component("Hola%2C%20t%C3%BA+y+yo"), "Hola, tú y yo");
}

#[test]
fn the_history_never_keeps_the_wifi_password() {
    let wifi = QrContent::Wifi { ssid: "Casa".to_string(), password: "secreta123".to_string(), security: WifiSecurity::Wpa, hidden: false };
    assert_eq!(describe(&wifi), "QR de WiFi «Casa»");
    assert!(!file_stem(&wifi).contains("secreta"));
    assert_eq!(file_stem(&QrContent::Text { text: "https://glup.app/x".to_string() }), "qr-enlace-glup.app");
}

#[test]
fn colours_with_little_contrast_are_warned_and_checked() {
    assert!(!contrast("#000000", "#FFFFFF").low);
    assert!(contrast("#BBBBBB", "#FFFFFF").low);
    assert!(contrast("#FFFFFF", "#000000").inverted);
    assert_eq!(contrast("#000000", "#FFFFFF").ratio, 21.0);

    // Pale grey on white: Glup's own reader cannot read it, and says so.
    let text  = "https://glup.app";
    let pale  = QrStyle { dark: "#E8E8E8".to_string(), ..style() };
    assert!(!reads_back(&matrix(text, false).unwrap(), &pale, text));
    let warnings = warnings_for(contrast(&pale.dark, &pale.light), 4, false);
    assert!(warnings.iter().any(|line| line.contains("contraste")) && warnings.iter().any(|line| line.contains("no lo pude leer")));
    // Dark blue on light yellow reads well.
    let fine = QrStyle { dark: "#1B2A6B".to_string(), light: "#FFF6D5".to_string(), ..style() };
    assert!(reads_back(&matrix(text, false).unwrap(), &fine, text));
}

#[test]
fn a_logo_uses_high_correction_and_is_still_read() {
    let text = "https://glup.app/con-logo";
    assert!(matches!(matrix(text, true).unwrap().level, qrcode::EcLevel::H));
    assert!(matches!(matrix(text, false).unwrap().level, qrcode::EcLevel::M));

    let logo   = RgbaImage::from_pixel(64, 64, Rgba([230, 40, 90, 255]));
    let shaped = QrStyle { dots: Shape::Circle, corners: Shape::Rounded, logo: Some(logo), ..style() };
    let code   = matrix(text, true).unwrap();
    assert!(reads_back(&code, &shaped, text));
    let svg = to_svg(SvgParams { matrix: &code, style: &shaped, logo: Some(&[137, 80, 78, 71]) });
    assert!(svg.starts_with("<svg") && svg.contains("data:image/png;base64,iVBORw==") && svg.contains("fill-rule=\"evenodd\""));
    // Every shape still reads.
    for dots in [Shape::Square, Shape::Rounded, Shape::Circle] {
        for corners in [Shape::Square, Shape::Rounded, Shape::Circle] {
            assert!(reads_back(&matrix(text, false).unwrap(), &QrStyle { dots, corners, ..style() }, text), "{dots:?} {corners:?}");
        }
    }
}

#[test]
fn several_codes_in_one_picture() {
    let first  = picture("https://glup.app/uno", &style());
    let second = picture("Segundo código", &style());
    let mut both = RgbaImage::from_pixel(900, 460, Rgba([255, 255, 255, 255]));
    image::imageops::replace(&mut both, &first, 20, 30);
    image::imageops::replace(&mut both, &second, 470, 30);

    let mut found: Vec<String> = read_codes(&DynamicImage::ImageRgba8(both)).into_iter().map(|code| code.text).collect();
    found.sort();
    assert_eq!(found, vec!["Segundo código".to_string(), "https://glup.app/uno".to_string()]);
}

#[test]
fn a_barcode_is_read_too() {
    use rxing::{BarcodeFormat, MultiFormatWriter, Writer};

    let matrix = MultiFormatWriter.encode("7751271001236", &BarcodeFormat::EAN_13, 380, 120).unwrap();
    let mut bars = RgbaImage::from_pixel(460, 180, Rgba([255, 255, 255, 255]));
    for y in 0..matrix.getHeight() {
        for x in 0..matrix.getWidth() {
            if matrix.get(x, y) {
                bars.put_pixel(x + 40, y + 30, Rgba([0, 0, 0, 255]));
            }
        }
    }
    let codes = read_codes(&DynamicImage::ImageRgba8(bars));
    assert_eq!(codes.len(), 1);
    assert_eq!((codes[0].format.as_str(), codes[0].text.as_str()), ("EAN-13", "7751271001236"));
}

#[test]
fn suspicious_links_are_told_plainly() {
    assert!(warnings_of("https://www.bcp.com.pe/").is_empty());
    assert!(warnings_of("http://banco.pe/login")[0].contains("http"));
    assert!(warnings_of("https://192.168.1.20/pago").iter().any(|line| line.contains("números")));
    assert!(warnings_of("https://bit.ly/3abc").iter().any(|line| line.contains("acortado")));
    assert!(warnings_of("https://xn--pypal-4ve.com/").iter().any(|line| line.contains("letras raras")));
    assert!(warnings_of("https://pаypal.com/").iter().any(|line| line.contains("letras raras")));
    assert!(warnings_of("https://bcp.com.pe@estafa.ru/").iter().any(|line| line.contains("@")));
    assert_eq!(host_of("https://www.Glup.app:8080/a?b"), Some("glup.app".to_string()));
    assert_eq!(host_of("https://user@estafa.ru/x"), Some("estafa.ru".to_string()));
    assert!(matches!(classify("tel:+51999"), ReadKind::Phone { .. }));
    assert!(matches!(classify("https://a.b con espacios"), ReadKind::Text { .. }));
}

#[test]
fn the_wifi_profile_of_windows_is_escaped() {
    let xml = profile_xml("Casa & <Amigos>", "cl'ave", WifiSecurity::Wpa, false);
    assert!(xml.contains("<name>Casa &amp; &lt;Amigos&gt;</name>"));
    assert!(xml.contains("<authentication>WPA2PSK</authentication><encryption>AES</encryption>"));
    assert!(xml.contains("<keyMaterial>cl&apos;ave</keyMaterial>"));
    assert!(!profile_xml("Libre", "", WifiSecurity::Open, true).contains("sharedKey"));
}
