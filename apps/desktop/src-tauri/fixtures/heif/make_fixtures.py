import os, subprocess, sys, struct
import numpy as np
from PIL import Image
import pillow_heif

out    = sys.argv[1]
ffmpeg = sys.argv[2]
os.makedirs(out, exist_ok=True)

W, H = 64, 48

def quadrants():
    a = np.zeros((H, W, 3), np.uint8)
    a[:H//2, :W//2] = (220, 30, 30)    # top-left red
    a[:H//2, W//2:] = (30, 200, 30)    # top-right green
    a[H//2:, :W//2] = (30, 30, 220)    # bottom-left blue
    a[H//2:, W//2:] = (240, 240, 240)  # bottom-right white
    return Image.fromarray(a, 'RGB')

def exif(orientation):
    e = Image.Exif()
    e[0x0112] = orientation
    e[0x010F] = 'Glup'
    e[0x0110] = 'Prueba'
    e[0x0132] = '2024:05:17 10:20:30'
    ifd = e.get_ifd(0x8769)
    ifd[0x9003] = '2024:05:17 10:20:30'
    ifd[0x9004] = '2024:05:17 10:20:30'
    gps = e.get_ifd(0x8825)
    gps[1] = 'S'
    gps[2] = (12.0, 3.0, 30.5)
    gps[3] = 'W'
    gps[4] = (77.0, 2.0, 15.25)
    return e.tobytes()

# 1. Rotated (EXIF orientation 6 -> libheif writes irot), with date and GPS.
img = quadrants()
pillow_heif.from_pillow(img).save(os.path.join(out, 'rotada.heic'), quality=95, chroma=420, exif=exif(6))

# 2. 10 bits in Display P3: a flat P3 colour on top, a grey ramp below.
a = np.zeros((H, W, 3), np.uint16)
a[:H//2] = (int(0.8*1023), int(0.4*1023), int(0.2*1023))
ramp = (np.arange(W) * 1023 // (W - 1)).astype(np.uint16)
a[H//2:] = ramp[None, :, None]
heif = pillow_heif.from_bytes(mode='RGB;16', size=(W, H), data=(a.astype(np.uint32) << 6).astype('<u2').tobytes())
heif.save(os.path.join(out, 'diez-bits-p3.heic'), quality=98, chroma=444, save_to_12bit=False,
          color_primaries=12, transfer_characteristics=13, matrix_coefficients=6, full_range_flag=1)

# 3. Burst: two images, the second one is the primary.
first  = Image.new('RGB', (W, H), (200, 40, 40))
second = Image.new('RGB', (W, H), (40, 40, 200))
burst  = pillow_heif.from_pillow(first)
burst.add_from_pillow(second)
burst.save(os.path.join(out, 'rafaga.heic'), quality=95, chroma=444, primary_index=1)

# 4. AVIF 8 bits (add_irot.py turns it 90 degrees after) and 10 bits, full range sRGB.
quadrants().save(os.path.join(out, '_q.png'))
COLOUR = ['-color_range', 'pc', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1']
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', os.path.join(out, '_q.png'),
                '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '10', '-pix_fmt', 'yuv444p'] + COLOUR + [
                os.path.join(out, 'rotada.avif')], check=True)
ramp16 = np.zeros((H, W, 3), np.uint16)
ramp16[:] = (np.arange(W) * 65535 // (W - 1)).astype(np.uint16)[None, :, None]
Image.fromarray(np.ascontiguousarray(ramp16[:, :, 0])).save(os.path.join(out, '_r.png'))
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', os.path.join(out, '_r.png'),
                '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '4', '-pix_fmt', 'yuv420p10le'] + COLOUR + [
                os.path.join(out, 'diez-bits.avif')], check=True)
os.remove(os.path.join(out, '_q.png'))
os.remove(os.path.join(out, '_r.png'))

for name in sorted(os.listdir(out)):
    data = open(os.path.join(out, name), 'rb').read()
    print(name, len(data), 'irot' if b'irot' in data else '-', 'Exif' if b'Exif' in data else '-')
