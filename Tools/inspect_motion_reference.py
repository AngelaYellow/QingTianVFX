"""Extract timestamped reference-video frames for local analysis only; no audio copied."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('video', type=Path)
args = p.parse_args()
out = ROOT / 'LocalEvidence/MotionReference'
out.mkdir(parents=True, exist_ok=True)
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
                                         '-show_format', '-of', 'json', str(args.video)], text=True))
groups = {'whole': [float(t) for t in range(0, 145, 12)],
          '12-16': [12 + i * .5 for i in range(9)],
          '76-80': [76 + i * .5 for i in range(9)],
          '120-124': [120 + i * .5 for i in range(9)]}
times = sorted(set(t for group in groups.values() for t in group))
for t in times:
    target = out / f'frame-{t:07.3f}.png'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(t),
                    '-i', str(args.video), '-frames:v', '1', '-an', str(target)], check=True)
for name, group in groups.items():
    columns = 4 if name == 'whole' else 3
    # This reference is a 448x960 phone recording. Crop only the observed artwork,
    # retaining untouched full frames alongside it. No color/shape transformation.
    w, h = (224, 480) if name == 'whole' else (448, 440)
    canvas = Image.new('RGB', (columns * w, ((len(group) + columns - 1) // columns) * (h + 24)), '#151515')
    draw = ImageDraw.Draw(canvas)
    for i, t in enumerate(group):
        im = Image.open(out / f'frame-{t:07.3f}.png').convert('RGB')
        im = im.resize((w, h)) if name == 'whole' else im.crop((0, 204, 448, 644))
        x, y = i % columns * w, i // columns * (h + 24)
        canvas.paste(im, (x, y + 24)); draw.text((x + 8, y + 5), f'{t:.3f} s', fill='white')
    canvas.save(out / f'contact-{name}.png')
manifest = {'source': str(args.video.resolve()), 'sha256': hashlib.sha256(args.video.read_bytes()).hexdigest(),
            'probe': info, 'groups': groups, 'requestedTimestamps': times,
            'note': 'Accurate seek to requested times; nearest decoded video frame at 30 fps. Audio excluded. All media stays ignored locally.'}
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'frames': len(times), 'duration': info['format']['duration'], 'sha256': manifest['sha256'],
                  'contacts': list(groups)}, ensure_ascii=False))
