"""Freeze Unity's own full-song p97 measurement; run after a completed calibration pass."""
from pathlib import Path
import json,numpy as np
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'Docs/Evidence'
measurement=json.loads((out/'live-audio-measurements.json').read_text(encoding='utf-8'))
rows=np.array(measurement['rows'])
assert rows[0,0]<.2 and rows[-1,0]>269.5 and len(rows)>5000,'Incomplete real-time pass'
normalization=np.maximum(np.percentile(rows[:,1:],97,axis=0),1e-7)
(ROOT/'Assets/QingTian/Data/audio-live-normalization.json').write_text(json.dumps(normalization.tolist(),indent=2),encoding='utf-8')
report={'method':'p97 of full real-time Unity AudioSource.GetOutputData/GetSpectrumData; pitch 1, target 30fps, channel 0','columns':measurement['columns'][1:],'normalization':normalization.tolist(),'sampleCount':len(rows),'timeRange':[float(rows[0,0]),float(rows[-1,0])],'outputSampleRate':measurement['outputSampleRate'],'window':measurement['window'],'spectrumSize':measurement['spectrumSize'],'rawClippedFractionAtP97':(rows[:,1:]>normalization).mean(axis=0).tolist(),'note':'Fixed per-song calibration, not automatic per-frame gain. Recalibrate if FFT size/output sample rate or musical source changes.'}
(out/'live-audio-calibration.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(out/'calibration-playback.json').write_bytes((out/'full-song-playback.json').read_bytes())
print(json.dumps(report,indent=2))
