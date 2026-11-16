"""Build the current report from measured evidence; old macro proofs stay historical."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def read(name): return json.loads((root/'evidence'/name).read_text(encoding='utf-8-sig'))
style=read('style-comparison.json');live=read('flow-recordings.json');full=read('full-song-playback.json')
original=read('full-song-original-quality.json');gpu=read('gpu-state-validation.json');browser=read('browser-validation.json');backup=read('video-export.json')
assert full['passed'] and gpu['passed'] and browser['passed']
lines=['# 图像采样版：主体流动重做与风格帧对比','',
'2026-11-16。本报告对应当前 GPU 持续输运实现。工程验证、实际截图和录像已完成；动作质感是否满足用户参考视频，仍待用户与审阅者确认。旧 `macro-motion-*` 数据属于改前历史，不作为本次通过依据。','',
'## 先看前后与音频作用','',
'- GitHub 可直接看 [无声前后预览](evidence/前后对比_无声.gif)，8 秒、20fps、有损压缩，仅用于观察动作，不作为实时帧率证据。',
'- 本机含音频并排实录：`LocalOnly/flow-rework-20261116/前后对比_同段副歌.mp4`，10 秒。改前基线 `5eaf0fa`，改后使用相同音乐段落与响应强度 1×，按歌曲时刻对齐。',
'- [本地验收页](http://127.0.0.1:47841/review.html) 包含音频开关、主歌/副歌、隐藏细点和 C2 锚点经过的独立视频。音轨只保留一条，避免左右两路叠音。',
'- 三秒编码预热在输出中裁掉；逐个探测实录的起点与视频时长，避免录屏最初只有音频、没有视频的问题。','',
'## 四个精确锚点','',
'全部关闭参考叠图，以 1672×941 原画质直接截取 WebGL。使用原风格帧拆解中的相同 ROI、线性亮度阈值和黑隙测量方法。相似度来自被授权的图像采样，不是无参考生成；输出并非文件字节相同。','',
'| 锚点 / 秒 | 暗部：参考 → 实际 | 两光中心最大 UV 偏差 | 黑隙宽：参考 → 实际 | RGB 平均绝对差 / 255 |',
'|---|---:|---:|---:|---:|']
for i,t in enumerate([56.8,93.61,155.41,264.05],1):
    k=f'C{i}';r=style[k];a=r['reference'];b=r['render'];e=r['error']
    lines.append(f"| [{k} / {t:.2f}](evidence/{k}_左右对比.png) | {a['dark_pct']:.5f}% → {b['dark_pct']:.5f}% | {max(e['center_distance_uv']):.8f} | {a['gap']['width_w']:.7f}W → {b['gap']['width_w']:.7f}W | {e['mean_absolute_rgb_255']:.6f} |")
lines += ['',f"四张平均像素差的最大值为 **{max(v['error']['mean_absolute_rgb_255'] for v in style.values()):.6f}/255**；两光颜色、完整中心坐标和局部最大像素差见 [style-comparison.json](evidence/style-comparison.json)。这不证明锚点前后过渡已经获得审美认可；另有 91–97 秒连续经过 C2 的实际录制。",'',
'## 实际运动与因果证据','',
'| 检查 | 证据与解释 |','|---|---|',
'| 同曲音频开 / 关 | 105 秒起的两个 10 秒实际播放；关闭仍播放歌曲与基础流动，开启增加真实音频推力、亮度和波前；见验收页。 |',
'| 两秒后的相对变化 | [主体两秒对比](evidence/主体_相隔2秒.png)，来自同一次实录，不是分别 seek 后拼接。 |',
'| 主歌 / 副歌 | 40–50 秒与 105–115 秒实录；曲式标签沿用原工作数据。左右并排视频采用副歌音轨，独立原片可分别听。 |',
'| 隐藏细点后仍运动 | [柔光主体两秒对比](evidence/无细点_相隔2秒.png) 与 10 秒视频；P 关闭细亮纹理和细丝自由绘制，柔光雾与雨保留。 |',
'| 位置确实在 GPU 积分 | 直接回读 RGBA32F 状态，验证位置/年龄变化、暂停保持状态、输出尺寸改变不重置模拟。 |','',
f"GPU 因果测试采用固定输入 RMS=0.8、低频=0.6、高频=0.5，比较 105–107 秒的同一批未重生材料样本：开启时平均位移 **{gpu['on']['meanDistancePx']:.2f}px**，关闭时 **{gpu['off']['meanDistancePx']:.2f}px**，约 **{gpu['on']['meanDistancePx']/gpu['off']['meanDistancePx']:.2f} 倍**。这是受控工程测试，不冒充歌曲实录的全画面光流速度。两侧位移向量不同，说明模拟不是全体同一个平移；详见 [GPU 回读](evidence/gpu-state-validation.json)。",'',
'截图的像素差同时受亮度、密度和形变影响，不能当作粒子速度。完整实时输入与实际运动参数轨迹见 [flow-recordings.json](evidence/flow-recordings.json)。','',
'## 帧率、整曲和操作','',
'同一台 Windows 笔记本、Chrome headless、Intel Arc 硬件 WebGL2。以下是 requestAnimationFrame 的实际帧间隔统计，不把 MP4 的 60fps 容器格式当作实时渲染帧率。','',
'| 实测 | 分辨率 | 平均 fps | p95 帧间隔 | p99 帧间隔 |','|---|---|---:|---:|---:|']
for name,record in [('整曲：默认流畅档',full),('整曲：原画质',original)]:
    s=record['stats'];lines.append(f"| {name} | {'×'.join(map(str,s['resolution']))} | {s['meanFps']:.2f} | {s['p95ms']:.2f}ms | {s['p99ms']:.2f}ms |")
names={'before-final':'改前同段实录','after-final':'改后同段实录','audio-off':'关闭音频驱动','verse':'主歌实录','body-only':'隐藏细点实录','anchor-pass':'C2 锚点经过实录'}
for k,name in names.items():
    s=live['samples'][k]['stats'];lines.append(f"| {name} | {'×'.join(map(str,s['resolution']))} | {s['meanFps']:.2f} | {s['p95ms']:.2f}ms | {s['p99ms']:.2f}ms |")
lines += ['',f"默认流畅档完整实播 **0 → 269.747 秒**，经过四章、时钟单调、没有意外暂停、结尾停止，页面错误 {len(full['errors'])}。记录了 {full['featureSamples']} 组实时声学样本，重采样为 20Hz 标量缓存供离线导出。",'',
'**未达到全程锁定 60fps，仍有长帧。** 原画质的密集锚点重建更吃性能，现场默认 1280 宽；需要精细对照时切原画质。该结果不能保证其他硬件或多程序同时占用 GPU 时的最低帧率。整曲备份用于现场兜底。','',
'18 项 Node 测试通过：保留四锚点 52 参数 / 82 分量精确值、时间线边界与句节拍测试，新增持续穿行、几何插值、onset、雨路程积分、音频开关和暂停/seek 测试。[TAP](evidence/unit-tests.tap)。浏览器验证包括播放、暂停、拖动、C3、全屏、隐藏 UI、参考叠图、透明度、画质切换和窄屏布局，[结果](evidence/browser-validation.json)。','',
'## 备份与发布边界','',
f"- 当前本地备份：`LocalOnly/晴天_整曲备份.mp4`，**{backup['width']}×{backup['height']} / {backup['fps']}fps**，{backup['outputFrames']:,} 帧，同一 GPU 渲染器固定步长导出，H.264 + AAC；编码与时长见 [探测记录](evidence/video-export.json)。",
'- 视频使用完整实播采集的声学标量；交互演出使用实时测量，细部轨迹不宣称逐帧相同。',
'- 改前源码、证据与原整曲备份保存在 `LocalOnly/flow-rework-20261116/`，可回退和比较。',
'- 公开仓库只放代码、图片、无声 GIF 与数值证据；原曲、含原曲实录、编码中间文件、完整歌词均不提交。','',
'## 实现边界与待审阅事项','',
'当前是图像引导的 2.5D 材料输运，不是真实三维烟体或完整流体方程。262,144 个独立 GPU 状态与 1,573,352 个锚点细节采样分开；不是 157 万独立求解粒子，也没有“复杂度不受硬件限制”的承诺。部分景深、散景和花的细节仍来自参考采样。','',
'需要审阅的是主体的动作质感、音乐冲击强度、雾和细丝比例，以及锚点附近是否还有吸回或变清晰的观感。测试通过与截图相似不代替这些审美判断；下一轮按用户反馈改，Unity 迁移仍等待用户确认后的 Web 动作剧本。','']
(root/'风格帧对比报告.md').write_text('\n'.join(lines),encoding='utf-8')
print('Wrote measured flow report.')
