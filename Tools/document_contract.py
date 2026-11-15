"""Generate the reviewable contract table from the runtime JSON, without changing it."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
c=json.loads((ROOT/'Assets/QingTian/Data/parameter-contract.json').read_text(encoding='utf-8'))
def fmt(v):return ', '.join(f'{x:.6g}' for x in v)
def driver(n):
    if n=='MasterGain':return '开头8s渐入 / 265.54s后渐出'
    if n=='FlowerForm':return '章节基准 + 句包络/成形权重'
    if n=='DustTargetCount' or n in ('LightScaleA','LightScaleB'):return '章节基准 + 句包络微调'
    if n.startswith('LightGain') or n in ('DustGain','BokehGain'):return '章节基准 + RMS + BeatPulse'
    if n=='FiberWidth':return '章节基准 + 低频 + BeatPulse'
    if n=='NoiseAmp':return '章节基准 + 高频'
    if n=='RainSpeed':return '章节基准 + 低频'
    return '章节/锚点连续插值'
lines=['# 运行时参数合同 1.2','','本表由 `Tools/document_contract.py` 从 [parameter-contract.json](../Assets/QingTian/Data/parameter-contract.json) 自动生成。实现与最终决定以 [DEVELOPMENT.md](../DEVELOPMENT.md) 为准。',
'','52个视觉参数名 / 82个标量分量；另有6层深度配置和9个原始/编排信号。C1–C4锚点分别为56.80 / 93.61 / 155.41 / 264.05秒。',
'','## 类型、单位和输出边界','','- 名称大小写必须一致；VFX Blackboard属性需勾选Exposed。所有TargetCount都是Float目标数，M2通过存活率/固定池处理；不要逐帧重设图容量。',
'- Center、Scale、Gap、宽度/尺寸均沿用风格帧的0–1屏幕归一化坐标。参考图原点左上，x向右、y向下；M2将y翻转并投影到世界平面。角度单位为度；运动速度/深度为设计归一化单位，不能当作已经测得的米/秒。',
'- Color来自原sRGB HEX的线性RGBA转换，alpha=1。VFX桥使用Vector4传值，避免重复做gamma转换。',
'- 最终视觉值为限幅后的慢基准+中偏移+快偏移。距最近锚点0.85秒以内，偏移乘五次平滑权重；锚点处偏移严格为0，最终值直接取同一份Float预设。',
'- 原始RMS/频带/时钟始终真实，不在锚点伪造信号。FlowPhase是FlowSpeed的累计积分，用于后续持续运动；它不属于静态图预设。','',
'## 视觉参数','','| 名称 | 类型 | 最小值 | 最大值 | C1 | C2 | C3 | C4 | M1驱动 |','|---|---|---|---|---|---|---|---|---|']
for p in c['parameters']:lines.append('| '+' | '.join([p['name'],p['kind'],fmt(p['minimum']),fmt(p['maximum'])]+[fmt(v) for v in p['presets']]+[driver(p['name'])])+' |')
lines+=['','## 逐层附加输出','','这些值按章节基准插值，桥接时选择目标层；每张图只收到自己的LayerDepth / LayerDepthJitter。','', '| 层 | LayerDepth C1/C2/C3/C4 | LayerDepthJitter C1/C2/C3/C4 |','|---|---|---|']
for layer in c['layers']:lines.append(f"| {layer['layer']} | {fmt(layer['LayerDepth'])} | {fmt(layer['LayerDepthJitter'])} |")
lines+=['','## 原始和编排信号','','| 名称 | 类型/范围 | 来源 |','|---|---|---|',
'| SongTime | Float桥接；内部Double，0–269.747s | DSP排程，不累计deltaTime |',
'| FlowPhase | Float桥接；内部Double，非循环累计值 | FlowSpeed的预积分，seek可重现 |',
'| ChapterBlend | Vector4，分量0–1、和为1 | 四锚点五次平滑插值；当前章节标签另按时间线区间判定 |',
'| LyricEnvelope | Float，0–1 | 每句起止与成形/半成形权重；句间为0 |',
'| BeatPulse | Float，0–1 | 原136序列phase0隔拍；40ms预起、180ms平滑释放 |',
'| Rms01 | Float，0–1 | AudioSource.GetOutputData，当前声道0的1024样本RMS |',
'| Low01 | Float，0–1 | 实时2048频谱，30–250Hz能量 |',
'| High01 | Float，0–1 | 实时2048频谱，2–10kHz能量 |',
'| Onset01 | Float，0–1 | 连续帧正向频谱变化；不是乐器/情绪识别 |',
'','快层采用固定整曲p97校准、attack 30ms / release 180ms平滑与0–1限幅。Onset01本轮只显示并预留输出，不强行给每次起音添加闪光。6个LayerDepth表项有明确名字；不存在手套接口。',
'','## 桥接状态','','[VfxParameterBridge.cs](../Assets/QingTian/Runtime/VfxParameterBridge.cs)已编译，按合同类型写入VisualEffect的匹配属性。M1场景不挂桥、不创建VisualEffect；真实图属性绑定与粒子效果必须在M2另做验收。缺少属性时跳过写入，M2建图时逐项核对Blackboard。','']
(ROOT/'Docs/参数合同.md').write_text('\n'.join(lines),encoding='utf-8')
print('Contract documentation generated.')
