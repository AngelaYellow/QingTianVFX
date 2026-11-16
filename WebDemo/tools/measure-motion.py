"""Use actual recorded frames. Blur suppresses glints; this is image change,
not a claimed optical-flow speed or a perceptual quality score."""
from pathlib import Path
import json, subprocess
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
clips=json.loads((root/'evidence/macro-motion-recordings.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
def frames(file, fps=10):
    p=subprocess.run(['ffmpeg','-v','error','-i',file,'-vf',f'fps={fps},scale=418:235','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True,check=True)
    return np.frombuffer(p.stdout,dtype=np.uint8).reshape(-1,235,418,3)
def shot(file,sec,name):
    path=root/'evidence'/name
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(sec),'-i',file,'-frames:v','1',str(path)],check=True)
    return Image.open(path).convert('RGB')
def board(images,labels,name):
    w,h=images[0].size
    out=Image.new('RGB',(w*2+24,h+84),'#0b1418');d=ImageDraw.Draw(out)
    for i,(im,label) in enumerate(zip(images,labels)):
        d.text((i*(w+24)+20,20),label,font=font,fill='#d4e7ea');out.paste(im,(i*(w+24),64))
    out.save(root/'evidence'/name)
results=[]
for c in clips:
    arr=frames(c['file']).astype(np.float32)/255
    # At quarter resolution sigma 3 corresponds to 12 px at the source.
    soft=gaussian_filter(arr,sigma=(0,3,3,0))
    delta=np.abs(np.diff(soft,axis=0)).mean(axis=(1,2,3))*255
    phase=np.array([x['phase'] for x in c['trace']]);t=np.array([x['time'] for x in c['trace']])
    results.append({'name':c['name'],'frames_10hz':len(arr),'soft_image_change_per_100ms_255':float(delta.mean()),'soft_image_change_p95_255':float(np.percentile(delta,95)),'phase_units_per_second':float((phase[-1]-phase[0])/(t[-1]-t[0])),'mean_macro_amplitude':float(np.mean([x['MacroAmplitude'] for x in c['trace']])),'small_point_draws':c['smallPointDrawCount']})
    first=shot(c['file'],0,c['name']+'_0s.png');second=shot(c['file'],2,c['name']+'_2s.png')
    board([first,second],[f"{c['name']} · {c['actualStart']:.2f} s",f"同一连续实录 · {c['actualStart']+2:.2f} s"],c['name']+'_间隔2秒.png')
results={'method':'Actual 10 Hz decoded live recordings, RGB mean absolute temporal change after 12px-equivalent blur. Not optical-flow speed; brightness also contributes.','clips':results,'audio_on_off_image_change_ratio':results[0]['soft_image_change_per_100ms_255']/results[1]['soft_image_change_per_100ms_255'],'chorus_verse_image_change_ratio':results[0]['soft_image_change_per_100ms_255']/results[2]['soft_image_change_per_100ms_255']}
board([Image.open(root/'evidence/01_副歌_音频开_2s.png'),Image.open(root/'evidence/02_副歌_音频关_2s.png')],['同段副歌 · 音频驱动开','同段副歌 · 音频驱动关'],'音频开关_实际录像对比.png')
(root/'evidence/macro-motion-metrics.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
