// Cleans the straight page like a scanner: the light of the paper is measured block by block (that is
// the shadow and the yellow of old paper) and divided out, so the paper turns white; then each mode
// does its part. Color raises the contrast, Gris keeps the light only, Blanco y negro decides each pixel
// against its neighbourhood (adaptive threshold, best for text).
use image::{GrayImage, Luma, RgbImage};
use serde::Deserialize;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScanMode {
    #[default]
    Color,
    Gray,
    Bw,
}

pub enum PageImage {
    Color(RgbImage),
    Gray(GrayImage),
    // 0 (ink) or 255 (paper) only.
    Bw(GrayImage),
}

impl PageImage {
    pub fn dimensions(&self) -> (u32, u32) {
        match self {
            Self::Color(image) => image.dimensions(),
            Self::Gray(image) | Self::Bw(image) => image.dimensions(),
        }
    }

    // As colour, for previews and for the text reader.
    pub fn to_rgb(&self) -> RgbImage {
        match self {
            Self::Color(image) => image.clone(),
            Self::Gray(image) | Self::Bw(image) => RgbImage::from_fn(image.width(), image.height(), |x, y| {
                let value = image.get_pixel(x, y).0[0];
                image::Rgb([value, value, value])
            }),
        }
    }
}

// The paper is measured in blocks of about this share of the page's long side.
const BLOCK_SHARE: f64     = 1.0 / 40.0;
const MIN_BLOCK: u32       = 8;
// The light of a block is a bright percentile of it, so text and lines do not darken it.
const PAPER_PERCENTILE: f64 = 0.9;
// A very dark measure would blow noise up: the paper is never taken as darker than this.
const MIN_PAPER: f64       = 40.0;
// Contrast after the paper is white: up to here is ink, from here on paper.
const INK_LEVEL: f64       = 30.0;
const PAPER_LEVEL: f64     = 225.0;
// Blanco y negro: darker than its neighbourhood by this share is ink; this dark is ink always.
const BW_WINDOW_SHARE: f64 = 1.0 / 30.0;
const BW_OFFSET: f64       = 0.16;
const BW_ALWAYS_INK: u8    = 90;
const BW_NEVER_INK: u8     = 215;

pub fn enhance(page: &RgbImage, mode: ScanMode) -> PageImage {
    let flat = flatten(page);
    match mode {
        ScanMode::Color => PageImage::Color(contrast_rgb(&flat)),
        ScanMode::Gray  => PageImage::Gray(contrast_gray(&luminance(&flat))),
        ScanMode::Bw    => PageImage::Bw(threshold(&luminance(&flat))),
    }
}

fn block_size(width: u32, height: u32) -> u32 {
    ((width.max(height) as f64 * BLOCK_SHARE).round() as u32).max(MIN_BLOCK)
}

// The paper's own colour, one value per block and channel.
struct PaperLight {
    columns : u32,
    rows    : u32,
    block   : u32,
    values  : Vec<[f64; 3]>,
}

fn measure_paper(page: &RgbImage) -> PaperLight {
    let (width, height) = page.dimensions();
    let block           = block_size(width, height);
    let columns         = width.div_ceil(block);
    let rows            = height.div_ceil(block);
    let mut values      = Vec::with_capacity((columns * rows) as usize);

    for row in 0..rows {
        for column in 0..columns {
            let mut histograms = [[0u32; 256]; 3];
            let mut count      = 0u32;
            for y in row * block..((row + 1) * block).min(height) {
                for x in column * block..((column + 1) * block).min(width) {
                    let pixel = page.get_pixel(x, y).0;
                    for channel in 0..3 {
                        histograms[channel][pixel[channel] as usize] += 1;
                    }
                    count += 1;
                }
            }
            let target = (count as f64 * PAPER_PERCENTILE) as u32;
            values.push(histograms.map(|histogram| {
                let mut seen = 0;
                histogram.iter().position(|amount| { seen += amount; seen > target }).unwrap_or(255) as f64
            }));
        }
    }

    let mut light = PaperLight { columns, rows, block, values };
    // A block full of print or a photo measures dark: the brightest of its neighbours stands in, then
    // the grid is softened so the light changes smoothly.
    light.values = neighbourhood(&light, |items| items.iter().fold([0.0_f64; 3], |best, item| [best[0].max(item[0]), best[1].max(item[1]), best[2].max(item[2])]));
    light.values = neighbourhood(&light, |items| {
        let count = items.len() as f64;
        let sum   = items.iter().fold([0.0_f64; 3], |total, item| [total[0] + item[0], total[1] + item[1], total[2] + item[2]]);
        sum.map(|value| value / count)
    });
    light
}

fn neighbourhood(light: &PaperLight, reduce: impl Fn(&[[f64; 3]]) -> [f64; 3]) -> Vec<[f64; 3]> {
    let (columns, rows) = (light.columns as i64, light.rows as i64);
    let mut out         = Vec::with_capacity(light.values.len());
    for row in 0..rows {
        for column in 0..columns {
            let mut items = Vec::with_capacity(9);
            for dy in -1..=1 {
                for dx in -1..=1 {
                    let (x, y) = (column + dx, row + dy);
                    if x >= 0 && y >= 0 && x < columns && y < rows {
                        items.push(light.values[(y * columns + x) as usize]);
                    }
                }
            }
            out.push(reduce(&items));
        }
    }
    out
}

impl PaperLight {
    // Between the centres of the four nearest blocks.
    fn at(&self, x: u32, y: u32) -> [f64; 3] {
        let half   = self.block as f64 / 2.0;
        let gx     = ((x as f64 - half) / self.block as f64).clamp(0.0, (self.columns - 1) as f64);
        let gy     = ((y as f64 - half) / self.block as f64).clamp(0.0, (self.rows - 1) as f64);
        let (x0, y0) = (gx.floor() as u32, gy.floor() as u32);
        let (x1, y1) = ((x0 + 1).min(self.columns - 1), (y0 + 1).min(self.rows - 1));
        let (fx, fy) = (gx - x0 as f64, gy - y0 as f64);
        let value    = |column: u32, row: u32| self.values[(row * self.columns + column) as usize];
        let (a, b, c, d) = (value(x0, y0), value(x1, y0), value(x0, y1), value(x1, y1));
        [0, 1, 2].map(|channel| (a[channel] * (1.0 - fx) + b[channel] * fx) * (1.0 - fy) + (c[channel] * (1.0 - fx) + d[channel] * fx) * fy)
    }
}

// Shadows and the colour of the paper divided out: the paper comes out white.
pub fn flatten(page: &RgbImage) -> RgbImage {
    let light = measure_paper(page);
    RgbImage::from_fn(page.width(), page.height(), |x, y| {
        let paper = light.at(x, y);
        let pixel = page.get_pixel(x, y).0;
        image::Rgb([0, 1, 2].map(|channel| (pixel[channel] as f64 * 255.0 / paper[channel].max(MIN_PAPER)).round().clamp(0.0, 255.0) as u8))
    })
}

fn levels(value: f64) -> u8 {
    ((value - INK_LEVEL) * 255.0 / (PAPER_LEVEL - INK_LEVEL)).round().clamp(0.0, 255.0) as u8
}

fn contrast_rgb(page: &RgbImage) -> RgbImage {
    RgbImage::from_fn(page.width(), page.height(), |x, y| image::Rgb(page.get_pixel(x, y).0.map(|channel| levels(channel as f64))))
}

fn luminance(page: &RgbImage) -> GrayImage {
    GrayImage::from_fn(page.width(), page.height(), |x, y| {
        let [red, green, blue] = page.get_pixel(x, y).0;
        Luma([(0.299 * red as f64 + 0.587 * green as f64 + 0.114 * blue as f64).round() as u8])
    })
}

fn contrast_gray(page: &GrayImage) -> GrayImage {
    GrayImage::from_fn(page.width(), page.height(), |x, y| Luma([levels(page.get_pixel(x, y).0[0] as f64)]))
}

// Bradley's adaptive threshold over an integral image: ink is what is clearly darker than around it.
pub fn threshold(page: &GrayImage) -> GrayImage {
    let (width, height) = page.dimensions();
    let radius          = ((width.max(height) as f64 * BW_WINDOW_SHARE / 2.0).round() as i64).max(4);
    let stride          = width as usize + 1;
    let mut sums        = vec![0u64; stride * (height as usize + 1)];

    for y in 0..height as usize {
        let mut row = 0u64;
        for x in 0..width as usize {
            row                           += u64::from(page.get_pixel(x as u32, y as u32).0[0]);
            sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
        }
    }

    GrayImage::from_fn(width, height, |x, y| {
        let value = page.get_pixel(x, y).0[0];
        if value <= BW_ALWAYS_INK {
            return Luma([0]);
        }
        if value >= BW_NEVER_INK {
            return Luma([255]);
        }
        let left   = (x as i64 - radius).max(0) as usize;
        let top    = (y as i64 - radius).max(0) as usize;
        let right  = (x as i64 + radius + 1).min(width as i64) as usize;
        let bottom = (y as i64 + radius + 1).min(height as i64) as usize;
        let total  = sums[bottom * stride + right] + sums[top * stride + left] - sums[top * stride + right] - sums[bottom * stride + left];
        let mean   = total as f64 / ((right - left) * (bottom - top)) as f64;
        Luma([if (value as f64) < mean * (1.0 - BW_OFFSET) { 0 } else { 255 }])
    })
}
