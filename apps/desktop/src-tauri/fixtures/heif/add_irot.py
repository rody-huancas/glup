# Adds an irot property (rotation in steps of 90 degrees, counter-clockwise) to the primary item of an
# AVIF/HEIF file written as ftyp, meta, mdat, fixing every size and every iloc offset.
import struct, sys

path, angle = sys.argv[1], int(sys.argv[2])
data = bytearray(open(path, 'rb').read())

def boxes(buf, start, end):
    at = start
    while at < end:
        size, kind = struct.unpack('>I4s', buf[at:at+8])
        yield at, size, kind.decode()
        at += size

top  = {kind: (at, size) for at, size, kind in boxes(data, 0, len(data))}
meta_at, meta_size = top['meta']
inner = {kind: (at, size) for at, size, kind in boxes(data, meta_at + 12, meta_at + meta_size)}
iprp_at, iprp_size = inner['iprp']
props = {kind: (at, size) for at, size, kind in boxes(data, iprp_at + 8, iprp_at + iprp_size)}
ipco_at, ipco_size = props['ipco']
ipma_at, ipma_size = props['ipma']
pitm_at, _ = inner['pitm']
primary = struct.unpack('>H', data[pitm_at+12:pitm_at+14])[0]

index = sum(1 for _ in boxes(data, ipco_at + 8, ipco_at + ipco_size)) + 1
irot  = struct.pack('>I4sB', 9, b'irot', angle & 3)

# ipma: find the primary entry and add one (non-essential) association.
version, flags = data[ipma_at+8], int.from_bytes(data[ipma_at+9:ipma_at+12], 'big')
assert version == 0 and flags & 1 == 0
count = struct.unpack('>I', data[ipma_at+12:ipma_at+16])[0]
at = ipma_at + 16
insert_at = None
for _ in range(count):
    item, n = struct.unpack('>HB', data[at:at+3])
    if item == primary:
        data[at+2] = n + 1
        insert_at = at + 3 + n
    at += 3 + n
assert insert_at is not None
data[insert_at:insert_at] = bytes([index])          # before ipco grows, ipma is after ipco
data[ipco_at+ipco_size:ipco_at+ipco_size] = irot      # at the end of ipco
growth = len(irot) + 1

def grow(at, by):
    size = struct.unpack('>I', data[at:at+4])[0]
    data[at:at+4] = struct.pack('>I', size + by)

grow(ipco_at, len(irot))
grow(ipma_at + len(irot), 1)
grow(iprp_at, growth)
grow(meta_at, growth)

# iloc is before iprp in these files: its position did not move; shift offsets into mdat.
iloc_at, _ = inner['iloc']
assert iloc_at < iprp_at
v = data[iloc_at+8]
sizes = data[iloc_at+12]
offset_size, length_size = sizes >> 4, sizes & 15
sizes2 = data[iloc_at+13]
base_size, index_size = sizes2 >> 4, (sizes2 & 15 if v in (1, 2) else 0)
at = iloc_at + 14
items = struct.unpack('>H', data[at:at+2])[0] if v < 2 else struct.unpack('>I', data[at:at+4])[0]
at += 2 if v < 2 else 4

def read(at, n):
    return int.from_bytes(data[at:at+n], 'big') if n else 0

def write(at, n, value):
    if n:
        data[at:at+n] = value.to_bytes(n, 'big')

for _ in range(items):
    at += 2 if v < 2 else 4
    method = 0
    if v in (1, 2):
        method = read(at, 2) & 15
        at += 2
    at += 2
    base = read(at, base_size)
    if method == 0 and base:
        write(at, base_size, base + growth)
    base_at = at
    at += base_size
    extents = read(at, 2)
    at += 2
    for _ in range(extents):
        at += index_size
        if method == 0 and not base:
            write(at, offset_size, read(at, offset_size) + growth)
        at += offset_size + length_size

open(path, 'wb').write(data)
print('irot', angle, 'on item', primary, 'size', len(data))
