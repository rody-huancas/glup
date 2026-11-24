# Builds a HEIC whose primary image is a grid of two 64x64 HEVC tiles (like an iPhone photo, which is a
# grid of 512x512 tiles), cropped by the grid to 120x60. Each tile is encoded by libheif (pillow-heif)
# and its hvcC and bitstream are copied into a new file.
import struct, sys
import numpy as np
from PIL import Image
import pillow_heif, io

out = sys.argv[1]

def box(kind, payload):
    return struct.pack('>I4s', 8 + len(payload), kind.encode()) + payload

def full(kind, version, flags, payload):
    return box(kind, bytes([version]) + flags.to_bytes(3, 'big') + payload)

def children(buf, start, end):
    at = start
    while at < end:
        size, kind = struct.unpack('>I4s', buf[at:at+8])
        yield kind.decode(), buf[at:at+size], at
        at += size

def tile(color):
    data = io.BytesIO()
    pillow_heif.from_pillow(Image.new('RGB', (64, 64), color)).save(data, quality=95, chroma=444)
    buf  = data.getvalue()
    top  = {kind: (raw, at) for kind, raw, at in children(buf, 0, len(buf))}
    meta = top['meta'][0]
    inner = {kind: raw for kind, raw, _ in children(meta, 12, len(meta))}
    iprp = inner['iprp']
    ipco = next(raw for kind, raw, _ in children(iprp, 8, len(iprp)) if kind == 'ipco')
    hvcc = next(raw for kind, raw, _ in children(ipco, 8, len(ipco)) if kind == 'hvcC')
    iloc = inner['iloc']
    # libheif writes iloc v0 with 4-byte offsets and lengths and one extent for item 1.
    version = iloc[8]
    assert version in (0, 1)
    sizes = iloc[12]; offset_size, length_size = sizes >> 4, sizes & 15
    base_size = iloc[13] >> 4
    at = 14
    count = struct.unpack('>H', iloc[at:at+2])[0]; at += 2
    for _ in range(count):
        item = struct.unpack('>H', iloc[at:at+2])[0]; at += 2
        if version == 1: at += 2
        at += 2
        base = int.from_bytes(iloc[at:at+base_size], 'big') if base_size else 0; at += base_size
        extents = struct.unpack('>H', iloc[at:at+2])[0]; at += 2
        offset = int.from_bytes(iloc[at:at+offset_size], 'big'); at += offset_size
        length = int.from_bytes(iloc[at:at+length_size], 'big'); at += length_size
        if item == 1:
            return hvcc, buf[base+offset:base+offset+length]
    raise SystemExit('no item 1')

left, right = tile((220, 30, 30)), tile((30, 30, 220))

ftyp = box('ftyp', b'heic' + struct.pack('>I', 0) + b'mif1heic')
hdlr = full('hdlr', 0, 0, b'\0\0\0\0' + b'pict' + b'\0' * 12 + b'\0')
pitm = full('pitm', 0, 0, struct.pack('>H', 3))
def infe(item, kind, hidden):
    return full('infe', 2, 1 if hidden else 0, struct.pack('>HH', item, 0) + kind.encode() + b'\0')
iinf = full('iinf', 0, 0, struct.pack('>H', 3) + infe(1, 'hvc1', True) + infe(2, 'hvc1', True) + infe(3, 'grid', False))
iref = full('iref', 0, 0, box('dimg', struct.pack('>HH', 3, 2) + struct.pack('>HH', 1, 2)))
grid = bytes([0, 0, 0, 1]) + struct.pack('>HH', 120, 60)
idat = box('idat', grid)
ispe_tile = full('ispe', 0, 0, struct.pack('>II', 64, 64))
ispe_grid = full('ispe', 0, 0, struct.pack('>II', 120, 60))
ipco = box('ipco', left[0] + ispe_tile + right[0] + ispe_grid)
# Properties: 1 hvcC left, 2 ispe tile, 3 hvcC right, 4 ispe grid.
ipma = full('ipma', 0, 0, struct.pack('>I', 3)
            + struct.pack('>HB', 1, 2) + bytes([0x81, 2])
            + struct.pack('>HB', 2, 2) + bytes([0x83, 2])
            + struct.pack('>HB', 3, 1) + bytes([4]))
iprp = box('iprp', ipco + ipma)

def build(mdat_start):
    # iloc v1: 4-byte offsets/lengths, no base offset; items 1 and 2 in mdat, 3 in idat.
    entries = b''
    entries += struct.pack('>HHH', 1, 0, 0) + struct.pack('>H', 1) + struct.pack('>II', mdat_start, len(left[1]))
    entries += struct.pack('>HHH', 2, 0, 0) + struct.pack('>H', 1) + struct.pack('>II', mdat_start + len(left[1]), len(right[1]))
    entries += struct.pack('>HHH', 3, 1, 0) + struct.pack('>H', 1) + struct.pack('>II', 0, len(grid))
    iloc = full('iloc', 1, 0, bytes([0x44, 0x00]) + struct.pack('>H', 3) + entries)
    meta = full('meta', 0, 0, hdlr + pitm + iloc + iinf + iref + iprp + idat)
    return ftyp + meta

head = build(0)
start = len(head) + 8
data = build(start) + box('mdat', left[1] + right[1])
assert len(build(start)) == len(head)
open(out, 'wb').write(data)
print('grid', len(data))
