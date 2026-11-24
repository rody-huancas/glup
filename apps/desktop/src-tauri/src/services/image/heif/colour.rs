// From the colour a photo was taken in to sRGB, the one every screen and app assumes. iPhones save in
// Display P3 (wider greens and reds); shown as if it were sRGB, it looks dull and a little off. Used on
// the pixels FFmpeg gives (16 bits per channel, in the photo's own colour); Windows does this itself.
//
// Each pixel goes to linear light with its curve, through one 3×3 matrix (its primaries → sRGB's) and
// back with the sRGB curve, rounded to 8 bits (from 16, so 10-bit photos keep every step they can).
use super::container::Colour;

type Matrix = [[f32; 3]; 3];

// x, y of red, green, blue and white.
type Chromaticities = [(f32, f32); 4];

const D65: (f32, f32)               = (0.3127, 0.3290);
const SRGB: Chromaticities          = [(0.64, 0.33), (0.30, 0.60), (0.15, 0.06), D65];
const DISPLAY_P3: Chromaticities    = [(0.680, 0.320), (0.265, 0.690), (0.150, 0.060), D65];
const BT2020: Chromaticities        = [(0.708, 0.292), (0.170, 0.797), (0.131, 0.046), D65];
// sRGB's colorants as ICC profiles carry them (adapted to the D50 of the profile connection space).
const SRGB_D50: Matrix              = [[0.436_074_7, 0.385_064_9, 0.143_080_4], [0.222_504_5, 0.716_878_6, 0.060_616_9], [0.013_932_2, 0.097_104_5, 0.714_173_3]];

// H.273 codes.
const PRIMARIES_BT2020: u16 = 9;
const PRIMARIES_P3: u16     = 12;
const TRANSFER_BT709: [u16; 4] = [1, 6, 14, 15];
const TRANSFER_LINEAR: u16  = 8;
const TRANSFER_GAMMA22: u16 = 4;
const TRANSFER_GAMMA28: u16 = 5;

// A channel's curve to linear light.
#[derive(Clone, Debug, PartialEq)]
pub enum Curve {
    Srgb,
    Bt709,
    Gamma(f32),
    // ICC parametric curve: g, a, b, c, d, e, f.
    Parametric([f32; 7]),
    // ICC table, evenly spaced from 0 to 1.
    Table(Vec<f32>),
}

#[derive(Clone, Debug, PartialEq)]
pub struct Conversion {
    pub curves : [Curve; 3],
    pub matrix : Matrix,
}

fn srgb_to_linear(value: f32) -> f32 {
    if value <= 0.040_45 { value / 12.92 } else { ((value + 0.055) / 1.055).powf(2.4) }
}

fn linear_to_srgb(value: f32) -> f32 {
    if value <= 0.003_130_8 { value * 12.92 } else { 1.055 * value.powf(1.0 / 2.4) - 0.055 }
}

impl Curve {
    fn linear(&self, value: f32) -> f32 {
        match self {
            Curve::Srgb       => srgb_to_linear(value),
            Curve::Bt709      => if value < 0.081 { value / 4.5 } else { ((value + 0.099) / 1.099).powf(1.0 / 0.45) },
            Curve::Gamma(g)   => value.powf(*g),
            Curve::Parametric([g, a, b, c, d, e, f]) => {
                if value >= *d { (a * value + b).max(0.0).powf(*g) + e } else { c * value + f }
            }
            Curve::Table(table) => {
                let last     = (table.len() - 1) as f32;
                let position = value.clamp(0.0, 1.0) * last;
                let below    = position.floor() as usize;
                let above    = (below + 1).min(table.len() - 1);
                let weight   = position - below as f32;
                table[below] * (1.0 - weight) + table[above] * weight
            }
        }
    }
}

fn multiply(a: &Matrix, b: &Matrix) -> Matrix {
    let mut out = [[0.0; 3]; 3];
    for row in 0..3 {
        for column in 0..3 {
            out[row][column] = (0..3).map(|k| a[row][k] * b[k][column]).sum();
        }
    }
    out
}

fn invert(m: &Matrix) -> Matrix {
    let det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    let cof = |r0: usize, r1: usize, c0: usize, c1: usize| m[r0][c0] * m[r1][c1] - m[r0][c1] * m[r1][c0];
    [
        [cof(1, 2, 1, 2) / det, -cof(0, 2, 1, 2) / det, cof(0, 1, 1, 2) / det],
        [-cof(1, 2, 0, 2) / det, cof(0, 2, 0, 2) / det, -cof(0, 1, 0, 2) / det],
        [cof(1, 2, 0, 1) / det, -cof(0, 2, 0, 1) / det, cof(0, 1, 0, 1) / det],
    ]
}

// RGB (linear) → XYZ for a set of primaries and white.
fn to_xyz(primaries: &Chromaticities) -> Matrix {
    let xyz       = |(x, y): (f32, f32)| [x / y, 1.0, (1.0 - x - y) / y];
    let [r, g, b] = [xyz(primaries[0]), xyz(primaries[1]), xyz(primaries[2])];
    let white     = xyz(primaries[3]);
    let columns   = [[r[0], g[0], b[0]], [r[1], g[1], b[1]], [r[2], g[2], b[2]]];
    let scale     = invert(&columns);
    let s: Vec<f32> = (0..3).map(|row| (0..3).map(|k| scale[row][k] * white[k]).sum()).collect();
    [[r[0] * s[0], g[0] * s[1], b[0] * s[2]], [r[1] * s[0], g[1] * s[1], b[1] * s[2]], [r[2] * s[0], g[2] * s[1], b[2] * s[2]]]
}

fn nclx_curve(transfer: u16) -> Curve {
    match transfer {
        code if TRANSFER_BT709.contains(&code) => Curve::Bt709,
        TRANSFER_LINEAR                        => Curve::Gamma(1.0),
        TRANSFER_GAMMA22                       => Curve::Gamma(2.2),
        TRANSFER_GAMMA28                       => Curve::Gamma(2.8),
        _                                      => Curve::Srgb,
    }
}

fn nclx(primaries: u16, transfer: u16) -> Option<Conversion> {
    let source = match primaries {
        PRIMARIES_P3     => DISPLAY_P3,
        PRIMARIES_BT2020 => BT2020,
        _                => return None,
    };
    let curve = nclx_curve(transfer);
    Some(Conversion { curves: [curve.clone(), curve.clone(), curve], matrix: multiply(&invert(&to_xyz(&SRGB)), &to_xyz(&source)) })
}

fn be_u32(data: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_be_bytes(data.get(at..at + 4)?.try_into().ok()?))
}

fn fixed(data: &[u8], at: usize) -> Option<f32> {
    Some(i32::from_be_bytes(data.get(at..at + 4)?.try_into().ok()?) as f32 / 65536.0)
}

fn icc_tag<'a>(icc: &'a [u8], signature: &[u8; 4]) -> Option<&'a [u8]> {
    let count = be_u32(icc, 128)? as usize;
    (0..count.min(256)).find_map(|index| {
        let entry = 132 + index * 12;
        if icc.get(entry..entry + 4)? != signature {
            return None;
        }
        let (offset, size) = (be_u32(icc, entry + 4)? as usize, be_u32(icc, entry + 8)? as usize);
        icc.get(offset..offset.checked_add(size)?)
    })
}

fn icc_xyz(icc: &[u8], signature: &[u8; 4]) -> Option<[f32; 3]> {
    let tag = icc_tag(icc, signature)?;
    (tag.get(..4)? == b"XYZ ").then_some(())?;
    Some([fixed(tag, 8)?, fixed(tag, 12)?, fixed(tag, 16)?])
}

fn icc_curve(icc: &[u8], signature: &[u8; 4]) -> Option<Curve> {
    let tag = icc_tag(icc, signature)?;
    match tag.get(..4)? {
        b"curv" => {
            let count = be_u32(tag, 8)? as usize;
            let value = |index: usize| tag.get(12 + index * 2..14 + index * 2).map(|bytes| u16::from_be_bytes([bytes[0], bytes[1]]));
            match count {
                0 => Some(Curve::Gamma(1.0)),
                1 => Some(Curve::Gamma(f32::from(value(0)?) / 256.0)),
                _ => Some(Curve::Table((0..count.min(4096)).map(|index| value(index).map(|step| f32::from(step) / 65535.0)).collect::<Option<_>>()?)),
            }
        }
        b"para" => {
            let kind   = u16::from_be_bytes(tag.get(8..10)?.try_into().ok()?);
            let params = |count: usize| (0..count).map(|index| fixed(tag, 12 + index * 4)).collect::<Option<Vec<f32>>>();
            // Every type written as g, a, b, c, d, e, f: Y = (aX + b)^g + e above d, cX + f below.
            match kind {
                0 => Some(Curve::Gamma(params(1)?[0])),
                1 => { let p = params(3)?; Some(Curve::Parametric([p[0], p[1], p[2], 0.0, -p[2] / p[1], 0.0, 0.0])) }
                2 => { let p = params(4)?; Some(Curve::Parametric([p[0], p[1], p[2], 0.0, -p[2] / p[1], p[3], p[3]])) }
                3 => { let p = params(5)?; Some(Curve::Parametric([p[0], p[1], p[2], p[3], p[4], 0.0, 0.0])) }
                4 => { let p = params(7)?; Some(Curve::Parametric([p[0], p[1], p[2], p[3], p[4], p[5], p[6]])) }
                _ => None,
            }
        }
        _ => None,
    }
}

// A matrix-and-curves profile (Display P3, Adobe RGB, sRGB…); anything else is taken as sRGB.
fn icc(profile: &[u8]) -> Option<Conversion> {
    if profile.get(16..20)? != b"RGB " {
        return None;
    }

    let [r, g, b] = [icc_xyz(profile, b"rXYZ")?, icc_xyz(profile, b"gXYZ")?, icc_xyz(profile, b"bXYZ")?];
    let source    = [[r[0], g[0], b[0]], [r[1], g[1], b[1]], [r[2], g[2], b[2]]];
    let curves    = [icc_curve(profile, b"rTRC")?, icc_curve(profile, b"gTRC")?, icc_curve(profile, b"bTRC")?];
    Some(Conversion { curves, matrix: multiply(&invert(&SRGB_D50), &source) })
}

// Nothing to do for sRGB (or unknown colour, taken as sRGB).
pub fn conversion(colour: Option<&Colour>) -> Option<Conversion> {
    let found = match colour? {
        Colour::Nclx { primaries, transfer, .. } => nclx(*primaries, *transfer),
        Colour::Icc(profile)                     => icc(profile),
    }?;

    let identity = found.matrix.iter().enumerate().all(|(row, values)| values.iter().enumerate().all(|(column, value)| (value - if row == column { 1.0 } else { 0.0 }).abs() < 0.003));
    let srgb     = found.curves.iter().all(|curve| (0..=8).all(|step| (curve.linear(step as f32 / 8.0) - srgb_to_linear(step as f32 / 8.0)).abs() < 0.003));
    (!(identity && srgb)).then_some(found)
}

// 16 bits to 8, rounded (not cut): 0x00FF → 1, as it should, and a 10-bit ramp keeps its steps even.
pub fn to_eight(value: u16) -> u8 {
    ((u32::from(value) * 255 + 32_767) / 65_535) as u8
}

const ENCODE_STEPS: usize = 4096;

// RGB at 16 bits in the photo's colour → RGB at 8 bits in sRGB.
pub fn to_srgb(pixels: &[u16], conversion: Option<&Conversion>) -> Vec<u8> {
    let Some(conversion) = conversion else { return pixels.iter().map(|value| to_eight(*value)).collect() };

    // Tables: each curve from 16-bit code to linear (in 1024 steps, interpolated), and linear back to
    // the sRGB curve.
    let steps   = 1024;
    let decode: Vec<Vec<f32>> = conversion.curves.iter().map(|curve| (0..=steps).map(|step| curve.linear(step as f32 / steps as f32)).collect()).collect();
    let encode: Vec<f32>      = (0..=ENCODE_STEPS).map(|step| linear_to_srgb(step as f32 / ENCODE_STEPS as f32) * 255.0).collect();
    let lookup = |table: &[f32], value: f32| {
        let position = value.clamp(0.0, 1.0) * (table.len() - 1) as f32;
        let below    = position.floor() as usize;
        let above    = (below + 1).min(table.len() - 1);
        let weight   = position - below as f32;
        table[below] * (1.0 - weight) + table[above] * weight
    };

    let m = &conversion.matrix;
    pixels
        .chunks_exact(3)
        .flat_map(|pixel| {
            let linear: Vec<f32> = (0..3).map(|channel| lookup(&decode[channel], f32::from(pixel[channel]) / 65535.0)).collect();
            let out = |row: usize| lookup(&encode, m[row][0] * linear[0] + m[row][1] * linear[1] + m[row][2] * linear[2]).round().clamp(0.0, 255.0) as u8;
            [out(0), out(1), out(2)]
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: &Matrix, b: &Matrix) -> bool {
        a.iter().zip(b).all(|(x, y)| x.iter().zip(y).all(|(p, q)| (p - q).abs() < 0.002))
    }

    #[test]
    fn display_p3_goes_to_srgb_with_the_known_matrix() {
        let conversion = conversion(Some(&Colour::Nclx { primaries: 12, transfer: 13, matrix: 6, full_range: true })).unwrap();
        // The published P3-D65 → sRGB matrix.
        let known = [[1.224_940_1, -0.224_940_4, 0.0], [-0.042_056_9, 1.042_057_1, 0.0], [-0.019_637_6, -0.078_636_1, 1.098_273_5]];
        assert!(close(&conversion.matrix, &known), "{:?}", conversion.matrix);

        // White stays white and grey stays grey.
        assert_eq!(to_srgb(&[65535, 65535, 65535, 32768, 32768, 32768], Some(&conversion)), [255, 255, 255, 128, 128, 128]);
    }

    #[test]
    fn srgb_and_unknown_colour_are_left_as_they_are() {
        assert_eq!(conversion(Some(&Colour::Nclx { primaries: 1, transfer: 13, matrix: 6, full_range: true })), None);
        assert_eq!(conversion(Some(&Colour::Nclx { primaries: 2, transfer: 2, matrix: 2, full_range: false })), None);
        assert_eq!(conversion(None), None);
    }

    #[test]
    fn sixteen_bits_round_to_eight() {
        assert_eq!([0, 128, 129, 257, 32768, 65535].map(to_eight), [0, 0, 1, 1, 128, 255]);
        // A 10-bit ramp (as FFmpeg gives it, shifted to 16) reaches every 8-bit step on the way.
        let ramp: Vec<u8> = (0..1024_u32).map(|value| to_eight((value * 65535 / 1023) as u16)).collect();
        let mut steps     = ramp.clone();
        steps.dedup();
        assert_eq!(steps.len(), 256);
    }

    // A Display P3 profile like Apple's: P3 colorants (D50) and the sRGB curve as a type-3 parametric.
    fn display_p3_icc() -> Vec<u8> {
        let mut tags: Vec<(&[u8; 4], Vec<u8>)> = Vec::new();
        let xyz = |values: [f32; 3]| {
            let mut tag = b"XYZ \0\0\0\0".to_vec();
            values.iter().for_each(|value| tag.extend(((value * 65536.0).round() as i32).to_be_bytes()));
            tag
        };
        let para = {
            let mut tag = b"para\0\0\0\0\0\x03\0\0".to_vec();
            [2.4_f32, 1.0 / 1.055, 0.055 / 1.055, 1.0 / 12.92, 0.040_45].iter().for_each(|value| tag.extend(((value * 65536.0).round() as i32).to_be_bytes()));
            tag
        };
        tags.push((b"rXYZ", xyz([0.515_121, 0.241_196, -0.001_053])));
        tags.push((b"gXYZ", xyz([0.291_977, 0.692_245, 0.041_885])));
        tags.push((b"bXYZ", xyz([0.157_104, 0.066_574, 0.784_073])));
        tags.push((b"rTRC", para.clone()));
        tags.push((b"gTRC", para.clone()));
        tags.push((b"bTRC", para));

        let mut profile = vec![0_u8; 128];
        profile[16..20].copy_from_slice(b"RGB ");
        profile.extend((tags.len() as u32).to_be_bytes());
        let mut offset = 128 + 4 + tags.len() * 12;
        let mut data   = Vec::new();
        for (signature, tag) in &tags {
            profile.extend_from_slice(*signature);
            profile.extend((offset as u32).to_be_bytes());
            profile.extend((tag.len() as u32).to_be_bytes());
            offset += tag.len();
            data.extend_from_slice(tag);
        }
        profile.extend(data);
        profile
    }

    #[test]
    fn an_apple_display_p3_profile_gives_the_same_as_its_nclx() {
        let by_icc  = conversion(Some(&Colour::Icc(display_p3_icc()))).unwrap();
        let by_nclx = conversion(Some(&Colour::Nclx { primaries: 12, transfer: 13, matrix: 6, full_range: true })).unwrap();
        assert!(close(&by_icc.matrix, &by_nclx.matrix), "{:?}", by_icc.matrix);

        // A saturated P3 red is the reddest sRGB red; a P3 orange inside sRGB moves a little.
        let pixels = [65535, 0, 0, 52428, 26214, 13107];
        assert_eq!(to_srgb(&pixels, Some(&by_icc)), to_srgb(&pixels, Some(&by_nclx)));
        assert_eq!(&to_srgb(&pixels, Some(&by_icc))[..3], &[255, 0, 0]);
    }
}
