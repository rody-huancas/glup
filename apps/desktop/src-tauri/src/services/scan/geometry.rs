// The geometry of a photographed sheet: its four corners in order, how to map the straight page onto
// them (a homography) and the proportion of the page (A4, Carta or its own).
use serde::{Deserialize, Serialize};

// A4 and Carta, long side over short side.
pub const A4_RATIO: f64     = 297.0 / 210.0;
pub const LETTER_RATIO: f64 = 11.0 / 8.5;
// How far a measured proportion may be from A4 or Carta to count as one (perspective is never exact).
const PAPER_TOLERANCE: f64  = 0.06;

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    pub const fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    fn distance(self, other: Point) -> f64 {
        (self.x - other.x).hypot(self.y - other.y)
    }
}

// Top left, top right, bottom right, bottom left (image coordinates, y down).
pub type Quad = [Point; 4];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PaperMatch {
    A4,
    Letter,
    // Neither: the page keeps the proportion of its corners.
    Own,
}

// Any four points as a quadrilateral that goes round clockwise on screen, starting at the top left (the
// corner with the smallest x + y). Clicks and the detector can give them in any order.
pub fn order_corners(points: [Point; 4]) -> Quad {
    let center_x = points.iter().map(|point| point.x).sum::<f64>() / 4.0;
    let center_y = points.iter().map(|point| point.y).sum::<f64>() / 4.0;

    let mut sorted = points;
    sorted.sort_by(|a, b| (a.y - center_y).atan2(a.x - center_x).total_cmp(&(b.y - center_y).atan2(b.x - center_x)));

    let first = (0..4).min_by(|&a, &b| (sorted[a].x + sorted[a].y).total_cmp(&(sorted[b].x + sorted[b].y))).unwrap_or(0);
    [sorted[first], sorted[(first + 1) % 4], sorted[(first + 2) % 4], sorted[(first + 3) % 4]]
}

fn cross(origin: Point, a: Point, b: Point) -> f64 {
    (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

// Every corner turns the same way: the four corners make a real sheet, not a bow tie.
pub fn is_convex(quad: &Quad) -> bool {
    let turns: Vec<f64> = (0..4).map(|index| cross(quad[index], quad[(index + 1) % 4], quad[(index + 2) % 4])).collect();
    turns.iter().all(|turn| *turn > 0.0) || turns.iter().all(|turn| *turn < 0.0)
}

pub fn area(quad: &Quad) -> f64 {
    let twice: f64 = (0..4).map(|index| quad[index].x * quad[(index + 1) % 4].y - quad[(index + 1) % 4].x * quad[index].y).sum();
    twice.abs() / 2.0
}

// The inner angle at each corner, in degrees.
pub fn corner_angles(quad: &Quad) -> [f64; 4] {
    let mut angles = [0.0; 4];
    for (index, angle) in angles.iter_mut().enumerate() {
        let corner = quad[index];
        let before = quad[(index + 3) % 4];
        let after  = quad[(index + 1) % 4];
        let (ax, ay) = (before.x - corner.x, before.y - corner.y);
        let (bx, by) = (after.x - corner.x, after.y - corner.y);
        let cosine   = (ax * bx + ay * by) / (ax.hypot(ay) * bx.hypot(by)).max(f64::EPSILON);
        *angle       = cosine.clamp(-1.0, 1.0).acos().to_degrees();
    }
    angles
}

// The same corners measured in another size (shares of 0 to 1 ↔ pixels).
pub fn scale_quad(quad: &Quad, width: f64, height: f64) -> Quad {
    quad.map(|point| Point::new(point.x * width, point.y * height))
}

// The whole photo, when no sheet stands out.
pub fn full_frame() -> Quad {
    [Point::new(0.0, 0.0), Point::new(1.0, 0.0), Point::new(1.0, 1.0), Point::new(0.0, 1.0)]
}

// The size of the straight page in pixels: the longer of each pair of opposite sides.
pub fn measured_size(quad: &Quad) -> (f64, f64) {
    let width  = quad[0].distance(quad[1]).max(quad[3].distance(quad[2]));
    let height = quad[0].distance(quad[3]).max(quad[1].distance(quad[2]));
    (width, height)
}

// Close to A4 or Carta (in either orientation), or its own proportion.
pub fn paper_match(width: f64, height: f64) -> PaperMatch {
    let ratio = width.max(height) / width.min(height).max(f64::EPSILON);
    let near  = |target: f64| (ratio - target).abs() / target <= PAPER_TOLERANCE;

    match (near(A4_RATIO), near(LETTER_RATIO)) {
        (true, true)   => if (ratio - A4_RATIO).abs() <= (ratio - LETTER_RATIO).abs() { PaperMatch::A4 } else { PaperMatch::Letter },
        (true, false)  => PaperMatch::A4,
        (false, true)  => PaperMatch::Letter,
        (false, false) => PaperMatch::Own,
    }
}

// The page in pixels at its real proportion: the measured long side, the short one from A4 or Carta when
// it is one of them; never longer than `max_long`.
pub fn page_pixels(quad: &Quad, max_long: f64) -> (u32, u32, PaperMatch) {
    let (width, height) = measured_size(quad);
    let paper           = paper_match(width, height);
    let long            = width.max(height).min(max_long).max(1.0);
    let short           = match paper {
        PaperMatch::A4     => long / A4_RATIO,
        PaperMatch::Letter => long / LETTER_RATIO,
        PaperMatch::Own    => long * width.min(height) / width.max(height).max(f64::EPSILON),
    };
    let (out_width, out_height) = if width >= height { (long, short) } else { (short, long) };
    (out_width.round().max(1.0) as u32, out_height.round().max(1.0) as u32, paper)
}

// Maps points of one plane onto another: x' = (h0 x + h1 y + h2) / (h6 x + h7 y + 1), and so on.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Homography([f64; 9]);

impl Homography {
    // The one that takes each corner of `from` to the same corner of `to`; None if three of them line up.
    pub fn between(from: &Quad, to: &Quad) -> Option<Self> {
        let mut rows = [[0.0_f64; 9]; 8];
        for index in 0..4 {
            let (x, y) = (from[index].x, from[index].y);
            let (u, v) = (to[index].x, to[index].y);
            rows[index * 2]     = [x, y, 1.0, 0.0, 0.0, 0.0, -u * x, -u * y, u];
            rows[index * 2 + 1] = [0.0, 0.0, 0.0, x, y, 1.0, -v * x, -v * y, v];
        }

        let solution = solve(rows)?;
        Some(Self([solution[0], solution[1], solution[2], solution[3], solution[4], solution[5], solution[6], solution[7], 1.0]))
    }

    pub fn apply(&self, point: Point) -> Point {
        let h     = &self.0;
        let scale = h[6] * point.x + h[7] * point.y + h[8];
        Point::new((h[0] * point.x + h[1] * point.y + h[2]) / scale, (h[3] * point.x + h[4] * point.y + h[5]) / scale)
    }
}

// Gaussian elimination with partial pivoting on the 8 equations of a homography.
fn solve(mut rows: [[f64; 9]; 8]) -> Option<[f64; 8]> {
    for column in 0..8 {
        let pivot = (column..8).max_by(|&a, &b| rows[a][column].abs().total_cmp(&rows[b][column].abs()))?;
        if rows[pivot][column].abs() < 1e-12 {
            return None;
        }
        rows.swap(column, pivot);

        for row in 0..8 {
            if row == column {
                continue;
            }
            let factor = rows[row][column] / rows[column][column];
            for index in column..9 {
                rows[row][index] -= factor * rows[column][index];
            }
        }
    }

    let mut solution = [0.0; 8];
    for (index, value) in solution.iter_mut().enumerate() {
        *value = rows[index][8] / rows[index][index];
    }
    Some(solution)
}
