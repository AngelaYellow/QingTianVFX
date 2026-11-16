"""Generate a deterministic straight-alpha particle mask; no source image is used."""
from pathlib import Path
import math
import struct
import zlib

root = Path(__file__).resolve().parents[1]
target = root / 'Assets/QingTian/Textures/M2/SoftDisc.png'
target.parent.mkdir(parents=True, exist_ok=True)
size = 128
rows = bytearray()
for y in range(size):
    rows.append(0)  # PNG filter: None
    for x in range(size):
        radius = math.hypot((x + .5) * 2 / size - 1, (y + .5) * 2 / size - 1)
        edge = min(1, max(0, (radius - .7) / .3))
        alpha = math.exp(-4 * radius * radius) * (1 - edge * edge * (3 - 2 * edge))
        rows.extend((255, 255, 255, round(255 * alpha)))

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

target.write_bytes(b'\x89PNG\r\n\x1a\n'
                  + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
                  + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))
print('Created Assets/QingTian/Textures/M2/SoftDisc.png: 128x128, white RGB, radial alpha, transparent edge.')
