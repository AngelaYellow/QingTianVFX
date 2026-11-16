# QingTianVFX ·《晴天》M1 参数演出

独立 Unity 6.3 URP 工程。M1“没有粒子、整曲音乐连续驱动参数”已完成；当前正在合作搭M2，用户已看到两团VFX光。2026-11-16修正：先让主体持续流动、伸展和变形，再叠雾片细节；四张风格帧只是经过的瞬间。新版[教学方案](Docs/M2形体运动教学方案.md)与[M1迁移清单](Docs/M1旧设计审计与形体运动迁移.md)已写好，运行时动作尚未迁移，Unity以用户确认后的Web动作剧本为准。每次开发先读 [DEVELOPMENT.md](DEVELOPMENT.md)，它记录最终状态、测试证据和待确认事项。

公开仓库：[AngelaYellow/QingTianVFX](https://github.com/AngelaYellow/QingTianVFX)。原曲及含原曲的核对音频仅保存在本机。

## 醒来后，按这个顺序验收

1. 双击根目录 **打开工程.cmd**，或在 Unity Hub 添加本目录，用 **6000.3.28f1** 打开。
2. 打开 `Assets/QingTian/Scenes/M1_ParameterPerformance.unity`。若已经打开该场景，直接继续。
3. 点击 Unity 顶部 **Play**。原曲从 0 开始，完整播放到 **269.747 秒**，最后停住，不循环。若 Game 视图较小，选菜单 **QingTian → 3 - Show Game view** 放大。
4. 看左侧章名、时间、歌词意象转述、成形标签、置信度；下方显示慢 / 中 / 快三层信号。看右侧参数合同：**慢基准 + 中偏移 + 快偏移 → 最终输出**；可滚动和按英文名搜索。预览窗口保持黑色，因为 M1 还没有粒子。
5. 点击面板 **暂停 / 播放**、**从头重播**，拖动进度条，检查音乐和时间是否一起移动。空格暂停/继续，R 重播；如果搜索框正在输入，先点击空白区域再用快捷键。
6. 点击 **锚点 C1–C4**：暂停到 **56.80 / 93.61 / 155.41 / 264.05 秒**。此时全部最终视觉参数逐项等于相应预设，中快偏移为零。实时音频原始信号不受“预设匹配”篡改。
7. 点击预览下方 **C1–C4** 切换参考图，拖动 **透明度** 从 0 到 1。参考图明确标为“参考图片，不是实时粒子”。设为 0 就回到纯黑窗口。
8. 听 [68 BPM 核对音频](LocalEvidence/QingTian_68BPM_review.mp3)：原速整曲叠短滴声，采用原 136 节拍序列第 0、2、4… 个点。它跟随原检测时间的细微浮动，不是重新拉直的机械节拍器。请确认这组相位的重拍感。

`LocalEvidence` 只在这台电脑存在，不在公开仓库中。实际录屏与截图路径、最终测试成绩见 DEVELOPMENT.md 的验收表。

## 看证据

- [整曲参数曲线](Docs/Evidence/整曲参数曲线.png)、[四锚点局部曲线](Docs/Evidence/四锚点局部曲线.png)、[全部参数热图](Docs/Evidence/全部参数热图.png)。曲线由与播放器相同的 C# 演算器导出；使用确定性音频特征缓存，实时播放的微扰会有所不同。
- [连续性报告](Docs/Evidence/continuity-report.json)：52 个视觉参数名、82 个标量分量，包含关键时刻精确误差与章/句/节拍边界检查。
- [整曲实播报告](Docs/Evidence/full-song-playback.json)：真实 DSP 时间、音频样本时钟偏差、渲染帧与四锚点越过记录。普通帧可能跨过指定小数秒；精确锚点求值和帧采样偏差分别记录，不假称每个关键时刻都落在显示器刷新时刻。
- [命令行测试汇总](Docs/Evidence/cli-test-summary.json) 与 EditMode / PlayMode XML。
- [编辑器窗口截图](Docs/Evidence/M1_editor_window.png)、[本机18秒实播录屏](LocalEvidence/M1_editor_live.mp4)。录屏无声，听音乐请用Unity现场或68 BPM核对音频；录屏不在公开仓库中。
- [运行时参数合同](Docs/参数合同.md)、[技术报告1.2](Docs/Plan/技术报告.md)、[脚手架方案1.2](Docs/Plan/脚手架方案.md)、[风格帧拆解1.2](Docs/Plan/风格帧拆解.md)。

## 重复运行测试与导出

先退出本工程的 Unity 编辑器，双击 **运行测试.cmd**。也可以运行：

```powershell
python Tools/run_tests.py
```

工具依次运行 Unity Test Framework 的 EditMode、PlayMode 套件，验证真实音频导入与播放；任一失败返回非零状态。默认使用本机 `D:/Works/Unity/Editors/6000.3.28f1/Editor/Unity.exe`。其他电脑先将环境变量 `QINGTIAN_UNITY` 指向对应编辑器。

导出曲线：退出 Play Mode，选 **QingTian → 2 - Export full song parameter evidence**，然后运行：

```powershell
python -m pip install -r Tools/requirements-analysis.txt
python Tools/plot_evidence.py
```

`parameters-120hz.csv.gz` 包含全曲每秒120次采样，以及额外插入的四个精确锚点；每个视觉参数均有 slow / mid / fast / final 列，不仅导出面板上当前可见的几行。

## 新电脑 / 新克隆的音频恢复

原曲及其衍生音频不公开。取得同一份有权使用的原始 FLAC 后：

```powershell
python Tools/restore_audio.py "你的原始FLAC绝对路径"
```

需要 ffmpeg。工具先核验 SHA-256，再转为本地 48 kHz 双声道 PCM WAV。进入 Unity 后执行 **QingTian → 1 - Build or repair M1 scene**，重新绑定本地音源。这个菜单会重建 M1 场景，请在后续开始手工搭图后谨慎使用；当前 M1 可以重复生成。

研究输入已随仓库保存。`prepare_inputs.py` 是在原研究目录完整存在时重做输入分析的工具；一般克隆使用 `restore_audio.py` 即可，不需要复制旧 Unity 工程。

## MCP

本工程嵌入 Coplay MCP for Unity 10.3.0，使用独立的 **127.0.0.1:8082**，不会自动重写其他项目的客户端注册。`打开工程.cmd` 启动本机已配置的服务和编辑器，菜单 **QingTian → Connect MCP** 可重连。

本机 MCP Python 环境为 `../.unity-tools/mcp-10.3.0`。其他电脑需按上游 [MCP for Unity](https://github.com/CoplayDev/unity-mcp) 安装对应服务；可以用 `QINGTIAN_MCP_SERVER` 环境变量指定 `mcp-for-unity` 可执行文件。客户端入口 `Tools/mcp_client.py` 需要该环境中的 fastmcp。

## 范围与限制

- M1保持无粒子；M2两团VFX光已由用户实播确认，内部雾形态仍在合作搭建中。不能用参考图叠加评价实际还原程度。
- 歌词句显示意象转述；原时间线 21 句置信度低于 0.65，尚未逐句复听确认。
- 音频归一化按本曲、当前 FFT 和输出采样率校准；改曲或改音频设置需重新测量。
- 先验收 Windows 编辑器与暗幕方案、30 fps 目标。iPhone、AR、手套均属后续阶段。

## M2合作搭建入口

打开菜单 **QingTian → M2 → 1 - Prepare or open M2 scene**，点击Unity顶部Play。M2默认显示纯黑背景上的实时粒子；点击Game黑色区域后按 **F** 切换参数面板，再按F回纯画面，Esc也可返回面板。参数面板保留播放/暂停、进度条、四锚点与风格帧对照；纯画面不显示参考叠图。当前保存图显示两团软光，流动雾HLSL/纹理已准备，尚待用户按指南接入。

用户亲手搭节点，助手负责图外准备，每轮围绕完整成果给6–8步并解释原理。VFX_LightA/B共享同一张图，已完成共用端口。当前操作见[M2流动雾搭建指南](Docs/M2流动雾搭建指南.md)，历史见[M2搭建记录](Docs/M2搭建记录.md)。不要用重建M1菜单覆盖合作成果。
