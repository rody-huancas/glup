// Every picture here is drawn by the tests themselves: a light sheet, turned and in perspective, on a
// dark table, with lines of "text", a shadow or yellowed paper. Nothing is read from disk.
use image::{GrayImage, Luma, Rgb, RgbImage};

use super::{
    detect::{detect, find_sheet},
    document::{build, image_rect, pack_bits, page_points, win_ansi, PaperChoice, ScanPdfPage, A4_POINTS, LETTER_POINTS},
    enhance::{enhance, threshold, PageImage, ScanMode},
    geometry::{area, full_frame, is_convex, order_corners, page_pixels, Homography, PaperMatch, Point, Quad},
    straighten,
    warp::{rotate, warp, WarpParams},
    ScanDocument, ScanPage,
};
use crate::services::text::ocr::WordBox;

fn inside(quad: &Quad, x: f64, y: f64) -> bool {
    (0..4).all(|index| {
        let (a, b) = (quad[index], quad[(index + 1) % 4]);
        (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) >= 0.0
    })
}

// A cheap repeatable noise, so the table is not a flat colour.
fn noise(x: u32, y: u32) -> u8 {
    ((x.wrapping_mul(73_856_093) ^ y.wrapping_mul(19_349_663)) % 17) as u8
}

// A sheet (corners in pixels, clockwise from the top left) with dark lines of text, on a dark table.
fn photo(width: u32, height: u32, sheet: Quad) -> RgbImage {
    let back = Homography::between(&sheet, &[Point::new(0.0, 0.0), Point::new(1.0, 0.0), Point::new(1.0, 1.0), Point::new(0.0, 1.0)]).unwrap();

    RgbImage::from_fn(width, height, |x, y| {
        let (px, py) = (x as f64 + 0.5, y as f64 + 0.5);
        if !inside(&sheet, px, py) {
            let value = 45 + noise(x, y);
            return Rgb([value, value - 5, value - 10]);
        }
        let on_page = back.apply(Point::new(px, py));
        let line    = (on_page.y * 20.0).fract() < 0.18 && on_page.y > 0.1 && on_page.y < 0.9 && on_page.x > 0.1 && on_page.x < 0.85;
        if line { Rgb([35, 35, 40]) } else { Rgb([228, 226, 220]) }
    })
}

fn near(found: &Quad, expected: &Quad, width: f64, height: f64, tolerance: f64) -> bool {
    found.iter().zip(expected.iter()).all(|(a, b)| (a.x - b.x / width).abs() < tolerance && (a.y - b.y / height).abs() < tolerance)
}

#[test]
fn corners_in_any_order_come_out_clockwise_from_the_top_left() {
    let quad = [Point::new(10.0, 10.0), Point::new(90.0, 12.0), Point::new(95.0, 80.0), Point::new(8.0, 85.0)];
    assert_eq!(order_corners([quad[2], quad[0], quad[3], quad[1]]), quad);
    assert_eq!(order_corners([quad[3], quad[2], quad[1], quad[0]]), quad);

    // Turned by 45 degrees: the top one is the one with the smallest x + y.
    let diamond = [Point::new(50.0, 0.0), Point::new(100.0, 50.0), Point::new(50.0, 100.0), Point::new(0.0, 50.0)];
    let ordered = order_corners([diamond[1], diamond[3], diamond[0], diamond[2]]);
    assert!(is_convex(&ordered));
    assert_eq!(ordered[0], Point::new(50.0, 0.0));
    assert_eq!(ordered[1], Point::new(100.0, 50.0));
}

#[test]
fn a_bow_tie_is_not_a_sheet() {
    let crossed = [Point::new(0.0, 0.0), Point::new(10.0, 10.0), Point::new(10.0, 0.0), Point::new(0.0, 10.0)];
    assert!(!is_convex(&crossed));
    assert!(is_convex(&full_frame()));
}

#[test]
fn the_perspective_maps_each_corner_and_keeps_straight_lines_straight() {
    let page  = [Point::new(0.0, 0.0), Point::new(210.0, 0.0), Point::new(210.0, 297.0), Point::new(0.0, 297.0)];
    let photo = [Point::new(120.0, 80.0), Point::new(420.0, 100.0), Point::new(470.0, 560.0), Point::new(90.0, 520.0)];
    let map   = Homography::between(&page, &photo).unwrap();

    for (from, to) in page.iter().zip(photo.iter()) {
        let mapped = map.apply(*from);
        assert!((mapped.x - to.x).abs() < 1e-6 && (mapped.y - to.y).abs() < 1e-6);
    }

    // The middle of the top edge lands on the line between the two top corners.
    let middle = map.apply(Point::new(105.0, 0.0));
    let cross  = (photo[1].x - photo[0].x) * (middle.y - photo[0].y) - (photo[1].y - photo[0].y) * (middle.x - photo[0].x);
    assert!(cross.abs() < 1e-6);

    // From three corners on one line there is no mapping.
    let flat = [Point::new(0.0, 0.0), Point::new(1.0, 1.0), Point::new(2.0, 2.0), Point::new(0.0, 5.0)];
    assert!(Homography::between(&flat, &photo).is_none());
}

#[test]
fn the_page_takes_the_proportion_of_a4_carta_or_its_own() {
    // Measured 1000 x 1400 (A4 is 1.414): an A4 of 1000 x 1400 at most, long side kept.
    let a4 = [Point::new(0.0, 0.0), Point::new(1000.0, 0.0), Point::new(1000.0, 1400.0), Point::new(0.0, 1400.0)];
    let (width, height, paper) = page_pixels(&a4, 5000.0);
    assert_eq!(paper, PaperMatch::A4);
    assert_eq!((width, height), (990, 1400));

    let letter = [Point::new(0.0, 0.0), Point::new(1300.0, 0.0), Point::new(1300.0, 1000.0), Point::new(0.0, 1000.0)];
    let (width, height, paper) = page_pixels(&letter, 800.0);
    assert_eq!(paper, PaperMatch::Letter);
    assert_eq!((width, height), (800, 618));

    let receipt = [Point::new(0.0, 0.0), Point::new(300.0, 0.0), Point::new(300.0, 900.0), Point::new(0.0, 900.0)];
    assert_eq!(page_pixels(&receipt, 5000.0), (300, 900, PaperMatch::Own));
}

#[test]
fn finds_a_sheet_turned_and_in_perspective_on_a_dark_table() {
    let cases: [Quad; 3] = [
        // Straight.
        [Point::new(150.0, 80.0), Point::new(650.0, 80.0), Point::new(650.0, 540.0), Point::new(150.0, 540.0)],
        // Turned about 12 degrees.
        [Point::new(220.0, 60.0), Point::new(640.0, 150.0), Point::new(560.0, 560.0), Point::new(140.0, 470.0)],
        // In perspective (photographed from below).
        [Point::new(260.0, 70.0), Point::new(560.0, 90.0), Point::new(690.0, 560.0), Point::new(110.0, 540.0)],
    ];

    for sheet in cases {
        let found = detect(&photo(800, 600, sheet));
        assert!(found.found, "no sheet found for {sheet:?}");
        assert!(near(&found.corners, &sheet, 800.0, 600.0, 0.02), "corners {:?} far from {sheet:?}", found.corners);
    }
}

#[test]
fn without_a_clear_sheet_it_offers_the_whole_photo() {
    // A smooth gradient and nothing else.
    let plain = RgbImage::from_fn(640, 480, |x, _| {
        let value = (x * 255 / 640) as u8;
        Rgb([value, value, value])
    });
    let found = detect(&plain);
    assert!(!found.found);
    assert_eq!(found.corners, full_frame());

    // All white: the sheet fills the photo, nothing to cut out.
    assert!(find_sheet(&GrayImage::from_pixel(400, 300, Luma([240]))).is_none());

    // A thin light strip is not a sheet.
    let strip = GrayImage::from_fn(400, 300, |_, y| Luma([if (140..150).contains(&y) { 230 } else { 30 }]));
    assert!(find_sheet(&strip).is_none());
}

#[test]
fn straightening_cuts_the_sheet_out_square() {
    let sheet    = [Point::new(220.0, 60.0), Point::new(640.0, 150.0), Point::new(560.0, 560.0), Point::new(140.0, 470.0)];
    let picture  = photo(800, 600, sheet);
    let corners  = sheet.map(|point| Point::new(point.x / 800.0, point.y / 600.0));
    let straight = straighten(&picture, &ScanPage { path: String::new(), corners, rotation: 0 }, 900.0).unwrap();

    // Hardly any table is left: the border of the page is paper.
    let (width, height) = straight.image.dimensions();
    let border: Vec<u8> = (0..width).flat_map(|x| [straight.image.get_pixel(x, 2).0[0], straight.image.get_pixel(x, height - 3).0[0]]).collect();
    let light           = border.iter().filter(|value| **value > 180).count();
    assert!(light * 100 / border.len() > 95, "only {light} of {} light", border.len());

    // The lines of text come out level: a row through one of them is dark across.
    let row = (0..height).find(|y| straight.image.get_pixel(width / 2, *y).0[0] < 100).unwrap();
    let dark = (width / 5..width * 4 / 5).filter(|x| straight.image.get_pixel(*x, row + 1).0[0] < 130).count();
    assert!(dark as u32 > (width * 3 / 5) * 8 / 10, "the line is not level ({dark})");

    // Turned a quarter: the sides swap.
    let turned = straighten(&picture, &ScanPage { path: String::new(), corners, rotation: 90 }, 900.0).unwrap();
    assert_eq!(turned.image.dimensions(), (height, width));

    // Corners given in any order are put in order; one inside the other three is not a sheet.
    let shuffled = [corners[2], corners[0], corners[3], corners[1]];
    assert!(straighten(&picture, &ScanPage { path: String::new(), corners: shuffled, rotation: 0 }, 900.0).is_ok());
    let folded = [Point::new(0.1, 0.1), Point::new(0.9, 0.1), Point::new(0.5, 0.9), Point::new(0.5, 0.3)];
    assert!(straighten(&picture, &ScanPage { path: String::new(), corners: folded, rotation: 0 }, 900.0).is_err());
}

#[test]
fn warping_a_whole_frame_keeps_the_picture() {
    let picture = RgbImage::from_fn(40, 30, |x, y| Rgb([(x * 6) as u8, (y * 8) as u8, 100]));
    let corners = [Point::new(0.0, 0.0), Point::new(40.0, 0.0), Point::new(40.0, 30.0), Point::new(0.0, 30.0)];
    let out     = warp(WarpParams { photo: &picture, corners, width: 40, height: 30 }).unwrap();
    assert_eq!(out.get_pixel(5, 7), picture.get_pixel(5, 7));
    assert_eq!(rotate(out, 180).get_pixel(0, 0), picture.get_pixel(39, 29));
}

// A page with a shadow from left to right (paper 225 → 120) and yellowed, with black text.
fn shadowed_page() -> RgbImage {
    RgbImage::from_fn(400, 560, |x, y| {
        let light = 225.0 - 105.0 * x as f64 / 400.0;
        let text  = (y / 14) % 2 == 1 && y > 40 && y < 520 && x > 30 && x < 370 && (x / 9) % 4 != 3;
        if text { Rgb([30, 28, 25]) } else { Rgb([light as u8, (light * 0.95) as u8, (light * 0.72) as u8]) }
    })
}

#[test]
fn the_three_modes_whiten_the_paper_and_keep_the_text_dark() {
    let page = shadowed_page();
    let text = (40, 15 * 14 + 3);
    // Paper in the light and in the shadow.
    let papers = [(20, 300), (390, 300)];

    let PageImage::Color(color) = enhance(&page, ScanMode::Color) else { panic!("colour") };
    for (x, y) in papers {
        let [red, green, blue] = color.get_pixel(x, y).0;
        assert!(red > 240 && green > 240 && blue > 235, "paper {x},{y} is {red},{green},{blue}");
    }
    assert!(color.get_pixel(text.0, text.1).0.iter().all(|channel| *channel < 60));

    let PageImage::Gray(gray) = enhance(&page, ScanMode::Gray) else { panic!("grey") };
    for (x, y) in papers {
        assert!(gray.get_pixel(x, y).0[0] > 240);
    }
    assert!(gray.get_pixel(text.0, text.1).0[0] < 60);

    let PageImage::Bw(bw) = enhance(&page, ScanMode::Bw) else { panic!("black and white") };
    assert!(bw.pixels().all(|pixel| pixel.0[0] == 0 || pixel.0[0] == 255));
    for (x, y) in papers {
        assert_eq!(bw.get_pixel(x, y).0[0], 255);
    }
    assert_eq!(bw.get_pixel(text.0, text.1).0[0], 0);
    // The shadowed half has no black stains: only the text is ink.
    let stains = (20..400).flat_map(|x| (0..30).map(move |y| (x, y))).filter(|(x, y)| bw.get_pixel(*x, *y).0[0] == 0).count();
    assert_eq!(stains, 0);
}

#[test]
fn the_adaptive_threshold_keeps_a_large_black_area_black() {
    let page = GrayImage::from_fn(200, 200, |x, _| Luma([if x < 100 { 20 } else { 250 }]));
    let bw   = threshold(&page);
    assert_eq!(bw.get_pixel(50, 100).0[0], 0);
    assert_eq!(bw.get_pixel(150, 100).0[0], 255);
}

#[test]
fn spanish_text_goes_into_the_pdf_encoding() {
    assert_eq!(win_ansi("año"), vec![b'a', 0xF1, b'o']);
    assert_eq!(win_ansi("¿Qué?"), vec![0xBF, b'Q', b'u', 0xE9, b'?']);
    assert_eq!(win_ansi("“sí” €"), vec![0x93, b's', 0xED, 0x94, b' ', 0x80]);
    assert_eq!(win_ansi("日本"), vec![b'?', b'?']);
}

#[test]
fn black_and_white_goes_one_bit_per_pixel() {
    let page = GrayImage::from_fn(10, 2, |x, y| Luma([if (x + y) % 2 == 0 { 255 } else { 0 }]));
    assert_eq!(pack_bits(&page), vec![0b1010_1010, 0b1000_0000, 0b0101_0101, 0b0100_0000]);
}

#[test]
fn the_page_size_follows_the_choice_and_the_sheet() {
    assert_eq!(page_points(PaperChoice::Auto, PaperMatch::A4, 1000, 1414), A4_POINTS);
    assert_eq!(page_points(PaperChoice::Auto, PaperMatch::Letter, 1300, 1000), (LETTER_POINTS.1, LETTER_POINTS.0));
    assert_eq!(page_points(PaperChoice::Letter, PaperMatch::A4, 1000, 1414), LETTER_POINTS);
    let (width, height) = page_points(PaperChoice::Auto, PaperMatch::Own, 300, 900);
    assert!((height - A4_POINTS.1).abs() < 1e-9 && (width - A4_POINTS.1 / 3.0).abs() < 1e-9);

    // A receipt on an A4 sits in the middle.
    let (left, bottom, width, height) = image_rect(A4_POINTS, 300, 900);
    assert!((height - A4_POINTS.1).abs() < 1e-6);
    assert!((left - (A4_POINTS.0 - width) / 2.0).abs() < 1e-6 && bottom.abs() < 1e-6);
}

#[test]
fn the_pdf_has_every_page_and_the_hidden_text_on_the_read_ones() {
    let words = vec![
        WordBox { text: "Hola".to_string(), x: 0.1, y: 0.1, width: 0.2, height: 0.04 },
        WordBox { text: "señor".to_string(), x: 0.35, y: 0.1, width: 0.25, height: 0.04 },
    ];
    let color = RgbImage::from_pixel(210, 297, Rgb([250, 250, 250]));
    let bw    = GrayImage::from_pixel(297, 210, Luma([255]));
    let pages = vec![
        ScanPdfPage { image: PageImage::Color(color), words, paper: PaperMatch::A4 },
        ScanPdfPage { image: PageImage::Bw(bw), words: Vec::new(), paper: PaperMatch::A4 },
    ];

    let bytes    = build(&pages, PaperChoice::Auto).unwrap();
    let document = lopdf::Document::load_mem(&bytes).unwrap();
    let ids: Vec<_> = document.get_pages().into_values().collect();
    assert_eq!(ids.len(), 2);

    // The first page is an upright A4; the second, turned, a landscape A4.
    let media = |id| document.get_dictionary(id).unwrap().get(b"MediaBox").unwrap().as_array().unwrap().iter().map(|value| value.as_float().unwrap()).collect::<Vec<_>>();
    assert!((media(ids[0])[3] as f64 - A4_POINTS.1).abs() < 0.1);
    assert!((media(ids[1])[2] as f64 - A4_POINTS.1).abs() < 0.1);

    // Invisible text (render mode 3) with its words; the page without words has none.
    let first = String::from_utf8_lossy(&document.get_page_content(ids[0])).into_owned();
    assert!(first.contains("3 Tr"));
    assert!(first.contains("(Hola)"));
    let second = String::from_utf8_lossy(&document.get_page_content(ids[1])).into_owned();
    assert!(!second.contains("Tr"));

    let text = document.extract_text(&[1]).unwrap();
    assert!(text.contains("Hola"), "text: {text}");

    // Black and white is stored one bit per pixel.
    let resources = document.get_dictionary(ids[1]).unwrap().get(b"Resources").unwrap().as_dict().unwrap();
    let image_id  = resources.get(b"XObject").unwrap().as_dict().unwrap().get(b"Im0").unwrap().as_reference().unwrap();
    let image     = document.get_object(image_id).unwrap().as_stream().unwrap();
    assert_eq!(image.dict.get(b"BitsPerComponent").unwrap().as_i64().unwrap(), 1);

    assert!(build(&[], PaperChoice::Auto).is_err());
}

#[test]
fn the_history_line_says_how_many_pages_and_whether_they_can_be_searched() {
    let document = |pages, read| ScanDocument { bytes: Vec::new(), pages, read };
    assert_eq!(super::detail(&document(1, 0)), "Escaneado · 1 página");
    assert_eq!(super::detail(&document(3, 2)), "Escaneado · 3 páginas · con texto que se puede buscar");
}

#[test]
fn a_detected_sheet_covers_most_of_its_quadrilateral() {
    let sheet = [Point::new(150.0, 80.0), Point::new(650.0, 80.0), Point::new(650.0, 540.0), Point::new(150.0, 540.0)];
    let found = detect(&photo(800, 600, sheet));
    let share = area(&found.corners);
    assert!((share - 500.0 * 460.0 / (800.0 * 600.0)).abs() < 0.02);
}
