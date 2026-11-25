use image::{Rgb, RgbImage};
use serde::Deserialize;

use super::{centered_frame, compose, contain_rect, frame_pixels, parse_color, ComposeParams, FitMode, Frame, SocialOptions};

// The sizes the screen offers (modules/social/constants/sizes.json), read as the screen reads them.
const SIZES: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../src/modules/social/constants/sizes.json"));

#[derive(Deserialize)]
struct Network {
    sizes: Vec<Size>,
}

#[derive(Deserialize)]
struct Size {
    tag    : String,
    width  : u32,
    height : u32,
}

fn sizes() -> Vec<Size> {
    serde_json::from_str::<Vec<Network>>(SIZES).unwrap().into_iter().flat_map(|network| network.sizes).collect()
}

fn photo(width: u32, height: u32) -> RgbImage {
    RgbImage::from_fn(width, height, |x, y| Rgb([(x % 256) as u8, (y % 256) as u8, 128]))
}

fn options(width: u32, height: u32, fit: FitMode) -> SocialOptions {
    SocialOptions { width, height, tag: "Prueba".to_string(), fit, fill: Some("#202020".to_string()), ..SocialOptions::default() }
}

#[test]
fn every_size_is_cut_and_fitted_exactly() {
    let landscape = photo(1600, 900);
    let portrait  = photo(600, 1000);
    let all       = sizes();
    assert!(all.len() >= 15, "{}", all.len());
    for size in all {
        assert!(!size.tag.is_empty());
        for image in [&landscape, &portrait] {
            // The frame keeps the shape of the size.
            let frame = centered_frame(image.width(), image.height(), size.width, size.height);
            let (_, _, w, h) = frame_pixels(frame, image.width(), image.height());
            let shape = f64::from(w) / f64::from(h);
            assert!((shape - f64::from(size.width) / f64::from(size.height)).abs() < 0.02, "{} {shape}", size.tag);

            for fit in [FitMode::Crop, FitMode::Contain] {
                let made = compose(ComposeParams { image, options: &options(size.width, size.height, fit), frame: None }).unwrap();
                assert_eq!((made.width(), made.height()), (size.width, size.height), "{} {fit:?}", size.tag);
            }
        }
    }
}

#[test]
fn the_frame_chosen_is_what_comes_out() {
    // The right half of a photo whose right half is white: all white.
    let image = RgbImage::from_fn(200, 100, |x, _| if x >= 100 { Rgb([255, 255, 255]) } else { Rgb([0, 0, 0]) });
    let frame = Frame { x: 0.5, y: 0.0, width: 0.5, height: 1.0 };
    let made  = compose(ComposeParams { image: &image, options: &options(100, 100, FitMode::Crop), frame: Some(frame) }).unwrap();
    assert!(made.pixels().all(|pixel| pixel.0[0] > 240));
    // Out of the photo it is pulled back in.
    assert_eq!(frame_pixels(Frame { x: 1.2, y: -0.3, width: 0.5, height: 2.0 }, 200, 100), (199, 0, 1, 100));
}

#[test]
fn the_whole_photo_fits_with_a_colour_or_itself_blurred() {
    // A 4:3 photo in a story (9:16): across the whole width, in the middle.
    assert_eq!(contain_rect(4000, 3000, 1080, 1920), (0, 555, 1080, 810));
    assert_eq!(contain_rect(1000, 1000, 1200, 630), (285, 0, 630, 630));

    let image   = photo(400, 300);
    let colored = compose(ComposeParams { image: &image, options: &options(1080, 1920, FitMode::Contain), frame: None }).unwrap();
    assert_eq!(*colored.get_pixel(5, 5), Rgb([32, 32, 32]));
    assert_eq!(*colored.get_pixel(5, 1910), Rgb([32, 32, 32]));

    let blurred = compose(ComposeParams { image: &image, options: &SocialOptions { blur: true, ..options(1080, 1920, FitMode::Contain) }, frame: None }).unwrap();
    assert_ne!(*blurred.get_pixel(540, 100), Rgb([32, 32, 32]));
    assert_ne!(*blurred.get_pixel(540, 100), Rgb([255, 255, 255]));

    assert_eq!(parse_color("#F6C36B"), Rgb([246, 195, 107]));
    assert_eq!(parse_color("nada"), Rgb([255, 255, 255]));
    assert!(compose(ComposeParams { image: &image, options: &options(0, 100, FitMode::Crop), frame: None }).is_err());
}
