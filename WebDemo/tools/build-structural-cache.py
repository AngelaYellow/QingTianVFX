"""Create structural material without tiny bright points for the required ablation.
The original images are retained unchanged for ordinary mode / anchor matching.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
root=Path(__file__).resolve().parents[1]
(root/'data/structure').mkdir(exist_ok=True)
for i in range(1,5):
    rgb=np.asarray(Image.open(root/f'references/C{i}.png').convert('RGB'),dtype=np.float32)/255
    blur=gaussian_filter(rgb,sigma=(2.8,2.8,0))
    Image.fromarray(np.uint8(np.clip(blur,0,1)*255+.5)).save(root/f'data/structure/C{i}.png')
source=json.loads((root.parent/'Assets/QingTian/Data/timeline-source.json').read_text(encoding='utf-8'))
sections=source['form_sections']
(root/'data/form-sections.json').write_text(json.dumps({'source':'Assets/QingTian/Data/timeline-source.json form_sections only; no lyrics','status':'Original working labels, pending listening audit','sections':sections},ensure_ascii=False,indent=2),encoding='utf-8')
print('Built four structural materials and imported form-section timing without lyrics.')
