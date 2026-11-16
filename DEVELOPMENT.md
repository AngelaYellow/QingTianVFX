# QingTianVFX 开发上下文

最后更新：2026-11-16（Asia/Shanghai）。本文件是本工程唯一开发上下文；工程内其他文档与它冲突时，以本文件为准。每次开发先完整阅读，结束时更新真实状态、决定、证据和剩余事项。用户当前指令优先于文档。

## 1. 最终目标与本轮范围

最终在 Windows Unity 编辑器中播放完整《晴天》，VFX Graph 粒子按章节慢变、歌词聚散、节拍和音量运动，经过四张风格帧的视觉状态；以后再做 iPhone（Metal/ARKit）、AR 和手套。

M1基础阶段已完成：独立工程、工程规范、无粒子参数演出，16项命令行测试通过，校准后整曲实播及曲线/截图/录屏已归档。仓库：[AngelaYellow/QingTianVFX](https://github.com/AngelaYellow/QingTianVFX)。

**当前阶段M2：柔光雾与两处光，正在合作搭建，尚未达到视觉验收。** 用户亲手搭VFX Graph；助手负责节点图以外的相机、黑背景、Bloom、坐标换算、贴图、HLSL、桥与场景。按用户最新要求，每次可以教3个明确步骤，收到截图再继续。首个关卡是一个光点跟随LightCenterA；通过后才扩展成粉/青两团雾。M1原场景必须保留；参考叠图不能算实时粒子还原。

## 2. 已确定决定

- 新工程 `D:/Works/智能交互设计/QingTianVFX`；不以 UnityMusicVisuals 为资源或配置基线。
- Unity 6000.3.28f1、URP / VFX Graph 17.3.0；粒子必须使用 VFX Graph，M1保持无粒子，M2只实现雾与两光。
- Windows 编辑器先完成整曲与风格帧级视觉；未来 iPhone 使用 Metal/ARKit。
- 暗幕方案、纯黑背景，先按30fps考虑。
- 名义68 BPM取现有约136 BPM序列第0、2、4…个点（phase0）。保留原检测时刻的细微浮动，音源pitch=1，不拉伸音乐。已生成本地核对音频。
- 关键时刻：56.80、93.61、155.41、264.05秒。
- M1在关键时刻的最终视觉参数必须精确等于该帧预设；时钟/音频原始信号另列，不伪造它们。
- 手套接口本轮不做。
- 创建公开GitHub仓库并推送；原曲、衍生含原曲音频、含原曲录屏不进入公开仓库。无权限则完成本地仓库并写明用户操作。
- M1曾授权独立完成；M2改为用户在场合作，节点图由用户搭、逐步截图确认。助手自主完成图外准备，常规实现决定记录依据。
- M2教学方式：每轮最多3个步骤，每步讲清操作、设置含义、为什么取这个值、预期现象；区分临时验证值与最终雾层参数，帮助用户在搭建中学习原理。

## 3. 架构与数据流

同源音频 → AudioSource / DSP播放时钟 → 当前歌曲时间。
时间线 + 四预设 + 68节拍 → 章节/句包络/慢层。
实时RMS/频段 + 节拍平滑包络 → 快层。
慢层 + 中层偏移 + 快层偏移 → 锚点约束 + 限幅 → 按合同名称输出最终参数。
调试UI显示三个尺度、最终值和原始信号；原图叠加只用于对照，不作为粒子效果。

关键时刻附近平滑减小调制强度，到锚点为零，使最终视觉值精确等于预设；音乐原始信号继续实时测量。动态粒子阶段仍可沿路径持续移动，不把歌曲时钟停住。离散的章/句标签可以切换，连续视觉数值不硬切。

| 实际组件 | 职责与边界 |
|---|---|
| [ScoreModel.cs](Assets/QingTian/Runtime/ScoreModel.cs) | 纯数据SongClock、JSON模型、连续求值、FlowPhase预积分；测试和曲线直接复用同一演算器 |
| [QingTianPlayer.cs](Assets/QingTian/Runtime/QingTianPlayer.cs) | AudioSource/DSP排程、暂停/恢复/seek/重播、实时分析、IMGUI面板、对照图、整曲审计 |
| [VfxParameterBridge.cs](Assets/QingTian/Runtime/VfxParameterBridge.cs) | 按合同类型写VisualEffect；M2增加LightCenterAWorld/BWorld投影输出，原合同Vector2不改；真实图连接待用户完成 |
| [M2Setup.cs](Assets/QingTian/Editor/M2Setup.cs) | 首次复制M1为独立M2，准备相机/RT/Bloom/空VisualEffect与桥；已有M2时仅打开，避免覆盖手工结果 |
| [QingTianSetup.cs](Assets/QingTian/Editor/QingTianSetup.cs) | 打开/重建M1、导入设置、完整参数导出、Game视图入口 |
| [EvidenceActions.cs](Assets/QingTian/Editor/EvidenceActions.cs) | 实际截图、四锚点截图、干净重播、保存后退出以跑CLI测试 |
| [McpBootstrap.cs](Assets/QingTian/Editor/McpBootstrap.cs) | 编辑器就绪后连接本工程MCP；batch模式不自动连接 |

四预设之间用五次平滑插值；第一锚点前保持C1基准，末锚点后保持C4基准。距最近锚点0.85秒内，中快偏移乘平滑权重；锚点处权重为0，最终值直接取同一份Float预设。章节标签按原时间线 `[start,end)` 判断，不在章界硬切基准。

每句前20%渐聚、末尾35%渐散；成形强度1、半成形0.65，句间为0。FlowerForm、两光尺度和星尘目标数受句包络调制；RMS/Beat调光强，低频调纤维宽度和雨速，高频调扰动。Onset01真实显示并输出，本轮未额外映射成闪光。BeatPulse为40ms预起、180ms平滑释放；实时音频attack 30ms/release 180ms。MasterGain前8秒渐入，265.54秒后渐出，终点为0。

精确求值不意味着指定小数秒恰好落在显示器刷新时刻。普通播放跨越锚点时，分别记录精确评估与实际帧偏差；“锚点C1–C4”按钮暂停到精确时间供核对。后续GPU粒子状态是否还原，必须在M2重新验收。

音频使用48kHz双声道PCM、DecompressOnLoad、非循环2D AudioSource。主时钟来自DSP，不累计deltaTime；播放/恢复提前100ms排程，暂停和恢复等待期保持参数。源文件精确长度269.747208333秒；演出逻辑遵循用户终点269.747秒，相差0.208毫秒，完整源数据保留，无开头裁切或速度变化。

实时FFT为2048频谱、BlackmanHarris窗，RMS取1024输出样本，声道0，按实际输出采样率积分30–250Hz与2–10kHz。固定归一化来自一次Unity整曲实测p97，[校准报告](Docs/Evidence/live-audio-calibration.json)记录当前48kHz输出条件。50Hz `audio-features.json`仅作离线确定性曲线/测试，默认 `useCachedFeatures=false`。两种FFT标度不同，分别校准；更换音源、FFT或输出采样率须重校准。动态切换音频设备本轮未验收。

## 4. 目录规范

- `Assets/QingTian/Runtime`：本项目运行时代码。
- `Assets/QingTian/Editor`：本项目编辑器工具。
- `Assets/QingTian/Tests/EditMode`、`Tests/PlayMode`：有独立asmdef的测试。
- `Assets/QingTian/Scenes`、`Data`、`Settings`、`ReferenceFrames`：项目场景、参数/时间线、管线配置、风格帧。
- `Assets/QingTian/Audio/LocalOnly`：被Git忽略的本地原曲导入；用准备工具从用户文件补齐。
- `Assets/Template`：官方URP模板资产，保留.meta引用，与自有资源分开。
- `Assets/Samples`：后续由Package Manager按需导入的样例；M1没有导入粒子样例。
- `Packages`：Unity包与第三方MCP；必要兼容修正须留来源、版本、License与补丁说明。
- `Docs/Plan`：方案1.2及引用附件。`Docs/Evidence`：可公开的测试、参数图和无版权音频的截图。
- `LocalEvidence`：含原曲的核对音频、短录屏等本地验收材料，Git忽略。
- `Tools`：准备音源、MCP连接、测试、证据导出和启动工具。
- `Library/Temp/Logs/UserSettings`：生成或本机数据，Git忽略。

自有资源与.meta成对管理；不复制旧工程业务资产，不在包缓存里改源码。版本化文本使用UTF-8。仅按需增目录；不预造粒子层。

## 5. 参数合同与输入

运行时合同：[parameter-contract.json](Assets/QingTian/Data/parameter-contract.json)；可读表格：[Docs/参数合同.md](Docs/参数合同.md)。共52个视觉参数名、82个标量分量、6层深度配置；名称、类型、范围、四组数值均在合同中。颜色由源sRGB HEX转换线性RGBA，TargetCount为Float目标数；坐标原点左上、x向右/y向下，M2再转换到世界坐标。

统一索引：[技术报告1.2](Docs/Plan/技术报告.md)、[脚手架方案1.2](Docs/Plan/脚手架方案.md)、[风格帧拆解1.2](Docs/Plan/风格帧拆解.md)、[文档迁移核对](Docs/Plan/风格帧拆解/文档迁移核对.json)。原研究归档的三文档同步升级为1.2；两处54个本地链接有效，11份测量JSON/PNG的SHA与归档一致，四章各51个原预设字段未改值。

输入源为 `../cross-sensory-live-music/experiments/experiment-v2` 的timeline、四帧与测量预设；原曲SHA-256为 `0c1a866751042dae234794a45736c52c13a89994da9fccea838cc91ede2d8511`。原时间线、预设、136节拍列均在Data保留来源副本。实现只建一个Camera与一个M1控制器，不按概念方案预造空管理器；左右分屏/参考线、Solo层、冻结三层开关留待M2按需实现，本轮C1–C4叠图和透明度已经完成。

## 6. 阶段计划与验收状态

| 项目 | 状态 | 证据 |
|---|---|---|
| 新建独立URP工程 / VFX依赖 | 完成 | [工程设置](Docs/Evidence/project-setup.json)、Packages/manifest.json与packages-lock.json |
| MCP实际连接正确工程 | 完成 | [MCP项目回读](Docs/Evidence/mcp-project-info.json)的根路径与本工程逐字一致，实例QingTianVFX@d89143d0cddfcc7b |
| 方案1.2与工程规范 | 完成 | 本文件、AGENTS.md、Docs/Plan及迁移核对 |
| 68 BPM相位选择与核对音频 | 完成，待复听 | [相位分析](Docs/Evidence/beat-phase-analysis.json)、Data/beats68.json；本地LocalEvidence/QingTian_68BPM_review.mp3 |
| M1整曲参数演出 | 完成 | [最终整曲实播](Docs/Evidence/full-song-playback.json)、[首次校准实播](Docs/Evidence/calibration-playback.json) |
| 时钟/暂停恢复/重播/seek/章句/范围/锚点测试 | CLI 16/16通过，0跳过 | [汇总](Docs/Evidence/cli-test-summary.json)、[14项EditMode](Docs/Evidence/editmode-results.xml)、[2项PlayMode](Docs/Evidence/playmode-results.xml) |
| 全曲参数曲线与连续性报告 | 完成 | [总览](Docs/Evidence/整曲参数曲线.png)、[锚点局部](Docs/Evidence/四锚点局部曲线.png)、[82分量热图](Docs/Evidence/全部参数热图.png)、[连续性JSON](Docs/Evidence/continuity-report.json) |
| 风格帧切换与透明度对照 | 完成 | PlayMode测试；[C1](Docs/Evidence/M1_C1_overlay.png)、[C2](Docs/Evidence/M1_C2_overlay.png)、[C3](Docs/Evidence/M1_C3_overlay.png)、[C4](Docs/Evidence/M1_C4_overlay.png) |
| 编辑器截图与短录屏 | 完成 | [实时面板](Docs/Evidence/M1_live_panel.png)、[编辑器窗口](Docs/Evidence/M1_editor_window.png)；本地LocalEvidence/M1_editor_live.mp4，18秒、1440×920、无声 |
| GitHub公开仓库/原曲排除审计 | 完成 | [公开仓库](https://github.com/AngelaYellow/QingTianVFX)、[远端核验](Docs/Evidence/github-verification.json)；[公开审计](Docs/Evidence/repository-audit.json)无音频/录屏/缓存/疑似凭据、无坏链，最大文件27.676MiB，本轮不需LFS |
| README醒后验收入口 | 完成 | [README](README.md)、打开工程.cmd、运行测试.cmd |
| 重启后验收入口 | 完成 | [启动场景回读](Docs/Evidence/startup-check.json)：M1已加载且无未保存改动；[最终控制台回读](Docs/Evidence/editor-console-final.json)无错误记录 |

最终实播：0→269.747秒正常结束，MasterGain=0，8057帧，墙钟269.884秒（含100ms排程）。中位帧间隔33.334ms、p95 37.933ms、p99 43.287ms、最大146.902ms；这是含窗口移动/截图/录屏的本机Editor观测，不是未来粒子或iPhone的性能保证。音频样本时间与DSP最大差21.333ms。四个锚点精确求值的参数误差均0，显示帧跨越偏差分别38.667 / 7.333 / 10.000 / 42.000ms。审计锚点字段rawRms记录的是实测归一化Rms01，未归一化幅值另见live-audio-measurements。

连续性：同一C#演算器120Hz全曲加精确锚点共32375行，52名/82分量；402个章界/句界/节拍/锚点事件两侧±1微秒检查，最大合同范围归一化差约9.66×10^-6。离散标签不参与连续性判定。全量slow/mid/fast/final列在parameters-120hz.csv.gz；曲线使用离线参考特征，不能冒充实时逐点记录。数学结构与测试支持连续性，不仅依赖图片肉眼判断。

后续顺序：M2雾/两光 → M3分步搭光纤、星尘与光斑 → M4分步搭花形、雨与黑隙 → 全层虚实/Bloom统一 → Windows整曲视觉验收 → iPhone/AR/手套。

### M2当前状态（按实际搭建持续更新）

- 独立场景：[M2_MistAndLights.unity](Assets/QingTian/Scenes/M2_MistAndLights.unity)。M1场景文件未改，SHA-256仍为`f4ad1b09254fe8ecbdf8d92926dafb2e765a9123a96e558741cdec16f7776090`。
- 图外准备完成：固定1280×720 HDR相机输出接入原调试面板；正交相机Size=5、z=-10，映射平面距相机10。纯黑背景，独立Volume启用Bloom，强度0.35/阈值1/Scatter0.65，关闭高质量过滤，并覆盖关闭管线模板继承的Neutral色调映射和暗角；亮度仍待光点和雾实际校准。
- 总预算：雾固定64槽、可见24–48片，A/B共用，不能每团各64。管道阶段先只做1粒子。
- 桥输出：保留LightCenterA/B原始Vector2；图外将左上原点变为Unity视口的左下原点，再投影输出Vector3 `LightCenterAWorld` / `LightCenterBWorld`。图须采用World模拟空间。C1的A约(-4.2621,1.6940,0)。
- 测试：新增6项投影测试，EditMode 20/20通过（含原14项），PlayMode原2项全部通过，共22/22。均通过当前Unity MCP实际运行。首次PlayMode运行因播放器被停止而中断，未记录断言失败；保留[中断记录](Docs/Evidence/M2/playmode-interrupted.json)，随后完整重跑[2/2通过](Docs/Evidence/M2/playmode-mcp.json)。测试临时关闭域重载的设置已恢复。
- [准备回读](Docs/Evidence/M2/setup.json)、[EditMode结果](Docs/Evidence/M2/editmode-mcp.json)、[合作搭建记录](Docs/M2搭建记录.md)。用户已从Minimal System创建并打开`M2_Mist.vfx`，截图确认四个空Context及模板连线。助手已将该图绑定到`VFX_Mist`，[引用回读](Docs/Evidence/M2/graph-binding.json)正确；尚无暴露属性LightCenterAWorld，尚未验证真实光点，不把引用绑定当GPU管道打通。
- 用户第2张截图及保存的图文件确认：Single Burst Count=1、Delay=0；Capacity=1、World；Manual Bounds中心0、Size=(20,12,4)。[截图](Docs/Evidence/M2/user_02_spawn_bounds.png)。助手新增128×128白RGB/径向透明度软圆点贴图`Assets/QingTian/Textures/M2/SoftDisc.png`，已导入；[导入回读](Docs/Evidence/M2/soft-disc-import.json)。未替用户添加或修改节点。
- 待后续完成：单点跟随验收 → 两光软雾与轻呼吸 → 整曲审阅 → 四锚点叠图截图 → 雾开/关与Bloom开/关同条件性能比较。当前没有雾层性能数字。
- 图外准备及用户已保存的建图进度有本地Git检查点。当前等待“暴露位置属性→Update连接Position→单点尺寸与贴图”的完成截图；尚未验证GPU端移动。

## 7. 如何运行和测试

打开：双击 `打开工程.cmd`，启动本机8082 MCP与已安装编辑器，并显式打开M1场景。编辑器已开时双击场景或菜单 `QingTian/0 - Open M1 scene`。点击Unity Play自动从头播放。面板支持暂停/继续、重播、进度拖动、精确锚点、C1–C4叠图/透明度、参数搜索/滚动；空格/R/1–4快捷键在输入框失焦时使用。详细醒后操作见README。

测试：先退出本工程编辑器，运行 `python Tools/run_tests.py` 或双击 `运行测试.cmd`。实际成功的命令行流程为两个独立Unity进程：`-batchmode -runTests -testPlatform EditMode/PlayMode -assemblyNames QingTian.EditModeTests/QingTian.PlayModeTests`；脚本检查新鲜XML、退出码和测试结果。改代码后按影响范围重跑，不把旧报告当新验证。

导出：退出Play后选 `QingTian/2 - Export full song parameter evidence`，再运行 `python Tools/plot_evidence.py`。脚本只绘制C#导出，不另写参数算法。`Tools/document_contract.py`从同一JSON更新可读合同。

实播审计：Play或 `QingTian/Evidence/Replay clean full song`；中途暂停/seek会取消“完整连续一遍”标记。结束自动写full-song-playback与live-audio-measurements。校准需完整播放后运行 `python Tools/calibrate_live_audio.py`，再重建场景绑定新校准。动态调试编译会阻塞主线程，性能观测期间避免使用execute_code。

截图菜单为 `QingTian/Evidence/Capture live panel` / `Capture C1–C4`。录屏工具record_editor.py支持观察到的Unity桌面物理边界；交付短录屏是实际Editor运行、无声，听音乐请用Unity现场或单独68 BPM核对文件。

新克隆恢复本地音源：`python Tools/restore_audio.py 原始FLAC绝对路径`，先验证源SHA，再用ffmpeg转换；Unity执行 `QingTian/1 - Build or repair M1 scene` 重新绑定。此菜单会重建M1，进入M2后不得覆盖手工场景。完整研究重算用prepare_inputs.py，需要原研究归档；普通克隆不需要复制研究仓库。

MCP：Coplay10.3.0嵌入包，仅监听127.0.0.1:8082；本机服务 `../.unity-tools/mcp-10.3.0/Scripts/mcp-for-unity.exe`。可用QINGTIAN_MCP_SERVER覆盖路径，QINGTIAN_UNITY覆盖编辑器路径。菜单 `QingTian/Connect MCP` 重连，CLI客户端Tools/mcp_client.py使用现有MCP Python环境。来源、工程范围修正与许可证见 [LOCAL-CHANGES](Packages/com.coplaydev.unity-mcp/LOCAL-CHANGES.md)、[MIT LICENSE](Packages/com.coplaydev.unity-mcp/LICENSE)。

M2入口：菜单 `QingTian/M2/1 - Prepare or open M2 scene`，已有M2时只打开。用户创建图后由助手执行 `QingTian/M2/2 - Bind user-created M2 graph`；绑定工具只引用已有图，不创建节点。M2播放与截图证据输出`Docs/Evidence/M2`，不会覆盖M1实播证据。原根目录启动脚本仍默认M1。

## 8. 决定记录

- 2026-11-16 / M2：按用户的新合作规则推进；使用独立M2场景，禁止重建手搭图。M1播放器仅增加可选RT预览、阶段文字和证据子目录；空值保留原M1行为。
- 2026-11-16 / M2：使用C#完成标准相机投影，先以派生Vector3端口降低新手连线负担；原LightCenterA/B合同不改，复杂形态HLSL等单点管道通过后再加。
- 2026-11-16 / M2：雾和亮芯合用64槽预算；优先基础Unlit Quad与普通透明混合，不引入HDRP体积输出、GPU事件或真DOF。17.3官方说明URP/移动VFX尚有支持边界，因此此处只限制功能路线，不能承诺未测iPhone已经兼容。依据：[官方系统要求](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/System-Requirements.html)。
- 2026-11-16 / M2：当前工作区原有full-song-playback.json和live-audio-measurements.json变更，视为用户重新播放所得，保留且不混入本轮代码提交。
- 2026-11-16 / M2：发现PC_RPAsset默认引用SampleSceneProfile，含Neutral色调映射与暗角；在M2局部Volume显式关闭，避免改变本轮颜色/尺寸比较。没有修改共享管线或M1配置。
- 2026-11-16：采用已安装编辑器提供的URP官方模板建立新工程，依赖按6.3配套版本配置；不复制UnityMusicVisuals。
- 2026-11-16：锚点精确匹配采用平滑调制权重归零，避免在单个时间点强制跳值；原始音频信号继续显示。
- 2026-11-16：68 BPM相位用同源音频的节拍局部声学证据比较；“选出更可能的强拍相位”不等于证明拍号/小节第一拍。
- 2026-11-16：phase0综合均分约1.116，phase1约0.694，约1.61倍且四章同方向。原检测间隔0.8127–0.9288秒、中位0.882358秒。初测误按等间距，修正测试为中位速度和原序列逐点对应，节拍数据未篡改。
- 2026-11-16：两种JSON解析器存在约2×10^-16秒差异，来源节拍对应检查容差1×10^-12秒；四组视觉Float预设仍测试严格等值，误差0。
- 2026-11-16：统一48kHz PCM便于样本定位与点击音核对，不是因为FLAC不支持；终点按269.747秒钳制，完整源精度另存。
- 2026-11-16：初始实时频段增益出现饱和，改为Unity整曲p97固定校准。缓存/实时FFT独立校准，不每帧自动调增益。
- 2026-11-16：成形/半成形先映射1/0.65，Onset01只显示输出；在M2视觉审阅前不强加闪光。
- 2026-11-16：进度条比较同一帧显示值，避免两次DSP读数不同被误当seek；恢复排程等待期保持暂停帧。
- 2026-11-16：MCP采用8082与本工程偏好键，不自动重写其他工程/客户端配置。官方模板资源移动至Assets/Template并保留引用。
- 2026-11-16：CLI测试恢复空场景，启动入口增加显式打开已保存M1场景；不依赖编辑器上次布局。
- 2026-11-16：窗口级GDI捕获在当前显卡上产生白帧，改为观察到的Unity物理边界捕获；移动Unity避开悬浮层，最终录屏只含Unity，失败捕获已清理。
- 2026-11-16：除API与PlayMode测试外，实际点击C3对照按钮并拖动透明度0.65→0，已观察到参考图切换和回到纯黑窗口。
- 2026-11-16：公开仓库已创建，首个实现提交65daac3已由远端main回读核实，GitHub API确认private=false。原曲及本地录屏均被忽略；本次最大跟踪文件27.676MiB，暂不启用LFS。

## 9. 待用户确认

- M2合作停点：Spawn/容量/坐标/Bounds已确认。下一组3步：创建Exposed Vector3 `LightCenterAWorld`，连到Update内的Set Position；Initialize添加Set Size=0.3；Output Main Texture选择SoftDisc（后两项合为“单点外观”一步）。等截图确认再实播。0.3是可读性验证尺寸，不是最终雾尺寸。首锚点前中心基准恒定，因此应通过四锚点定位和70–90秒段测试移动，不能仅看开头几秒判断桥失效。
- 睡醒后复听68 BPM核对音频，确认重拍感；自动声学判断不能替代主观节奏判断。
- 时间骨架仍有21句低置信度；本轮保持既定时间线并显示置信度，不把它标为逐句听审通过。
- 四个锚点暂按用户确定值执行，未来视觉审阅后可以修改。
- 0.85秒锚点调制窗口、成形/半成形1/0.65和音乐微扰幅度是当前设计初值，待M2视觉确认；C1锚点所在L09置信度0.35尤其需要复听。
- 当前采用IMGUI调试布局，后续粒子阶段再按需隐藏/重排；左右对照、参考线、Solo和冻结层开关尚未实现，不属于本轮必需项。
- 自有代码和风格帧暂未另行授权开源许可证；公开仓库不等于放弃素材权利。若希望统一MIT等许可证再决定，第三方许可证已保留。

## 10. 变更日志

### 2026-11-16 — M2第2步，单粒子基础设置确认

用户完成Single Burst、单容量、World及Manual Bounds，并提供截图；磁盘图文件也已匹配。生成可复现软圆点素材，Unity导入设置为Default Texture2D、Uncompressed、Clamp、Bilinear、无Mip、白RGB/输入alpha、sRGB关闭。未改运行时代码或M1场景，不重复跑此前22项测试；下一轮验证实际GPU属性写入与渲染。

### 2026-11-16 — M2教学方式补充

用户要求边操作边学习设置原理。将“操作—含义—取值依据—预期”写入AGENTS和本文件，并补充Count/Capacity、Local/World、包围盒与相机画幅关系的讲解。本轮仅修改教学文档，不修改节点、场景或代码，不新增测试结论；仍等待上一轮3步的完成截图。

### 2026-11-16 — M2第1步，用户建图与场景引用

用户完成Minimal System模板创建、命名M2_Mist并打开，提供[节点图截图](Docs/Evidence/M2/user_01_minimal.png)，同时将教学节奏改为每轮3步骤。助手通过MCP仅绑定VisualEffect资产引用并保存M2场景，没有编辑节点。回读引用正确，控制台0错误；未改C#及M1场景，本轮未重复跑上一轮已通过的22项测试。下一轮验收Single Burst、单容量、World和Manual包围盒配置。

### 2026-11-16 — M2第0步，图外准备

完整阅读本文件后核验MCP为QingTianVFX，原场景干净且未播放。新增独立M2场景、相机RT、Bloom与待绑定VisualEffect；扩展坐标桥和可选预览，保留M1原场景。新增6项坐标换算测试，EditMode20/20、PlayMode2/2通过；保存[实际M2空预览截图](Docs/Evidence/M2/M2_preparation.png)，RT已创建，面板和原叠图布局正常。用户手搭图尚未开始；第一步只创建并打开Minimal System资产，等待截图继续。

### 2026-11-16 — 新工程与M1验收

建立独立URP工程、VFX依赖、MCP连接和目录规范；升级迁移三方案1.2。导入四帧、时间线、52参数合同、68节拍与本地音源；实现DSP时钟、连续三层参数、精确锚点、实时音频和叠图工具。完整校准与最终实播均完成，16项CLI测试通过；保存全曲曲线、4锚点截图、编辑器窗口截图和18秒真实无声录屏。公开仓库审计与推送完成，重启编辑器已自动打开M1场景，留在停止播放状态供用户验收。
