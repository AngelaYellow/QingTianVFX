"""Record the actual Unity editor window using ffmpeg gdigrab (silent, real time)."""
from pathlib import Path
import argparse,json,shutil,subprocess,time
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('window_title');p.add_argument('--seconds',type=int,default=18);p.add_argument('--desktop-region',help='Observed physical x,y,width,height; use when GPU window capture is white');args=p.parse_args()
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:raise SystemExit('ffmpeg not found')
out=ROOT/'LocalEvidence';out.mkdir(exist_ok=True)
video=out/'M1_editor_live.mp4'
capture=['-i','title='+args.window_title]
if args.desktop_region:
    x,y,w,h=map(int,args.desktop_region.split(','));capture=['-offset_x',str(x),'-offset_y',str(y),'-video_size',f'{w}x{h}','-i','desktop']
command=[ffmpeg,'-hide_banner','-loglevel','warning','-y','-f','gdigrab','-framerate','30','-draw_mouse','0']+capture+['-t',str(args.seconds),'-vf','scale=1440:-2','-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(video)]
start=time.time();subprocess.run(command,check=True)
(out/'recording-info.json').write_text(json.dumps({'file':video.name,'method':'ffmpeg gdigrab: actual Unity editor in real time','desktopRegion':args.desktop_region,'audio':'none (silent screen recording); listen in Unity or use the separate 68 BPM review audio','capturedAtUnix':start,'durationRequested':args.seconds,'windowTitle':args.window_title},ensure_ascii=False,indent=2),encoding='utf-8')
print(str(video))
