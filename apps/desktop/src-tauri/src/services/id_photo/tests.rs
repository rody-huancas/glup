use image::{ImageBuffer, Luma, Rgb, RgbImage, Rgba, RgbaImage};

use super::{
    face::{chin_of, detect, FaceBox},
    layout::{cm_to_px, crop_for, framing, history_detail, sheet_layout, sheet_note, too_close_to_edge, EdgeParams, Head, IdFormat, IdKind},
    portrait::{hair_top, on_white, render_crop, smoothstep},
    render_sheet, CUT_LINE,
};
use crate::services::background::mask::Mask;

fn close(actual: f64, expected: f64) -> bool {
    (actual - expected).abs() < 1e-6
}

// --- Sizes ---

#[test]
fn centimeters_to_pixels_at_300_ppp() {
    assert_eq!(cm_to_px(2.54), 300);
    assert_eq!(IdFormat::PASSPORT.pixels(), (413, 531));
    assert_eq!(IdFormat::SQUARE.pixels(), (591, 591));
    assert_eq!((cm_to_px(10.0), cm_to_px(15.0)), (1181, 1772));
}

#[test]
fn custom_sizes_stay_between_1_and_10_cm() {
    let custom = |width_cm, height_cm| IdFormat { kind: IdKind::Custom, width_cm, height_cm };
    assert!(custom(2.5, 3.0).is_valid());
    assert!(!custom(0.5, 3.0).is_valid());
    assert!(!custom(3.0, 12.0).is_valid());
}

// --- Framing ---

#[test]
fn the_head_takes_75_percent_of_a_passport_photo_centered_with_room_above() {
    let head = Head { center_x: 600.0, top: 200.0, chin: 800.0 };
    let crop = crop_for(head, IdFormat::PASSPORT);

    assert!(close(crop.height, 800.0));
    assert!(close(crop.width, 800.0 * 3.5 / 4.5));
    // Centered across the face.
    assert!(close(crop.x + crop.width / 2.0, 600.0));
    // 8 % of the height above the hair, and the chin at 83 %.
    assert!(close(crop.y, 200.0 - 64.0));
    assert!(close((head.chin - crop.y) / crop.height, 0.83));
}

#[test]
fn each_format_has_its_own_framing() {
    let head   = Head { center_x: 500.0, top: 100.0, chin: 700.0 };
    let square = crop_for(head, IdFormat::SQUARE);
    assert!(close(square.width, square.height));
    assert!(close(600.0 / square.height, framing(IdKind::Square).head_share));
}

#[test]
fn the_chin_is_a_little_below_the_face_box() {
    assert!(close(chin_of(FaceBox { x: 0.0, y: 100.0, width: 200.0, height: 200.0 }), 304.0));
}

#[test]
fn warns_when_the_head_touches_the_edge() {
    let face = (400.0, 300.0, 300.0, 300.0);
    let ok   = EdgeParams { head: Head { center_x: 550.0, top: 150.0, chin: 640.0 }, face, image: (1200, 1600) };
    assert!(!too_close_to_edge(ok));

    let cut_hair = EdgeParams { head: Head { center_x: 550.0, top: 0.0, chin: 640.0 }, face, image: (1200, 1600) };
    assert!(too_close_to_edge(cut_hair));

    let side = EdgeParams { head: Head { center_x: 150.0, top: 150.0, chin: 640.0 }, face: (0.0, 300.0, 300.0, 300.0), image: (1200, 1600) };
    assert!(too_close_to_edge(side));
}

// --- The top of the hair and the white background ---

fn person_mask(width: u32, height: u32, top: u32) -> Mask {
    ImageBuffer::from_fn(width, height, |x, y| Luma([if y >= top && (30..70).contains(&x) { 1.0 } else { 0.0 }]))
}

#[test]
fn finds_the_top_of_the_hair_over_the_face() {
    let mask = person_mask(100, 120, 18);
    assert_eq!(hair_top(&mask, 40.0, 20.0), Some(18));
    // Nobody there.
    assert_eq!(hair_top(&ImageBuffer::from_pixel(100, 120, Luma([0.0])), 40.0, 20.0), None);
}

#[test]
fn the_edge_drops_the_faint_fringe_and_keeps_the_person() {
    assert_eq!(smoothstep(0.1), 0.0);
    assert_eq!(smoothstep(0.95), 1.0);
    assert!(smoothstep(0.55) > 0.4 && smoothstep(0.55) < 0.6);

    // A green background pixel with a weak mask becomes pure white; the person stays as is.
    let image = RgbaImage::from_fn(2, 1, |x, _| if x == 0 { Rgba([0, 200, 0, 255]) } else { Rgba([90, 60, 40, 255]) });
    let mask  = ImageBuffer::from_fn(2, 1, |x, _| Luma([if x == 0 { 0.25 } else { 1.0 }]));
    let white = on_white(&image, &mask);
    assert_eq!(white.get_pixel(0, 0), &Rgb([255, 255, 255]));
    assert_eq!(white.get_pixel(1, 0), &Rgb([90, 60, 40]));
}

#[test]
fn outside_the_photo_the_crop_is_white() {
    let photo = RgbImage::from_pixel(100, 100, Rgb([10, 10, 10]));
    let crop  = render_crop(&photo, super::layout::Crop { x: -50.0, y: 0.0, width: 100.0, height: 100.0 }, (100, 100));
    assert_eq!(crop.get_pixel(5, 50), &Rgb([255, 255, 255]));
    assert_eq!(crop.get_pixel(95, 50), &Rgb([10, 10, 10]));
}

// --- The print sheet ---

#[test]
fn eight_passport_photos_fit_on_a_turned_sheet() {
    let layout = sheet_layout(IdFormat::PASSPORT.pixels());
    assert_eq!((layout.width, layout.height), (1772, 1181));
    assert_eq!((layout.columns, layout.rows, layout.copies()), (4, 2, 8));
    assert_eq!(sheet_note(layout.copies()), "8 fotos en una hoja de 10 × 15");
}

#[test]
fn copies_stay_inside_the_sheet_and_never_overlap() {
    for format in [IdFormat::PASSPORT, IdFormat::SQUARE, IdFormat { kind: IdKind::Custom, width_cm: 2.5, height_cm: 3.0 }] {
        let (width, height) = format.pixels();
        let layout          = sheet_layout((width, height));
        assert!(layout.copies() >= 1);

        for (index, &(x, y)) in layout.positions.iter().enumerate() {
            assert!(x + width <= layout.width && y + height <= layout.height);
            for &(other_x, other_y) in &layout.positions[index + 1..] {
                assert!(x + width <= other_x || other_x + width <= x || y + height <= other_y || other_y + height <= y);
            }
        }
    }

    assert_eq!(sheet_layout(IdFormat::SQUARE.pixels()).copies(), 2);
    assert_eq!(sheet_layout((cm_to_px(2.5), cm_to_px(3.0))).copies(), 15);
}

#[test]
fn the_sheet_has_a_thin_cut_line_around_each_copy() {
    let photo  = RgbImage::from_pixel(10, 12, Rgb([0, 0, 0]));
    let layout = super::layout::SheetLayout { width: 40, height: 30, columns: 2, rows: 1, positions: vec![(5, 5), (15, 5)] };
    let sheet  = render_sheet(&photo, &layout);

    assert_eq!(sheet.get_pixel(5, 10), &CUT_LINE);
    assert_eq!(sheet.get_pixel(10, 10), &Rgb([0, 0, 0]));
    assert_eq!(sheet.get_pixel(1, 1), &Rgb([255, 255, 255]));
}

#[test]
fn says_what_it_made_in_the_history() {
    assert_eq!(history_detail(IdFormat::PASSPORT, Some(8)), "Foto carnet 3,5 × 4,5 cm · hoja con 8");
    assert_eq!(history_detail(IdFormat::SQUARE, None), "Foto carnet 5 × 5 cm");
}

// --- With the real detector (GLUP_FACE_IMAGE=<foto con una cara> cargo test real_face -- --ignored) ---

#[test]
#[ignore]
fn real_face_detector_finds_one_face() {
    let path  = std::env::var("GLUP_FACE_IMAGE").expect("GLUP_FACE_IMAGE");
    let image = image::open(&path).unwrap().to_rgb8();
    let faces = detect(&image).unwrap();

    println!("{} caras: {faces:?}", faces.len());
    assert_eq!(faces.len(), 1);

    let face = faces[0];
    assert!(face.width > 50.0 && face.x > 0.0 && face.x + face.width < image.width() as f64);
    // The face is in the upper half of a portrait.
    assert!(face.y + face.height / 2.0 < image.height() as f64 * 0.6);
}

// The whole way with the real model and detector, writing the photo and the sheet to look at them:
// GLUP_FACE_IMAGE=<foto> GLUP_BACKGROUND_MODEL=<onnx> GLUP_SAMPLE_DIR=<carpeta> cargo test real_id_photo -- --ignored --nocapture
#[test]
#[ignore]
fn real_id_photo_from_a_portrait() {
    use crate::services::background::{
        mask::{mask_from_logits, preprocess, resize_mask, MODEL_SIDE},
        session::{infer, open, Device},
    };

    let image  = image::open(std::env::var("GLUP_FACE_IMAGE").unwrap()).unwrap();
    let model  = std::path::PathBuf::from(std::env::var("GLUP_BACKGROUND_MODEL").unwrap());
    let folder = std::path::PathBuf::from(std::env::var("GLUP_SAMPLE_DIR").unwrap());
    let start  = std::time::Instant::now();

    let rgb         = image.to_rgb8();
    let mut session = open(&model, Device::Gpu).or_else(|_| open(&model, Device::Cpu)).unwrap();
    let logits      = infer(&mut session, &preprocess(&rgb), [1, 3, MODEL_SIDE as usize, MODEL_SIDE as usize]).unwrap();
    let mask        = resize_mask(&mask_from_logits(&logits, MODEL_SIDE).unwrap(), rgb.width(), rgb.height());

    let (head, warning) = super::find_head(&rgb, &mask).unwrap();
    let white           = on_white(&image.to_rgba8(), &mask);
    let crop            = crop_for(head, IdFormat::PASSPORT);
    let photo           = render_crop(&white, crop, IdFormat::PASSPORT.pixels());
    let layout          = sheet_layout(photo.dimensions());

    std::fs::write(folder.join("prueba-carnet.jpg"), super::encode_300dpi(&photo).unwrap()).unwrap();
    std::fs::write(folder.join("prueba-carnet-hoja.jpg"), super::encode_300dpi(&render_sheet(&photo, &layout)).unwrap()).unwrap();
    println!("{:.1} s · cabeza {head:?} · aviso {warning:?} · {} copias", start.elapsed().as_secs_f64(), layout.copies());

    // The background around the head is pure white.
    assert_eq!(photo.get_pixel(3, 3), &Rgb([255, 255, 255]));
    assert!(head.chin > head.top);
}

