// "Crear un QR" and "Leer un QR": what goes in it and how it looks, checked by reading it back with
// Glup's own reader before saving; and every code found in an image, a PDF, a zone of the screen or the
// image just copied, each with what can be done with it.
pub mod content;
pub mod parse;
pub mod read;
pub mod render;
pub mod wifi;

#[cfg(test)]
mod tests;

use std::{
    fs,
    io::Cursor,
    path::{Path, PathBuf},
};

use image::{codecs::png::PngEncoder, DynamicImage, ImageEncoder, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    content::{describe, file_stem, payload, QrContent, WifiSecurity},
    read::{read_codes, ReadCode},
    render::{contrast, matrix, to_image, to_svg, Contrast, Matrix, QrStyle, SvgParams},
};
use crate::services::{
    clipboard::write,
    destination::{self, Destination},
    history::{self, NewEntryParams},
    image::decode::decode,
    naming::{output_path, OutputKind, OutputNameParams},
};

pub const CREATE_ACTION: &str = "create-qr";
pub const SAVE_ERROR: &str    = "No pude guardar el QR";
pub const LOGO_ERROR: &str    = "No pude abrir el logo";
pub const NO_IMAGE: &str      = "No hay una imagen copiada. Copia una captura o una foto con el QR y vuelve a intentarlo.";
// What is checked: big enough for the reader, small enough to be quick on every change.
const CHECK_SIZE: u32 = 640;

const GLUP_LOGO: &[u8] = include_bytes!("../../../icons/128x128@2x.png");

#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum LogoChoice {
    #[default]
    None,
    Glup,
    File { path: String },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QrRequest {
    pub content : QrContent,
    #[serde(default)]
    pub style   : QrStyle,
    #[serde(default)]
    pub logo    : LogoChoice,
}

fn logo_png(choice: &LogoChoice) -> Result<Option<Vec<u8>>, String> {
    match choice {
        LogoChoice::None         => Ok(None),
        LogoChoice::Glup         => Ok(Some(GLUP_LOGO.to_vec())),
        LogoChoice::File { path } => {
            let image = decode(Path::new(path)).map_err(|_| LOGO_ERROR.to_string())?;
            Ok(Some(png_of(&image.to_rgba8())?))
        }
    }
}

pub fn png_of(image: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    PngEncoder::new(Cursor::new(&mut bytes)).write_image(image.as_raw(), image.width(), image.height(), image::ExtendedColorType::Rgba8).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(bytes)
}

// The code, its style with the logo read, and the logo as PNG (for the SVG).
struct Prepared {
    text   : String,
    matrix : Matrix,
    style  : QrStyle,
    logo   : Option<Vec<u8>>,
}

fn prepare(request: &QrRequest) -> Result<Prepared, String> {
    let text   = payload(&request.content)?;
    let logo   = logo_png(&request.logo)?;
    let matrix = matrix(&text, logo.is_some())?;
    let mut style = request.style.clone();
    style.margin  = style.margin.min(10);
    style.logo    = logo.as_deref().and_then(|bytes| image::load_from_memory(bytes).ok()).map(|image| image.to_rgba8());
    Ok(Prepared { text, matrix, style, logo })
}

// Whether Glup's reader gets the same text back (with a little background around, as on a page).
pub fn reads_back(matrix: &Matrix, style: &QrStyle, text: &str) -> bool {
    let picture = to_image(matrix, style, CHECK_SIZE);
    let pad     = if style.margin < 2 { CHECK_SIZE / 10 } else { 0 };
    let light   = crate::services::social::parse_color(&style.light);
    let mut framed = RgbaImage::from_pixel(CHECK_SIZE + pad * 2, CHECK_SIZE + pad * 2, Rgba([light.0[0], light.0[1], light.0[2], 255]));
    image::imageops::replace(&mut framed, &picture, i64::from(pad), i64::from(pad));
    read_codes(&DynamicImage::ImageRgba8(framed)).iter().any(|code| code.text == text)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QrPreview {
    pub svg      : String,
    pub readable : bool,
    pub contrast : Contrast,
    // "H" with a logo (it can lose 30 % and still be read), "M" otherwise.
    pub level    : String,
    pub warnings : Vec<String>,
}

pub fn warnings_for(contrast: Contrast, margin: u32, readable: bool) -> Vec<String> {
    let mut found = Vec::new();
    if contrast.low {
        found.push(format!("Los colores se parecen mucho (contraste {:.1}): puede que no se lea. Usa puntos oscuros sobre un fondo claro.", contrast.ratio));
    } else if contrast.inverted {
        found.push("Los puntos son más claros que el fondo: muchos celulares no lo leen así.".to_string());
    }
    if margin < 2 {
        found.push("Con tan poco margen, algunos celulares no lo encuentran.".to_string());
    }
    if !readable {
        found.push("Lo probé con mi lector y no lo pude leer: cambia los colores, el logo o las formas antes de guardarlo.".to_string());
    }
    found
}

pub fn preview(request: &QrRequest) -> Result<QrPreview, String> {
    let prepared = prepare(request)?;
    let readable = reads_back(&prepared.matrix, &prepared.style, &prepared.text);
    let contrast = contrast(&prepared.style.dark, &prepared.style.light);
    let svg      = to_svg(SvgParams { matrix: &prepared.matrix, style: &prepared.style, logo: prepared.logo.as_deref() });
    let level    = if matches!(prepared.matrix.level, qrcode::EcLevel::H) { "H" } else { "M" };
    Ok(QrPreview { svg, readable, contrast, level: level.to_string(), warnings: warnings_for(contrast, prepared.style.margin, readable) })
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum QrFormat {
    #[default]
    Png,
    Svg,
    Pdf,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQrRequest {
    #[serde(flatten)]
    pub qr          : QrRequest,
    pub format      : QrFormat,
    // Pixels of the PNG (512, 1024, 2048).
    pub size        : u32,
    pub destination : Option<Destination>,
}

fn bytes_for(prepared: &Prepared, format: QrFormat, size: u32) -> Result<(Vec<u8>, &'static str), String> {
    match format {
        QrFormat::Png => Ok((png_of(&to_image(&prepared.matrix, &prepared.style, size.clamp(128, 4096)))?, "png")),
        QrFormat::Svg => Ok((to_svg(SvgParams { matrix: &prepared.matrix, style: &prepared.style, logo: prepared.logo.as_deref() }).into_bytes(), "svg")),
        QrFormat::Pdf => {
            // The picture, big and sharp, on a page of its size.
            let folder = std::env::temp_dir().join(format!("glup-qr-{}", crate::services::media::serve::new_token()));
            fs::create_dir_all(&folder).map_err(|_| SAVE_ERROR.to_string())?;
            let picture = folder.join("qr.png");
            fs::write(&picture, png_of(&to_image(&prepared.matrix, &prepared.style, 2048))?).map_err(|_| SAVE_ERROR.to_string())?;
            let mut builder = crate::services::image::to_pdf::PdfBuilder::new();
            let made = builder.add_image(&picture).and_then(|()| builder.finish());
            let _    = fs::remove_dir_all(&folder);
            Ok((made?, "pdf"))
        }
    }
}

// Without an original next to it, a new QR goes to Descargas (or its Glup folder, or the one chosen).
fn downloads(app: &AppHandle) -> PathBuf {
    app.path().download_dir().unwrap_or_else(|_| std::env::temp_dir())
}

pub fn save(app: &AppHandle, request: &SaveQrRequest) -> Result<String, String> {
    let prepared = prepare(&request.qr)?;
    let (bytes, extension) = bytes_for(&prepared, request.format, request.size)?;
    let source   = downloads(app).join("qr");
    let folder   = destination::prepare(&source, &request.destination.clone().unwrap_or_default())?;
    let stem     = file_stem(&request.qr.content);
    let output   = output_path(&OutputNameParams { folder: &folder, source: &source, kind: OutputKind::Named { name: &stem, extension } }, &|path: &Path| path.exists());
    fs::write(&output, &bytes).map_err(|_| SAVE_ERROR.to_string())?;

    let kind  = if extension == "pdf" { "pdf" } else { "image" };
    let entry = history::new_entry(NewEntryParams { output: &output, kind, action: CREATE_ACTION, detail: describe(&request.qr.content) });
    let _     = history::append(app, vec![entry]);
    Ok(output.to_string_lossy().into_owned())
}

// «Copiar imagen»: a PNG on the clipboard, to paste it in Word or WhatsApp.
pub fn copy(app: &AppHandle, request: &QrRequest) -> Result<(), String> {
    let prepared = prepare(request)?;
    write::copy_image(app, &png_of(&to_image(&prepared.matrix, &prepared.style, 1024))?)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileCodes {
    pub path  : String,
    pub name  : String,
    pub codes : Vec<ReadCode>,
    pub error : Option<String>,
}

// Each image read for its codes.
pub fn read_files(paths: &[String]) -> Vec<FileCodes> {
    paths
        .iter()
        .map(|path| {
            let name = Path::new(path).file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default();
            match decode(Path::new(path)) {
                Ok(image)  => FileCodes { path: path.clone(), name, codes: read_codes(&image), error: None },
                Err(error) => FileCodes { path: path.clone(), name, codes: Vec::new(), error: Some(error) },
            }
        })
        .collect()
}

// A page of a PDF drawn by the screen (PNG bytes).
pub fn read_bytes(bytes: &[u8]) -> Result<Vec<ReadCode>, String> {
    image::load_from_memory(bytes).map(|image| read_codes(&image)).map_err(|_| crate::services::image::READ_ERROR.to_string())
}

// «Leer lo que copié».
pub fn read_clipboard() -> Result<Vec<ReadCode>, String> {
    let image = crate::services::clipboard::read::copied_image().ok_or_else(|| NO_IMAGE.to_string())?;
    Ok(read_codes(&DynamicImage::ImageRgba8(image)))
}

// «Guardar contacto»: the vCard as it came, in the file chosen.
pub fn save_contact(path: &str, vcard: &str) -> Result<(), String> {
    fs::write(path, crate::services::text::compose::to_windows_lines(vcard)).map_err(|_| SAVE_ERROR.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiRequest {
    pub ssid     : String,
    pub password : String,
    pub security : WifiSecurity,
    #[serde(default)]
    pub hidden   : bool,
}

pub fn connect_wifi(request: &WifiRequest) -> Result<(), String> {
    wifi::connect(&std::env::temp_dir(), &request.ssid, &request.password, request.security, request.hidden)
}
