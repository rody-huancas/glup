use image::{Rgba, RgbaImage};

use super::{
    apply, detail,
    draw::{load_font, logo_stamp, rotate, text_stamp, FontChoice, TextStamp},
    layout::{mark_height, margin, mosaic_centers, place, Place},
    MarkKind, MarkOptions,
};

fn white(width: u32, height: u32) -> RgbaImage {
    RgbaImage::from_pixel(width, height, Rgba([255, 255, 255, 255]))
}

fn changed(before: &RgbaImage, after: &RgbaImage, x: u32, y: u32, w: u32, h: u32) -> bool {
    (y..y + h).any(|row| (x..x + w).any(|column| before.get_pixel(column, row) != after.get_pixel(column, row)))
}

#[test]
fn the_mark_is_sized_by_the_shorter_side() {
    assert_eq!(mark_height(4000, 3000, 0.05), 150);
    assert_eq!(mark_height(400, 300, 0.05), 15);
    assert_eq!(margin(1000, 800), 32);
}

#[test]
fn nine_places_with_their_margin() {
    let at = |where_| place(where_, 1000, 800, 100, 40);
    assert_eq!(at(Place::TopLeft), (32, 32));
    assert_eq!(at(Place::Top), (450, 32));
    assert_eq!(at(Place::TopRight), (868, 32));
    assert_eq!(at(Place::Left), (32, 380));
    assert_eq!(at(Place::Center), (450, 380));
    assert_eq!(at(Place::Right), (868, 380));
    assert_eq!(at(Place::BottomLeft), (32, 728));
    assert_eq!(at(Place::Bottom), (450, 728));
    assert_eq!(at(Place::BottomRight), (868, 728));
}

#[test]
fn the_mosaic_covers_the_whole_photo() {
    let centers = mosaic_centers(1200, 800, 200, 40);
    assert!(centers.len() > 10, "{}", centers.len());
    // No point of the photo is far from a mark.
    for (x, y) in [(0.0, 0.0), (1200.0, 0.0), (0.0, 800.0), (1200.0, 800.0), (600.0, 400.0), (300.0, 700.0)] {
        let nearest = centers.iter().map(|(cx, cy)| ((cx - x).powi(2) + (cy - y).powi(2)).sqrt()).fold(f64::MAX, f64::min);
        assert!(nearest < 260.0, "({x}, {y}): {nearest}");
    }
    // A bigger mark, fewer of them.
    assert!(mosaic_centers(1200, 800, 400, 80).len() < centers.len());
}

#[test]
fn a_turned_stamp_keeps_all_of_it() {
    let stamp  = RgbaImage::from_pixel(100, 20, Rgba([255, 0, 0, 255]));
    let turned = rotate(&stamp, 30.0);
    assert_eq!((turned.width(), turned.height()), (97, 68));
    let painted = turned.pixels().filter(|pixel| pixel.0[3] > 128).count();
    assert!((painted as f64 - 2000.0).abs() < 200.0, "{painted}");
}

#[test]
fn a_logo_goes_at_its_place_with_its_opacity() {
    let folder = std::env::temp_dir().join(format!("glup-mark-tests-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let logo = folder.join("logo.png");
    RgbaImage::from_pixel(200, 100, Rgba([0, 0, 255, 255])).save(&logo).unwrap();
    assert_eq!(logo_stamp(&logo, 40).unwrap().dimensions(), (80, 40));

    let options   = MarkOptions { kind: MarkKind::Logo, logo: Some(logo.to_string_lossy().into_owned()), size: 0.1, opacity: 0.5, ..MarkOptions::default() };
    let before    = white(1000, 600);
    let mut after = before.clone();
    apply(&mut after, &options).unwrap();
    // 60 px tall, 120 wide, 24 px from the bottom-right corner, half blue.
    assert_eq!(*after.get_pixel(1000 - 24 - 60, 600 - 24 - 30), Rgba([127, 127, 255, 255]));
    assert!(!changed(&before, &after, 0, 0, 500, 300));

    let mut faint = before.clone();
    apply(&mut faint, &MarkOptions { opacity: 0.0, ..options.clone() }).unwrap();
    assert_eq!(faint, before);

    let mut tiled = before.clone();
    apply(&mut tiled, &MarkOptions { place: Place::Mosaic, ..options }).unwrap();
    for (x, y) in [(0, 0), (500, 0), (0, 300), (500, 300)] {
        assert!(changed(&before, &tiled, x, y, 500, 300), "({x}, {y})");
    }
    let _ = std::fs::remove_dir_all(&folder);
}

#[test]
fn a_text_mark_in_a_font_of_windows() {
    let Ok(font) = load_font(FontChoice::Arial) else { return eprintln!("sin Arial: se salta") };
    let stamp = text_stamp(TextStamp { font: &font, text: "Glup", height: 60, color: [255, 0, 0], shadow: true });
    assert!(stamp.height() >= 60 && stamp.width() > 100, "{:?}", stamp.dimensions());
    assert!(stamp.pixels().any(|pixel| pixel.0[0] > 200 && pixel.0[1] < 60 && pixel.0[3] > 200));
    // The shadow: dark, half-transparent pixels.
    assert!(stamp.pixels().any(|pixel| pixel.0[0] < 40 && pixel.0[3] > 20 && pixel.0[3] < 200));

    let options   = MarkOptions { kind: MarkKind::Text, text: "© Glup".to_string(), font: FontChoice::Arial, color: "#000000".to_string(), shadow: false, place: Place::TopLeft, size: 0.08, opacity: 1.0, ..MarkOptions::default() };
    let before    = white(800, 500);
    let mut after = before.clone();
    apply(&mut after, &options).unwrap();
    assert!(changed(&before, &after, 0, 0, 400, 100));
    assert!(!changed(&before, &after, 400, 250, 400, 250));
    assert_eq!(detail(&options), "Marca «© Glup»");
    assert!(apply(&mut after, &MarkOptions { text: "  ".to_string(), ..options }).is_err());
}
