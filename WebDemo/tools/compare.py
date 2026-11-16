"""Measure original PNGs and actual WebGL captures with the same ROI/thresholds.
No retouching: comparisons contain unmodified images plus labels outside artwork.
"""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Docs/Plan/风格帧拆解/测量结果.json'
rois = json.loads(SOURCE.read_text(encoding='utf-8'))
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 26)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 21)

def measure(path, spec):
    im = Image.open(path).convert('RGB')
    rgb = np.asarray(im, dtype=np.float64)/255
    linear = np.where(rgb <= .04045, rgb/12.92, ((rgb+.055)/1.055)**2.4)
    y = linear @ np.array([.2126,.7152,.0722])
    h,w = y.shape
    blur = gaussian_filter(y, 12)
    centers=[];colors=[]
    for light in spec['lights']:
        x0,y0,x1,y1=light['roi_uv']; a,b,c,d=int(x0*w),int(y0*h),int(x1*w),int(y1*h)
        weights=np.maximum(blur[b:d,a:c]-.01,0)
        yy,xx=np.mgrid[b:d,a:c]
        centers.append([float((xx*weights).sum()/weights.sum()/w),float((yy*weights).sum()/weights.sum()/h)])
        color=(rgb[b:d,a:c]*weights[:,:,None]).sum(axis=(0,1))/weights.sum()
        colors.append({'srgb':color.tolist(),'hex':'#'+''.join(f'{int(round(v*255)):02X}' for v in color)})
    a,b=np.array(centers); distance=math.sqrt((b[0]-a[0])**2+((b[1]-a[1])*h/w)**2)
    u=np.linspace(0,1,2001);points=a[None,:]+u[:,None]*(b-a)[None,:]
    profile=map_coordinates(gaussian_filter(y,2),[points[:,1]*h,points[:,0]*w],order=1,mode='nearest')
    mask=(profile<.015)&(u>=.15)&(u<=.85)
    changes=np.diff(np.r_[False,mask,False].astype(int));starts=np.flatnonzero(changes==1);ends=np.flatnonzero(changes==-1)-1
    gap={'width_w':0.,'center_uv':None}
    if len(starts):
        index=int(np.argmin(np.abs((u[starts]+u[ends])*.5-.5)));s,e=starts[index],ends[index]
        gap={'width_w':float((u[e]-u[s])*distance),'center_uv':((points[s]+points[e])*.5).tolist()}
    return {'dark_pct':float((y<.01).mean()*100),'mean_linear_y':float(y.mean()),'centers_uv':centers,'colors':colors,'gap':gap},im,rgb

results={}
for i in range(1,5):
    name=f'C{i}';ref,im,rgb=measure(ROOT/f'references/{name}.png',rois[name]);actual,shot,out=measure(ROOT/f'evidence/{name}_实际锚点.png',rois[name])
    errors={'dark_percentage_points':actual['dark_pct']-ref['dark_pct'],
            'center_distance_uv':[math.dist(a,b) for a,b in zip(ref['centers_uv'],actual['centers_uv'])],
            'gap_width_w':actual['gap']['width_w']-ref['gap']['width_w'],
            'color_rgb_distance':[float(np.linalg.norm(np.array(a['srgb'])-b['srgb'])*255) for a,b in zip(ref['colors'],actual['colors'])],
            'mean_absolute_rgb_255':float(np.abs(rgb-out).mean()*255),'max_absolute_rgb_255':float(np.abs(rgb-out).max()*255)}
    results[name]={'reference':ref,'render':actual,'error':errors,'overlay_enabled':False,'capture_size':list(im.size)}
    w,h=im.size;canvas=Image.new('RGB',(w*2+24,h+150),'#0B1418');draw=ImageDraw.Draw(canvas)
    draw.text((20,18),f'{name} 定稿风格帧',font=font,fill='#D4E7EA');draw.text((w+44,18),f'{name} WebGL 实际锚点 · 对照叠图关闭',font=font,fill='#D4E7EA')
    canvas.paste(im,(0,66));canvas.paste(shot,(w+24,66))
    line=f"暗部 {ref['dark_pct']:.2f}% → {actual['dark_pct']:.2f}%    黑隙 {ref['gap']['width_w']:.5f}W → {actual['gap']['width_w']:.5f}W    像素平均绝对差 {errors['mean_absolute_rgb_255']:.3f}/255"
    draw.text((20,h+89),line,font=small,fill='#ABC8CF')
    canvas.save(ROOT/f'evidence/{name}_左右对比.png')
(ROOT/'evidence/style-comparison.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v['error'] for k,v in results.items()},ensure_ascii=False,indent=2))
