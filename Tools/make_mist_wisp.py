"""Generate an original, deterministic RGBA mist mask (no source image editing)."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SIZE = 256

def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def noise(x, y):
    ix, iy = math.floor(x), math.floor(y)
    tx, ty = smooth(x - ix), smooth(y - iy)
    def h(a, b):
        v = ((a * 374761393 + b * 668265263 + 1376312589) & 0xffffffff)
        v = ((v ^ (v >> 13)) * 1274126177) & 0xffffffff
        return ((v ^ (v >> 16)) & 0xffffff) / 16777216
    a = h(ix, iy) * (1 - tx) + h(ix + 1, iy) * tx
    b = h(ix, iy + 1) * (1 - tx) + h(ix + 1, iy + 1) * tx
    return a * (1 - ty) + b * ty

alpha = []
for py in range(SIZE):
    for px in range(SIZE):
        x, y = (px + .5) * 2 / SIZE - 1, (py + .5) * 2 / SIZE - 1
        radius = math.hypot(x, y)
        warp = .18 * math.sin(4 * x) + .12 * math.sin(9 * x + .8)
        n = .65 * noise(x * 3.1 + 8, (y + warp) * 4.2 + 9)
        n += .25 * noise(x * 6.3 + 17, (y + warp) * 9.4 + 12)
        n += .10 * noise(x * 12.9 + 3, (y + warp) * 18.1 + 6)
        envelope = math.exp(-2.8 * radius * radius) * (1 - smooth((radius - .65) / .33))
        alpha.append(envelope * (.10 + .90 * n * n))

peak = max(alpha)
rows = bytearray()
for y in range(SIZE):
    rows.append(0)
    for x in range(SIZE):
        rows.extend((255, 255, 255, round(255 * alpha[y * SIZE + x] / peak)))

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

target = ROOT / 'Assets/QingTian/Textures/M2/MistWisp.png'
target.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
                   + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))
print(f'{target.name}: {SIZE}x{SIZE}, white RGB, shaped alpha, zero outer edge, deterministic seed.')
