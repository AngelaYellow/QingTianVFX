"""Compose actual captures, with labels outside the artwork. Never upload audio."""
from pathlib import Path
import json, subprocess, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
local=root/'LocalOnly/flow-rework-20261116'
evidence=root/'evidence'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)

def run(args):
    p=subprocess.run(args,capture_output=True,encoding='utf-8',errors='replace')
    if p.returncode: raise RuntimeError(p.stderr[-3000:])
    return p.stdout

labels=['before-final','after-final','audio-off','verse','body-only','anchor-pass']
records={name:json.loads((local/f'{name}.json').read_text(encoding='utf-8')) for name in labels}
probes={}
for name in labels:
    probe=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_type,start_time,duration,width,height,r_frame_rate','-of','json',str(local/f'{name}.mp4')]))
    video=next(s for s in probe['streams'] if s['codec_type']=='video')
    assert float(video.get('start_time',0))<.06, (name,video)
    assert float(video['duration'])>=records[name]['duration']-.06, (name,video)
    probes[name]=probe

def pair(a,b,name,left,right,duration=10,align=True):
    common=max(records[a]['clipStart'],records[b]['clipStart'])
    da=common-records[a]['clipStart'] if align else 0
    db=common-records[b]['clipStart'] if align else 0
    header=Image.new('RGB',(1920,64),'#071014');draw=ImageDraw.Draw(header)
    draw.text((24,15),left,font=font,fill='#D7E7EC');draw.text((984,15),right,font=font,fill='#D7E7EC')
    title=local/f'{name}-title.png';header.save(title)
    graph=f'[0:v]trim=start={da}:duration={duration},setpts=PTS-STARTPTS,scale=960:540[l];[1:v]trim=start={db}:duration={duration},setpts=PTS-STARTPTS,scale=960:540[r];[l][r]hstack=inputs=2[v];[2:v][v]vstack=inputs=2[out];[1:a]atrim=start={db}:duration={duration},asetpts=PTS-STARTPTS[a]'
    out=local/f'{name}.mp4'
    run(['ffmpeg','-v','error','-y','-i',str(local/f'{a}.mp4'),'-i',str(local/f'{b}.mp4'),'-loop','1','-framerate','60','-i',str(title),'-filter_complex',graph,'-map','[out]','-map','[a]','-t',str(duration),'-r','60','-c:v','libx264','-threads','4','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out)])
    return out

main=pair('before-final','after-final','前后对比_同段副歌','改前：固定采样位移','改后：有状态形体流动')
pair('audio-off','after-final','音频驱动_关与开','音频驱动关闭：保留基础流动','音频驱动开启：推进、卷曲、波前')
pair('verse','after-final','主歌与副歌','主歌：40–50 秒','副歌：105–115 秒',align=False)

def two_seconds(name,outname):
    images=[]
    for seconds in [1,3]:
        path=local/f'{name}-{seconds}.png'
        run(['ffmpeg','-v','error','-y','-ss',str(seconds),'-i',str(local/f'{name}.mp4'),'-vf','crop=1672:941','-frames:v','1',str(path)])
        images.append(Image.open(path).convert('RGB'))
    w,h=images[0].size;canvas=Image.new('RGB',(w*2+24,h+90),'#071014');draw=ImageDraw.Draw(canvas)
    for i,im in enumerate(images):
        t=records[name]['clipStart']+[1,3][i]
        draw.text((i*(w+24)+20,15),f'{t:.3f} s · 同一次实际播放',font=font,fill='#D7E7EC');canvas.paste(im,(i*(w+24),65))
    canvas.save(evidence/outname)
    return float(np.abs(np.asarray(images[0],np.float32)-np.asarray(images[1],np.float32)).mean())

differences={name:two_seconds(name,file) for name,file in [('after-final','主体_相隔2秒.png'),('body-only','无细点_相隔2秒.png')]}
gif=evidence/'前后对比_无声.gif'
run(['ffmpeg','-v','error','-y','-ss','1','-t','8','-i',str(main),'-filter_complex','fps=20,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=sierra2_4a','-an','-loop','0',str(gif)])
gif_probe=json.loads(run(['ffprobe','-v','error','-show_entries','stream=codec_type:format=duration,size','-of','json',str(gif)]))
assert all(s['codec_type']=='video' for s in gif_probe['streams'])

result={'recording':'Live WebGL canvas and live Web Audio. Three-second encoder preroll removed. MP4 files remain LocalOnly.',
        'samples':{},'twoSecondImageMeanAbsDifference255':differences,'differenceCaveat':'Image difference includes brightness and shape; it is not an optical-flow velocity measurement.',
        'publicPreview':{'file':gif.name,'audioStreams':0,'fps':20,'duration':8,'probe':gif_probe},'probes':probes}
for name,r in records.items():
    trace=[x for x in r['trace'] if r['clipStart']<=x['t']<r['clipStart']+r['duration']]
    result['samples'][name]={k:r[k] for k in ['clipStart','duration','audioEnabled','smallPoints']}
    result['samples'][name]['stats']={k:v for k,v in r['stats'].items() if k!='audit'}
    result['samples'][name]['sourceHashes']=r.get('sourceHashes',{})
    result['samples'][name]['meanApplied']={k:float(np.mean([s['applied'][k] for s in trace])) for k in ['MacroAmplitude','Energy','InertialHit']}
    result['samples'][name]['trace']=trace
(evidence/'flow-recordings.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'videos':str(local),'gifBytes':gif.stat().st_size,'twoSecondDifference':differences},ensure_ascii=False))
