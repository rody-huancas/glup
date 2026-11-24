// What a HEIF file (HEIC from an iPhone, or AVIF) says about its main picture, read from its boxes
// (ISO/IEC 23008-12): which item is the primary one (a burst or a Live Photo carries more), its size,
// how to turn it upright (irot, imir), its colour (nclx or an ICC profile) and its EXIF block. The
// pixels are decoded elsewhere (Windows or FFmpeg); this only reads the container.
use std::{fs, path::Path};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Codec {
    Hevc,
    Av1,
}

// One step to turn the decoded picture upright, in the order the file lists them.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Transform {
    // Counter-clockwise, in quarter turns (1 = 90°).
    Rotate(u8),
    // Left to right (a vertical axis).
    MirrorLeftRight,
    // Top to bottom (a horizontal axis).
    MirrorTopBottom,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Colour {
    // Coded colour (ITU-T H.273): primaries, transfer and matrix.
    Nclx { primaries: u16, transfer: u16, matrix: u16, full_range: bool },
    Icc(Vec<u8>),
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct HeifInfo {
    pub codec      : Option<Codec>,
    pub width      : u32,
    pub height     : u32,
    pub transforms : Vec<Transform>,
    pub colour     : Option<Colour>,
    // The TIFF part of the EXIF block (it starts with "II*" or "MM*").
    pub exif       : Option<Vec<u8>>,
    // Pictures in the file that are not hidden (a burst has several; one is the primary).
    pub pictures   : usize,
}

// The first bytes say it is a HEIF image (HEIC, HEIF or AVIF), whatever its extension.
pub fn is_heif(head: &[u8]) -> bool {
    head.get(4..8) == Some(b"ftyp")
        && matches!(head.get(8..12), Some(b"heic" | b"heix" | b"heim" | b"heis" | b"hevc" | b"hevx" | b"mif1" | b"msf1" | b"avif" | b"avis"))
}

pub const HEIF_EXTENSIONS: [&str; 4] = ["heic", "heif", "hif", "avif"];

pub fn has_heif_extension(path: &Path) -> bool {
    path.extension().is_some_and(|extension| HEIF_EXTENSIONS.contains(&extension.to_string_lossy().to_lowercase().as_str()))
}

struct Reader<'a> {
    data : &'a [u8],
    at   : usize,
}

impl<'a> Reader<'a> {
    fn new(data: &'a [u8]) -> Self {
        Reader { data, at: 0 }
    }

    fn take(&mut self, count: usize) -> Option<&'a [u8]> {
        let bytes = self.data.get(self.at..self.at.checked_add(count)?)?;
        self.at  += count;
        Some(bytes)
    }

    fn uint(&mut self, size: usize) -> Option<u64> {
        Some(self.take(size)?.iter().fold(0_u64, |value, byte| (value << 8) | u64::from(*byte)))
    }

    fn u8(&mut self) -> Option<u8> {
        self.uint(1).map(|value| value as u8)
    }

    fn u16(&mut self) -> Option<u16> {
        self.uint(2).map(|value| value as u16)
    }

    fn u32(&mut self) -> Option<u32> {
        self.uint(4).map(|value| value as u32)
    }

    fn left(&self) -> &'a [u8] {
        self.data.get(self.at..).unwrap_or_default()
    }
}

// A box: its four letters and what is inside (after the header).
struct Chunk<'a> {
    kind : [u8; 4],
    body : &'a [u8],
}

fn boxes(data: &[u8]) -> Vec<Chunk<'_>> {
    let mut found  = Vec::new();
    let mut reader = Reader::new(data);

    while reader.left().len() >= 8 {
        let start = reader.at;
        let Some(size) = reader.u32() else { break };
        let Some(kind) = reader.take(4) else { break };
        let size = match size {
            0 => (data.len() - start) as u64,
            1 => match reader.uint(8) {
                Some(large) => large,
                None        => break,
            },
            size => u64::from(size),
        };

        let header = reader.at - start;
        let Some(end) = start.checked_add(size as usize).filter(|end| *end <= data.len() && size as usize >= header) else { break };
        found.push(Chunk { kind: [kind[0], kind[1], kind[2], kind[3]], body: &data[reader.at..end] });
        reader.at = end;
    }
    found
}

fn find<'a>(list: &[Chunk<'a>], kind: &[u8; 4]) -> Option<&'a [u8]> {
    list.iter().find(|item| &item.kind == kind).map(|item| item.body)
}

// A full box starts with its version and flags.
fn full(body: &[u8]) -> Option<(u8, u32, &[u8])> {
    let version = *body.first()?;
    let flags   = body.get(1..4)?.iter().fold(0_u32, |value, byte| (value << 8) | u32::from(*byte));
    Some((version, flags, body.get(4..)?))
}

struct Item {
    id     : u32,
    kind   : [u8; 4],
    hidden : bool,
}

fn items(iinf: &[u8]) -> Vec<Item> {
    let Some((version, _, rest)) = full(iinf) else { return Vec::new() };
    let skip = if version == 0 { 2 } else { 4 };

    boxes(rest.get(skip..).unwrap_or_default())
        .iter()
        .filter(|entry| &entry.kind == b"infe")
        .filter_map(|entry| {
            let (version, flags, rest) = full(entry.body)?;
            let mut reader             = Reader::new(rest);
            let id                     = if version >= 3 { reader.u32()? } else { u32::from(reader.u16()?) };
            reader.u16()?;
            let kind = reader.take(4)?;
            (version >= 2).then(|| Item { id, kind: [kind[0], kind[1], kind[2], kind[3]], hidden: flags & 1 == 1 })
        })
        .collect()
}

struct Extent {
    offset : u64,
    length : u64,
}

struct Location {
    id      : u32,
    // 0: the file, 1: the idat box.
    method  : u8,
    base    : u64,
    extents : Vec<Extent>,
}

fn locations(iloc: &[u8]) -> Vec<Location> {
    let parse = || -> Option<Vec<Location>> {
        let (version, _, rest) = full(iloc)?;
        let mut reader         = Reader::new(rest);
        let sizes              = reader.u8()?;
        let more               = reader.u8()?;
        let (offset, length)   = (usize::from(sizes >> 4), usize::from(sizes & 15));
        let base_size          = usize::from(more >> 4);
        let index_size         = if version == 1 || version == 2 { usize::from(more & 15) } else { 0 };
        let count              = if version < 2 { u32::from(reader.u16()?) } else { reader.u32()? };
        let mut found          = Vec::new();

        for _ in 0..count {
            let id     = if version < 2 { u32::from(reader.u16()?) } else { reader.u32()? };
            let method = if version == 1 || version == 2 { (reader.u16()? & 15) as u8 } else { 0 };
            reader.u16()?;
            let base    = reader.uint(base_size)?;
            let extents = reader.u16()?;
            let mut list = Vec::new();
            for _ in 0..extents {
                reader.uint(index_size)?;
                list.push(Extent { offset: reader.uint(offset)?, length: reader.uint(length)? });
            }
            found.push(Location { id, method, base, extents: list });
        }
        Some(found)
    };
    parse().unwrap_or_default()
}

// The bytes of an item, from the file or from idat.
fn item_data(data: &[u8], idat: Option<&[u8]>, location: &Location) -> Option<Vec<u8>> {
    let source = match location.method {
        0 => data,
        1 => idat?,
        _ => return None,
    };

    let mut bytes = Vec::new();
    for extent in &location.extents {
        let start = usize::try_from(location.base + extent.offset).ok()?;
        let end   = if extent.length == 0 { source.len() } else { start.checked_add(usize::try_from(extent.length).ok()?)? };
        bytes.extend_from_slice(source.get(start..end)?);
    }
    Some(bytes)
}

// Item properties, by position (1-based in ipma), and which ones each item has, in order.
fn associations(ipma: &[u8], item: u32) -> Vec<usize> {
    let parse = || -> Option<Vec<usize>> {
        let (version, flags, rest) = full(ipma)?;
        let mut reader             = Reader::new(rest);
        let count                  = reader.u32()?;

        for _ in 0..count {
            let id    = if version < 1 { u32::from(reader.u16()?) } else { reader.u32()? };
            let links = reader.u8()?;
            let mut list = Vec::new();
            for _ in 0..links {
                let index = if flags & 1 == 1 { usize::from(reader.u16()? & 0x7FFF) } else { usize::from(reader.u8()? & 0x7F) };
                list.push(index);
            }
            if id == item {
                return Some(list);
            }
        }
        Some(Vec::new())
    };
    parse().unwrap_or_default()
}

// References of one kind from an item (dimg: the tiles of a grid; cdsc: what describes an item).
fn references(iref: Option<&[u8]>, kind: &[u8; 4]) -> Vec<(u32, Vec<u32>)> {
    let Some((version, _, rest)) = iref.and_then(full) else { return Vec::new() };

    boxes(rest)
        .iter()
        .filter(|entry| &entry.kind == kind)
        .filter_map(|entry| {
            let mut reader = Reader::new(entry.body);
            let from       = item_id(&mut reader, version)?;
            let count      = reader.u16()?;
            let to         = (0..count).filter_map(|_| item_id(&mut reader, version)).collect();
            Some((from, to))
        })
        .collect()
}

fn item_id(reader: &mut Reader, version: u8) -> Option<u32> {
    if version == 0 { reader.u16().map(u32::from) } else { reader.u32() }
}

fn colour(body: &[u8]) -> Option<Colour> {
    let mut reader = Reader::new(body);
    match reader.take(4)? {
        b"nclx" => Some(Colour::Nclx { primaries: reader.u16()?, transfer: reader.u16()?, matrix: reader.u16()?, full_range: reader.u8()? & 0x80 != 0 }),
        b"prof" | b"rICC" => Some(Colour::Icc(reader.left().to_vec())),
        _ => None,
    }
}

// The EXIF block of an item starts with the offset to its TIFF header.
fn exif_tiff(block: &[u8]) -> Option<Vec<u8>> {
    let offset = usize::try_from(u32::from_be_bytes(block.get(..4)?.try_into().ok()?)).ok()?;
    let tiff   = block.get(4 + offset..)?;
    (tiff.starts_with(b"II*\0") || tiff.starts_with(b"MM\0*")).then(|| tiff.to_vec())
}

pub fn parse(data: &[u8]) -> Option<HeifInfo> {
    if !is_heif(data) {
        return None;
    }

    let top           = boxes(data);
    let (_, _, meta)  = full(find(&top, b"meta")?)?;
    let meta          = boxes(meta);
    let pitm          = full(find(&meta, b"pitm")?)?;
    let primary       = if pitm.0 == 0 { u32::from(Reader::new(pitm.2).u16()?) } else { Reader::new(pitm.2).u32()? };
    let items         = items(find(&meta, b"iinf")?);
    let iprp          = boxes(find(&meta, b"iprp")?);
    let properties    = boxes(find(&iprp, b"ipco")?);
    let ipma          = find(&iprp, b"ipma")?;
    let iref          = find(&meta, b"iref");
    let idat          = find(&meta, b"idat");
    let locations     = locations(find(&meta, b"iloc").unwrap_or_default());
    let kind_of       = |id: u32| items.iter().find(|item| item.id == id).map(|item| item.kind);

    let mut info = HeifInfo { pictures: items.iter().filter(|item| !item.hidden && matches!(&item.kind, b"hvc1" | b"av01" | b"grid")).count(), ..HeifInfo::default() };

    // A grid is drawn from its tiles: the codec is theirs.
    let picture = match kind_of(primary)? {
        kind if &kind == b"grid" => references(iref, b"dimg").into_iter().find(|(from, _)| *from == primary).and_then(|(_, tiles)| tiles.first().copied()).and_then(kind_of),
        kind                     => Some(kind),
    };
    info.codec = match picture.as_ref() {
        Some(b"hvc1") => Some(Codec::Hevc),
        Some(b"av01") => Some(Codec::Av1),
        _             => None,
    };

    for index in associations(ipma, primary) {
        let Some(property) = index.checked_sub(1).and_then(|position| properties.get(position)) else { continue };
        match &property.kind {
            b"ispe" => {
                let mut reader = Reader::new(full(property.body).map(|(_, _, rest)| rest).unwrap_or_default());
                info.width     = reader.u32().unwrap_or(0);
                info.height    = reader.u32().unwrap_or(0);
            }
            // The clean aperture: the picture without the padding the codec needs (64×64 coded, 64×48 shown).
            b"clap" => {
                let mut reader = Reader::new(property.body);
                let width      = reader.u32().zip(reader.u32()).map(|(n, d)| if d == 0 { 0 } else { n / d });
                let height     = reader.u32().zip(reader.u32()).map(|(n, d)| if d == 0 { 0 } else { n / d });
                if let (Some(width), Some(height)) = (width, height) {
                    info.width  = width;
                    info.height = height;
                }
            }
            b"irot" => info.transforms.push(Transform::Rotate(property.body.first().copied().unwrap_or(0) & 3)),
            b"imir" => info.transforms.push(if property.body.first().copied().unwrap_or(0) & 1 == 0 { Transform::MirrorLeftRight } else { Transform::MirrorTopBottom }),
            b"colr" if info.colour.is_none() => info.colour = colour(property.body),
            _ => {}
        }
    }

    // The EXIF that describes the primary picture (cdsc), or the only one there is.
    let described  = references(iref, b"cdsc").into_iter().find(|(_, to)| to.contains(&primary)).map(|(from, _)| from);
    let exif_items: Vec<u32> = items.iter().filter(|item| &item.kind == b"Exif").map(|item| item.id).collect();
    let exif_item  = described.filter(|id| exif_items.contains(id)).or_else(|| exif_items.first().copied());
    info.exif      = exif_item
        .and_then(|id| locations.iter().find(|location| location.id == id))
        .and_then(|location| item_data(data, idat, location))
        .and_then(|block| exif_tiff(&block));

    Some(info)
}

pub fn read(path: &Path) -> Option<HeifInfo> {
    parse(&fs::read(path).ok()?)
}
