// Finds the sheet in a photo: on a small grey copy, the light region that stands out from the
// background (Otsu's threshold), its outline (the convex hull of its rows) and the largest convex
// quadrilateral on that outline. All of it own code: no OpenCV.
use std::collections::VecDeque;

use image::{imageops::FilterType, DynamicImage, GrayImage, RgbImage};

use super::geometry::{area, corner_angles, full_frame, is_convex, order_corners, Point, Quad};

// The side the detection works on: fast, and still a few pixels per millimetre of a sheet.
const DETECT_SIDE: u32         = 400;
const BLUR_RADIUS: i32         = 2;
const CLOSE_RADIUS: i32        = 2;
// A sheet takes at least this share of the photo, fills most of its quadrilateral and has no very
// sharp or very open corner.
const MIN_AREA: f64            = 0.12;
const MIN_FILL: f64            = 0.85;
const MIN_ANGLE: f64           = 35.0;
const MAX_ANGLE: f64           = 145.0;
// The outline is simplified to at most this many points before trying every quadrilateral.
const MAX_OUTLINE: usize       = 24;
// The edge of a sheet is sharp: a few pixels in and out of each side it is clearly lighter inside (a
// smooth shade of light is not a sheet). Sides on the photo's own edge cannot be measured.
const EDGE_STEP: f64           = 4.0;
const EDGE_CONTRAST: f64       = 20.0;
const EDGE_SAMPLES: usize      = 24;

// The corners as shares (0 to 1) of the photo, and whether they are a sheet or the whole photo.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Detection {
    pub corners : Quad,
    pub found   : bool,
}

pub fn detect(image: &RgbImage) -> Detection {
    let small = small_gray(image);
    find_sheet(&small).map_or(Detection { corners: full_frame(), found: false }, |corners| Detection { corners, found: true })
}

fn small_gray(image: &RgbImage) -> GrayImage {
    let (width, height) = image.dimensions();
    let scale           = DETECT_SIDE as f64 / width.max(height).max(1) as f64;
    let size            = |side: u32| ((side as f64 * scale.min(1.0)).round() as u32).max(1);
    DynamicImage::ImageRgb8(image.clone()).resize_exact(size(width), size(height), FilterType::Triangle).to_luma8()
}

// The sheet's corners as shares of the image, or None if no sheet stands out clearly.
pub fn find_sheet(gray: &GrayImage) -> Option<Quad> {
    let (width, height) = gray.dimensions();
    if width < 16 || height < 16 {
        return None;
    }

    let blurred   = box_blur(gray, BLUR_RADIUS);
    let threshold = otsu(&blurred);
    let mut mask: Vec<bool> = blurred.pixels().map(|pixel| pixel.0[0] > threshold).collect();
    mask = erode(&dilate(&mask, width, height, CLOSE_RADIUS), width, height, CLOSE_RADIUS);

    let (region, count) = largest_region(&mask, width, height)?;
    let outline         = convex_hull(&row_ends(&region, width, height));
    let simplified      = simplify(&outline, MAX_OUTLINE);
    let quad            = largest_quad(&simplified)?;
    let total           = (width * height) as f64;

    let covers  = area(&quad) / total;
    let fill    = count as f64 / area(&quad).max(1.0);
    let angles  = corner_angles(&quad);
    let shaped  = is_convex(&quad) && angles.iter().all(|angle| (MIN_ANGLE..=MAX_ANGLE).contains(angle));
    // The whole photo is light (a sheet on a white table, or a close-up of the sheet): nothing to cut.
    let edgeless = covers > 0.97;

    if covers < MIN_AREA || fill < MIN_FILL || !shaped || edgeless || !sharp_edges(&blurred, &quad) {
        return None;
    }

    // Pixel centres to shares of the image.
    Some(order_corners(quad.map(|point| Point::new((point.x + 0.5) / width as f64, (point.y + 0.5) / height as f64))))
}

// Each side of the quadrilateral that lies inside the photo separates light from dark clearly, and at
// least two of them can be measured.
fn sharp_edges(gray: &GrayImage, quad: &Quad) -> bool {
    let (width, height) = (gray.width() as f64, gray.height() as f64);
    let center          = Point::new(quad.iter().map(|point| point.x).sum::<f64>() / 4.0, quad.iter().map(|point| point.y).sum::<f64>() / 4.0);
    let level           = |point: Point| -> Option<f64> {
        (point.x >= 0.0 && point.y >= 0.0 && point.x < width && point.y < height).then(|| gray.get_pixel(point.x as u32, point.y as u32).0[0] as f64)
    };

    let mut measured = 0;
    for index in 0..4 {
        let (a, b)   = (quad[index], quad[(index + 1) % 4]);
        let length   = (b.x - a.x).hypot(b.y - a.y).max(f64::EPSILON);
        let mut normal = Point::new(-(b.y - a.y) / length, (b.x - a.x) / length);
        let middle   = Point::new((a.x + b.x) / 2.0, (a.y + b.y) / 2.0);
        // The normal points out of the sheet.
        if (middle.x - center.x) * normal.x + (middle.y - center.y) * normal.y < 0.0 {
            normal = Point::new(-normal.x, -normal.y);
        }

        let mut contrast = Vec::new();
        for sample in 1..EDGE_SAMPLES {
            let share = sample as f64 / EDGE_SAMPLES as f64;
            let on    = Point::new(a.x + (b.x - a.x) * share, a.y + (b.y - a.y) * share);
            let into  = level(Point::new(on.x - normal.x * EDGE_STEP, on.y - normal.y * EDGE_STEP));
            let out   = level(Point::new(on.x + normal.x * EDGE_STEP, on.y + normal.y * EDGE_STEP));
            if let (Some(into), Some(out)) = (into, out) {
                contrast.push(into - out);
            }
        }

        // A side on the photo's border (nothing outside it to compare).
        if contrast.len() < EDGE_SAMPLES / 2 {
            continue;
        }
        measured += 1;
        contrast.sort_by(f64::total_cmp);
        if contrast[contrast.len() / 2] < EDGE_CONTRAST {
            return false;
        }
    }
    measured >= 2
}

// Mean over a square, with an integral image (the same cost at any radius).
pub fn box_blur(gray: &GrayImage, radius: i32) -> GrayImage {
    let (width, height) = gray.dimensions();
    let stride          = width as usize + 1;
    let mut sums        = vec![0u64; stride * (height as usize + 1)];

    for y in 0..height as usize {
        let mut row = 0u64;
        for x in 0..width as usize {
            row                             += u64::from(gray.get_pixel(x as u32, y as u32).0[0]);
            sums[(y + 1) * stride + x + 1]   = sums[y * stride + x + 1] + row;
        }
    }

    GrayImage::from_fn(width, height, |x, y| {
        let left   = (x as i32 - radius).max(0) as usize;
        let top    = (y as i32 - radius).max(0) as usize;
        let right  = (x as i32 + radius + 1).min(width as i32) as usize;
        let bottom = (y as i32 + radius + 1).min(height as i32) as usize;
        let total  = sums[bottom * stride + right] + sums[top * stride + left] - sums[top * stride + right] - sums[bottom * stride + left];
        let count  = ((right - left) * (bottom - top)) as u64;
        image::Luma([(total / count.max(1)) as u8])
    })
}

// The grey level that best splits the picture into two groups (Otsu, 1979).
pub fn otsu(gray: &GrayImage) -> u8 {
    let mut histogram = [0u64; 256];
    for pixel in gray.pixels() {
        histogram[pixel.0[0] as usize] += 1;
    }

    let total: u64  = histogram.iter().sum();
    let sum: f64    = histogram.iter().enumerate().map(|(level, count)| level as f64 * *count as f64).sum();
    let mut below   = 0u64;
    let mut below_sum = 0.0;
    let mut best    = (0.0, 0u8);

    for (level, count) in histogram.iter().enumerate() {
        below += count;
        if below == 0 || below == total {
            continue;
        }
        below_sum      += level as f64 * *count as f64;
        let above       = total - below;
        let mean_below  = below_sum / below as f64;
        let mean_above  = (sum - below_sum) / above as f64;
        let between     = below as f64 * above as f64 * (mean_below - mean_above).powi(2);
        if between > best.0 {
            best = (between, level as u8);
        }
    }
    best.1
}

fn morph(mask: &[bool], width: u32, height: u32, radius: i32, grow: bool) -> Vec<bool> {
    let (width, height) = (width as i32, height as i32);
    let at              = |x: i32, y: i32| mask[(y * width + x) as usize];
    let pass            = |source: &dyn Fn(i32, i32) -> bool, horizontal: bool| -> Vec<bool> {
        let mut out = vec![false; (width * height) as usize];
        for y in 0..height {
            for x in 0..width {
                let mut any = !grow;
                for step in -radius..=radius {
                    let (sx, sy) = if horizontal { (x + step, y) } else { (x, y + step) };
                    let inside   = sx >= 0 && sy >= 0 && sx < width && sy < height;
                    // Outside the picture counts as background, so a sheet cut by the edge keeps its edge.
                    let value    = inside && source(sx, sy);
                    if grow && value { any = true; break; }
                    if !grow && !value { any = false; break; }
                }
                out[(y * width + x) as usize] = any;
            }
        }
        out
    };

    let first = pass(&at, true);
    pass(&|x, y| first[(y * width + x) as usize], false)
}

fn dilate(mask: &[bool], width: u32, height: u32, radius: i32) -> Vec<bool> {
    morph(mask, width, height, radius, true)
}

fn erode(mask: &[bool], width: u32, height: u32, radius: i32) -> Vec<bool> {
    morph(mask, width, height, radius, false)
}

// The largest group of light pixels that touch each other (4 neighbours), and its size.
fn largest_region(mask: &[bool], width: u32, height: u32) -> Option<(Vec<bool>, usize)> {
    let (width, height) = (width as usize, height as usize);
    let mut label       = vec![0u32; width * height];
    let mut best        = (0u32, 0usize);
    let mut next        = 0u32;
    let mut queue       = VecDeque::new();

    for start in 0..width * height {
        if !mask[start] || label[start] != 0 {
            continue;
        }
        next         += 1;
        label[start]  = next;
        queue.push_back(start);
        let mut count = 0;

        while let Some(index) = queue.pop_front() {
            count += 1;
            let (x, y) = (index % width, index / width);
            let mut visit = |neighbour: usize| {
                if mask[neighbour] && label[neighbour] == 0 {
                    label[neighbour] = next;
                    queue.push_back(neighbour);
                }
            };
            if x > 0 { visit(index - 1); }
            if x + 1 < width { visit(index + 1); }
            if y > 0 { visit(index - width); }
            if y + 1 < height { visit(index + width); }
        }

        if count > best.1 {
            best = (next, count);
        }
    }

    (best.1 > 0).then(|| (label.iter().map(|value| *value == best.0).collect(), best.1))
}

// The first and last pixel of the region on each row: every corner of its outline is among them.
fn row_ends(region: &[bool], width: u32, height: u32) -> Vec<Point> {
    let width = width as usize;
    let mut ends = Vec::new();
    for y in 0..height as usize {
        let row   = &region[y * width..(y + 1) * width];
        let first = row.iter().position(|inside| *inside);
        let last  = row.iter().rposition(|inside| *inside);
        if let (Some(first), Some(last)) = (first, last) {
            ends.push(Point::new(first as f64, y as f64));
            ends.push(Point::new(last as f64, y as f64));
        }
    }
    ends
}

fn turn(origin: Point, a: Point, b: Point) -> f64 {
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

// Andrew's monotone chain.
pub fn convex_hull(points: &[Point]) -> Vec<Point> {
    let mut sorted = points.to_vec();
    sorted.sort_by(|a, b| a.x.total_cmp(&b.x).then(a.y.total_cmp(&b.y)));
    sorted.dedup();
    if sorted.len() < 3 {
        return sorted;
    }

    let mut hull: Vec<Point> = Vec::with_capacity(sorted.len() * 2);
    for pass in 0..2 {
        let start = hull.len();
        let items: Box<dyn Iterator<Item = &Point>> = if pass == 0 { Box::new(sorted.iter()) } else { Box::new(sorted.iter().rev()) };
        for point in items {
            while hull.len() >= start + 2 && turn(hull[hull.len() - 2], hull[hull.len() - 1], *point) <= 0.0 {
                hull.pop();
            }
            hull.push(*point);
        }
        hull.pop();
    }
    hull
}

fn distance_to_line(point: Point, a: Point, b: Point) -> f64 {
    let length = (b.x - a.x).hypot(b.y - a.y);
    if length < f64::EPSILON {
        return (point.x - a.x).hypot(point.y - a.y);
    }
    turn(a, b, point).abs() / length
}

// Douglas–Peucker on the closed outline, with a growing tolerance until it has few enough points.
fn simplify(outline: &[Point], limit: usize) -> Vec<Point> {
    if outline.len() <= limit {
        return outline.to_vec();
    }

    let perimeter: f64 = (0..outline.len()).map(|index| {
        let (a, b) = (outline[index], outline[(index + 1) % outline.len()]);
        (a.x - b.x).hypot(a.y - b.y)
    }).sum();

    let mut tolerance = perimeter * 0.002;
    loop {
        let kept = douglas_peucker_closed(outline, tolerance);
        if kept.len() <= limit || tolerance > perimeter {
            return kept;
        }
        tolerance *= 1.5;
    }
}

fn douglas_peucker_closed(outline: &[Point], tolerance: f64) -> Vec<Point> {
    // Split at the two points farthest apart, so each half is an open line.
    let mut far = (0, 0, 0.0);
    for a in 0..outline.len() {
        for b in a + 1..outline.len() {
            let distance = (outline[a].x - outline[b].x).hypot(outline[a].y - outline[b].y);
            if distance > far.2 {
                far = (a, b, distance);
            }
        }
    }

    let (a, b)      = (far.0, far.1);
    let first: Vec<Point>  = outline[a..=b].to_vec();
    let second: Vec<Point> = outline[b..].iter().chain(outline[..=a].iter()).copied().collect();

    let mut kept = douglas_peucker(&first, tolerance);
    kept.pop();
    let mut rest = douglas_peucker(&second, tolerance);
    rest.pop();
    kept.extend(rest);
    kept
}

fn douglas_peucker(line: &[Point], tolerance: f64) -> Vec<Point> {
    if line.len() < 3 {
        return line.to_vec();
    }

    let (first, last) = (line[0], line[line.len() - 1]);
    let (index, distance) = line[1..line.len() - 1]
        .iter()
        .enumerate()
        .map(|(index, point)| (index + 1, distance_to_line(*point, first, last)))
        .fold((0, 0.0), |best, item| if item.1 > best.1 { item } else { best });

    if distance <= tolerance {
        return vec![first, last];
    }

    let mut left = douglas_peucker(&line[..=index], tolerance);
    left.pop();
    left.extend(douglas_peucker(&line[index..], tolerance));
    left
}

// The quadrilateral of largest area with its corners on the outline (tries every four of them).
fn largest_quad(points: &[Point]) -> Option<Quad> {
    let count = points.len();
    if count < 4 {
        return None;
    }

    let mut best: Option<(f64, Quad)> = None;
    for a in 0..count {
        for b in a + 1..count {
            for c in b + 1..count {
                for d in c + 1..count {
                    let quad  = [points[a], points[b], points[c], points[d]];
                    let value = area(&quad);
                    if best.is_none_or(|(current, _)| value > current) {
                        best = Some((value, quad));
                    }
                }
            }
        }
    }
    best.map(|(_, quad)| quad)
}
