"""Bijective point correspondences: exact reference coverage at every anchor.

Match regions (flower, light A, light B) with equal-mass spatial partitions.
Every source pixel occurs exactly once at anchors. Smooth transport maps are
separate, and do not change the exact reference reconstruction.
"""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

root=Path(__file__).resolve().parents[1]
out=root/'data/correspondence';out.mkdir(exist_ok=True)
contract=json.loads((root/'data/parameter-contract.json').read_text(encoding='utf-8'))
params={p['name']:p['presets'] for p in contract['parameters']}
records=[]
orders=[]

for frame in range(4):
    image=Image.open(root/f'references/C{frame+1}.png').convert('RGB')
    rgb=np.asarray(image).astype(np.float32)/255
    h,w=rgb.shape[:2];n=w*h
    yy,xx=np.mgrid[0:h,0:w];x=(xx.ravel()+.5)/w;y=(yy.ravel()+.5)/h
    a=np.array(params['LightCenterA'][frame]);b=np.array(params['LightCenterB'][frame]);f=np.array(params['FlowerCenter'][frame])
    sa=np.array(params['LightScaleA'][frame]);sb=np.array(params['LightScaleB'][frame])
    flower_count=round(n*.026);a_count=round((n-flower_count)*.5)
    flower_distance=(x-f[0])**2+((y-f[1])*h/w)**2
    flower_ids=np.argpartition(flower_distance,flower_count)[:flower_count]
    available=np.ones(n,bool);available[flower_ids]=False;remaining=np.flatnonzero(available)
    da=((x-a[0])/sa[0])**2+((y-a[1])/sa[1])**2
    db=((x-b[0])/sb[0])**2+((y-b[1])/sb[1])**2
    split=np.argpartition((da-db)[remaining],a_count)
    groups=[flower_ids,remaining[split[:a_count]],remaining[split[a_count:]]]
    ordered=[]
    for ids,center,scale in zip(groups,[f,a,b],[np.array([.08,.12]),sa,sb]):
        # Equal-mass spatial partitions preserve neighbouring material. Sorting
        # on brightness independently had shredded fine strands during morphs.
        def partition(points,depth=0):
            if len(points)<=8:
                return points[np.lexsort((y[points],x[points]))]
            values=x if depth%2==0 else y
            mid=len(points)//2
            split=np.argpartition(values[points],mid)
            return np.concatenate([partition(points[split[:mid]],depth+1),partition(points[split[mid:]],depth+1)])
        ordered.append(partition(ids))
    order=np.concatenate(ordered)
    orders.append(order)
    assert len(np.unique(order))==n
    # Opaque alpha avoids browser PNG premultiplication losing data in RGB.
    packed=np.stack([order&255,(order>>8)&255,(order>>16)&255,np.full(n,255)],axis=1).astype(np.uint8).reshape(h,w,4)
    path=out/f'C{frame+1}.png';Image.fromarray(packed).save(path)
    records.append({'frame':frame+1,'width':w,'height':h,'count':n,'groups':[len(g) for g in groups],'bijection':True,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    print(json.dumps(records[-1]),flush=True)
(out/'manifest.json').write_text(json.dumps({'method':'region + equal-mass alternating-axis spatial correspondence; RGB8 packs the 24-bit source pixel index, opaque alpha; each anchor is a pixel permutation','frames':records},indent=2),encoding='utf-8')

# Exact correspondences necessarily contain discrete cuts. Only the transport
# field is regularised on the first frame's material neighbourhood. Anchor
# rendering always uses the untouched bijective maps above.
base=orders[0]
labels=np.zeros(n,np.int8);labels[base[:flower_count]]=1;labels[base[flower_count:flower_count+a_count]]=2;labels[base[flower_count+a_count:]]=3
for frame,order in enumerate(orders):
    target=np.stack([(order%w+.5)/w,(order//w+.5)/h],axis=1)
    if frame:
        material=np.zeros((n,2),np.float32);material[base]=target
        regularised=np.zeros_like(material)
        for group in [1,2,3]:
            mask=(labels.reshape(h,w)==group).astype(np.float32)
            weight=gaussian_filter(mask,12)
            for axis in range(2):
                value=gaussian_filter(material[:,axis].reshape(h,w)*mask,12)/np.maximum(weight,1e-6)
                regularised[:,axis][labels==group]=value.ravel()[labels==group]
        target=regularised[base]
    q=np.rint(np.clip(target,0,1)*4095).astype(np.int64);code=q[:,0]+q[:,1]*4096
    packed=np.stack([code&255,(code>>8)&255,(code>>16)&255,np.full(n,255)],axis=1).astype(np.uint8).reshape(h,w,4)
    Image.fromarray(packed).save(out/f'C{frame+1}-transport.png')
    print(f'transport {frame+1}',flush=True)
