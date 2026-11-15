"""Restore ignored audio on a fresh clone without the research repository."""
from pathlib import Path
import hashlib,json,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/'周杰伦 - 晴天.flac'
manifest=json.loads((ROOT/'Docs/Evidence/input-manifest.json').read_text(encoding='utf-8'))
if not source.is_file():raise SystemExit('Usage: python Tools/restore_audio.py PATH_TO_AUTHORIZED_ORIGINAL_FLAC')
if hashlib.sha256(source.read_bytes()).hexdigest()!=manifest['source_sha256']:raise SystemExit('Source SHA-256 mismatch; do not silently use another recording.')
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:raise SystemExit('ffmpeg is required for 48 kHz PCM conversion.')
audio=ROOT/'Assets/QingTian/Audio/LocalOnly/QingTian.wav';audio.parent.mkdir(parents=True,exist_ok=True)
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(source),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(audio)],check=True)
print('Restored local audio. In Unity run QingTian > 1 - Build or repair M1 scene to bind it.')
