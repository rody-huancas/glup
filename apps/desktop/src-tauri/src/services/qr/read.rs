// Every code in a picture: QR (also light on dark) and the usual barcodes (EAN, UPC, Code 128, Code 39),
// with rxing (Apache-2.0). A small screenshot is tried bigger and a huge photo smaller when nothing is
// found at first.
use std::collections::HashSet;

use image::{imageops::FilterType, DynamicImage, GrayImage};
use rxing::{helpers::detect_multiple_in_luma_with_hints, BarcodeFormat, DecodeHints};
use serde::Serialize;

use crate::services::qr::parse::{classify, ReadKind};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadCode {
    // "QR", "EAN-13", "Code 128"…
    pub format : String,
    pub text   : String,
    pub read   : ReadKind,
}

fn format_name(format: &BarcodeFormat) -> String {
    match format {
        BarcodeFormat::QR_CODE      => "QR",
        BarcodeFormat::MICRO_QR_CODE => "QR",
        BarcodeFormat::EAN_13       => "EAN-13",
        BarcodeFormat::EAN_8        => "EAN-8",
        BarcodeFormat::UPC_A        => "UPC-A",
        BarcodeFormat::UPC_E        => "UPC-E",
        BarcodeFormat::CODE_128     => "Code 128",
        BarcodeFormat::CODE_39      => "Code 39",
        BarcodeFormat::DATA_MATRIX  => "Data Matrix",
        _                           => "Código",
    }
    .to_string()
}

fn hints() -> DecodeHints {
    let formats = [
        BarcodeFormat::QR_CODE,
        BarcodeFormat::EAN_13,
        BarcodeFormat::EAN_8,
        BarcodeFormat::UPC_A,
        BarcodeFormat::UPC_E,
        BarcodeFormat::CODE_128,
        BarcodeFormat::CODE_39,
        BarcodeFormat::DATA_MATRIX,
    ];
    DecodeHints { TryHarder: Some(true), AlsoInverted: Some(true), PossibleFormats: Some(HashSet::from(formats)), ..DecodeHints::default() }
}

fn scan(gray: &GrayImage) -> Vec<(String, String)> {
    detect_multiple_in_luma_with_hints(gray.as_raw().clone(), gray.width(), gray.height(), &mut hints())
        .map(|found| found.into_iter().map(|code| (format_name(code.getBarcodeFormat()), code.getText().to_string())).collect())
        .unwrap_or_default()
}

// The sizes tried: as it is, then bigger when small or smaller when huge.
pub fn sizes_to_try(width: u32, height: u32) -> Vec<f64> {
    let side = width.max(height);
    match side {
        0..=700        => vec![1.0, 2.0, 3.0],
        701..=2600     => vec![1.0, 0.5],
        _              => vec![1.0, 0.5, 0.25],
    }
}

// Every code found, each once, in the order found.
pub fn read_codes(image: &DynamicImage) -> Vec<ReadCode> {
    let gray       = image.to_luma8();
    let mut seen   = HashSet::new();
    let mut found  = Vec::new();
    for scale in sizes_to_try(gray.width(), gray.height()) {
        let tried = if scale == 1.0 {
            gray.clone()
        } else {
            let (w, h) = (((f64::from(gray.width()) * scale).round() as u32).max(1), ((f64::from(gray.height()) * scale).round() as u32).max(1));
            image::imageops::resize(&gray, w, h, if scale > 1.0 { FilterType::Nearest } else { FilterType::Triangle })
        };
        for (format, text) in scan(&tried) {
            if seen.insert(text.clone()) {
                found.push(ReadCode { read: classify(&text), format, text });
            }
        }
        if !found.is_empty() {
            break;
        }
    }
    found
}
