# QingTianVFX 开发上下文

## Web 当前交接状态：按用户要求停止迭代并提交工作版本

2026-11-16，用户明确指出当前实现仍有问题，要求不要继续修改或自审，立即提交 GitHub，待外部审阅后再反馈修改。本轮已停止实现和审阅，中止正在进行的新版整曲导出。当前 Web 代码与已有证据按工作版本交接，**不标记为视觉验收通过，不冻结为 Unity 动作剧本**。最新入口：[当前交接说明](WebDemo/CURRENT_HANDOFF.md)。最终无声预览、报告整合和新整曲备份未完成收尾；下方历史 Web 结论不能代表此工作树。原曲及含音频视频仍只存本地忽略目录。本次提交范围为 WebDemo 与本记录；用户未提交的 Unity 图及其他 Docs 证据不纳入。


最后更新：2026-11-16（Asia/Shanghai）。本文件是本工程唯一开发上下文；工程内其他文档与它冲突时，以本文件为准。每次开发先完整阅读，结束时更新真实状态、决定、证据和剩余事项。用户当前指令优先于文档。

## 0. 最高视觉设计原则：持续运动的形体，风格帧只是经过的瞬间

**2026-11-16用户设计修正，优先于本文件下方的旧方案记录、方案1.2与当前旧代码的视觉假设。** 画面从第一秒到最后一秒持续运动：粉雾、青雾、光带等形体不断流动、旋转、伸展、变形、靠近或分开；粒子是组成形体的材料，随形体行动，并可沿形体输运。主体运动必须在隐藏细点、固定镜头后仍然看得见。

四张风格帧是连续运动在56.80 / 93.61 / 155.41 / 264.05秒经过的四个形态约束。形体流成该构图后继续变化，不停靠、不冻结、不在附近把整体运动压成零。形体之间须有连续的材料去向和动作过程；不能用四张静态预设的混合或淡入淡出替代整曲动作。数学插值可作为轨迹/形变的内部工具，但不是视觉目标本身。

音乐改变形体动作的速度、范围与力度：舒缓处缓慢而持续，重音有整体亮起、前端外冲及后续拖曳，副歌大幅展开。任意中间时刻也要保持完整构图，而非只保证四张截图好看。手动暂停时整个演出应冻结；片头/片尾允许渐隐，但可见期间继续动作，t=0与终点的黑场不等于给首尾设置静止段。

**Unity运动以用户确认后的Web动作剧本为准。** 本地参考视频只借鉴连续动作，不借鉴蓝色和圆形；原视频、音轨、抽帧与拼图不进Git。Web当前正在另项工作中改动，其已实现、已测量、待审美确认和计划中内容必须区分；不得自行宣布某个中间提交已获用户确认，也不能把其未完成系数锁进Unity。

本轮交付：[视频动作分析](Docs/参考视频形体运动分析.md)、[M1旧假设与迁移清单](Docs/M1旧设计审计与形体运动迁移.md)、[M2新版教学方案](Docs/M2形体运动教学方案.md)。本轮完成设计修订与审计，未替换ScoreModel、参数JSON、播放器或用户VFX图；旧M1仍是历史回归基线，不能说运行时已经实现新原则。命令行回归EditMode27/27、PlayMode2/2，0跳过，[报告](Docs/Evidence/DesignCorrection/cli-test-summary.json)。

## Web历史版本记录：删除程序生成版，恢复图像采样版

以下记录对应本轮开始时的`5eaf0fa`，不是对正在修改的Web工作树的冻结声明；旧记录中“后续Unity按原M2计划”的表述已由第0节与新版计划替代。

2026-11-16，用户明确要求“删除程序生成版”，并指定保留此前的图像采样版。本轮已删除程序版渲染器、Solo 控件、元素运动表、无参考图测试及其截图；主入口恢复为 `WebDemo/src/shape-renderer.mjs`。从本地归档恢复同版 `motion.mjs`、结构色彩缓存、32 份既有证据、README 和风格帧对比报告。两份渲染/运动源码与归档 SHA-256 一致；原曲、四张参考图、图像版验收录像、整曲备份和本地归档保留。

- **本轮新验证**：14 项现有 Node 测试通过；独立 Chrome 新加载确认只载入图像版渲染器，四锚点、播放/暂停、实时声学信号、小亮点开关、叠图与验收页均正常，页面错误和失败请求为 0。[恢复验证](WebDemo/evidence/restored-image-version.json)、[当前 C1 实际截图](WebDemo/evidence/恢复图像采样版_C1.png)。短时播放约 4 秒、243 个帧间隔，平均 60.16fps；仅为恢复后的短测，不替代下方既有整曲记录。
- C1 当前截图与归档同版截图的像素差最大为单通道 1/255，平均约 0.000190/255；没有把 PNG 字节不完全相同写成位级一致。下方四锚点指标、十秒录像、整曲性能和备份信息均来自恢复的图像版既有验证，本轮未重新录整曲。
- **当前决定**：保留参考采样生成的 GPU 微粒与原运动算法，本轮只恢复版本，不继续开发程序生成路线。图片参与位置/颜色属性，不宣称无图独立生成；粒子运动是 GPU 解析轨迹，不是保存位置/速度状态的 GPGPU 流体仿真。
- **未完成 / 待用户确认**：图像采样版的运动观感仍以用户反馈为准，本轮功能恢复不等于审美验收通过。Unity M2 状态不变；没有修改 Unity 工程内容，两个已有 `Docs/Evidence` 修改不纳入提交。

## Web 图像采样版：实现与既有验证

用户为课堂演示另授权独立 Web 版本，并明确要求大形体运动，允许重做技术路线；这不改变下面 Unity M2 由用户手搭图的合作规则。本轮只新增 `WebDemo/` 并更新本文件，没有修改 Unity Assets / Packages / ProjectSettings。现有 `Docs/Evidence/full-song-playback.json`、`live-audio-measurements.json` 是用户此前的改动，保留且不纳入本轮提交。

- **当前状态：Web 形体运动已实现，五项验收证据已产出，待用户审美确认。** 入口：[WebDemo/启动演示.cmd](WebDemo/启动演示.cmd)；[操作说明](WebDemo/README.md)；启动后 [五项验收页面](http://127.0.0.1:47841/review.html)；[对比报告](WebDemo/风格帧对比报告.md)。Unity M2 未因 Web 完成而升级为已验收。
- WebGL2 + Web Audio + 本地 Node 服务，无运行时第三方库或 CDN。整曲先本地解码，AudioContext 为时钟。与 Unity 共用四锚点、timeline、beats68、52 参数 / 82 分量，原输入 SHA 记在 `WebDemo/data/source-manifest.json`。完整歌词没有进入 Web 数据。
- 最终主画面采用**参考引导的独立密集微粒**，高斯浮点叠加；原图只作为位置/颜色属性输入，对照叠图默认关闭。试验中的整幅变形网格没有保留为最终渲染。旧版粒子原地游移、闪点主导、六秒回原位实现已撤下，旧文件只留本地忽略归档。
- 新 `motion.mjs` 以共用大尺度流场组织雾、光带、花和雨：两光分区旋转、相反漂移、伸展，重拍全局向外/向上冲击，26ms 起 / 430ms 落；粒子有独立深度与连续滑移。纵深投影产生不同层的横移和推进。画面外缘柔和消散，避免硬切边。这是解析流场与 2.5D 重建，不是真流体模拟或真实体积重建。
- 实时 RMS/低高频加权能量改变宏观幅度、积分相位速度和冲击强度；节拍时刻来自 beats68，不宣称在线识别 BPM。曲式读取原 `timeline-source` 的工作标注：主歌 0.58、副歌1 1.50、副歌2 1.70，边界 2.4 秒渐变；保留待人耳确认状态。原 52 参数仍计算，但部分雾纹、散景、虚实在参考属性内，不宣称每个参数均有独立 Web 材质层。
- 四锚点采用穿行轨迹：偏移在精确时刻为零，但路径斜率非零；前后继续运动，移除旧六秒停靠窗。原 ScoreModel 的 0.85 秒参数窗不变。任意 seek 会初始化运动相位，非锚点画面不保证与从头实播逐像素相同。
- 快捷键新增 P：取消 12,000 个额外小亮点槽，并对源属性低通以抑制原图细点；主体微粒、光带、雨保留。面板能直接看实际宏观幅度、能量、惯性冲击、镜头和穿行相位；响应默认 1×。
- **五项证据**：[实时录制轨迹](WebDemo/evidence/macro-motion-recordings.json)、[运动测量](WebDemo/evidence/macro-motion-metrics.json)、[关闭小亮点的两秒对比](WebDemo/evidence/04_副歌_关闭小亮点_间隔2秒.png)、四张 `WebDemo/evidence/C*_左右对比.png`。原曲实时播放、分析发生在静音扬声器之前；音轨仍录入本地视频。副歌开/关 105–115 秒、主歌 40–50 秒、关闭小点副歌均各 10 秒，视频只放 `WebDemo/LocalOnly/验收/`。
- 低通后图像变化：音频开/关约 25.32×，副歌/主歌约 2.64×。这是实际视频图像差，含亮度变化，不是光流速度或审美评分。副歌宏观相位约 2.475 单位/秒，主歌约 1.028；单位是内部艺术参数。
- 四锚点均关闭对照叠图、以 1672×941 实际 WebGL 截图测量。暗部最大误差约 0.00255 个百分点，两光中心最大 UV 偏差约 0.00000115，黑隙宽最大误差约 0.00000033W；[完整指标](WebDemo/evidence/style-comparison.json)。高相似度来自被授权的参考采样，不能说成无参考生成。
- **实测**：14 项 Node 测试通过，[结果](WebDemo/evidence/unit-tests.tap)。[浏览器操作验证](WebDemo/evidence/browser-validation.json)通过；[P键与验收视频验证](WebDemo/evidence/final-ui.json)通过。完整真实原曲实播 0→269.747 秒、四章经过、无意外暂停，最终停止；[证据](WebDemo/evidence/full-song-playback.json)。Chrome headless / Intel Arc / 1672×941，16,267 个帧间隔，平均 59.95fps、p95 17ms、p99 19ms、超过 33.34ms 共9帧。不是所有硬件性能保证。
- 启动脚本返回 0，系统枚举到“晴天 · 光的四个瞬间”Chrome 窗口；原生截图因 computer-use 应用授权超时未取得。独立 Chrome 页面控制、播放、全屏、拖动、锚点、叠图、隐藏、画质、P键及验收视频另有自动化实测，不能把它写成原生窗口截图成功。
- **整曲备份**：`WebDemo/LocalOnly/晴天_整曲备份.mp4`，1600×900 / 60fps、16,185 帧、H.264 + AAC、269.750 秒（视频帧网格比逻辑终点多3ms，音轨269.747秒）。同一 WebGL 渲染器固定步长离线求值，使用既有特征缓存；交互版本使用实时分析，细部动态不宣称逐帧相同。[编码探测](WebDemo/evidence/video-export.json)。
- 音频、所有含原曲视频、编码中间文件和 Chrome 配置均在 Git 忽略的 LocalOnly，禁止提交；动态参考研究只保存链接与研究笔记：[TouchDesigner参考](WebDemo/动态参考调研.md)。
- **待用户确认**：新版大形体涌动、冲击强度、主副歌反差是否符合期望。工程测试与测量不替代此审美确认。后续 Unity 仍按原 M2 计划继续，Web 微粒数不能直接当手机 VFX 预算。

## 1. 最终目标与本轮范围

最终在 Windows Unity 编辑器中播放完整《晴天》，VFX Graph 粒子按章节慢变、歌词聚散、节拍和音量运动，经过四张风格帧的视觉状态；以后再做 iPhone（Metal/ARKit）、AR 和手套。

M1基础阶段已完成：独立工程、工程规范、无粒子参数演出，16项命令行测试通过，校准后整曲实播及曲线/截图/录屏已归档。仓库：[AngelaYellow/QingTianVFX](https://github.com/AngelaYellow/QingTianVFX)。

**当前阶段M2：改为先验收形体动作，再完善柔光雾，尚未视觉验收。** 用户亲手搭VFX Graph，助手负责图外资源与逻辑；每轮围绕可见成果给6–8步并解释原理。用户此前已确认两处光可见；本轮保存退出编辑器后读取到其手搭图已扩至Capacity32、增加5个雾输入和Custom HLSL引用，属于旧实验进展，尚未验收渲染。保留这些手工成果，不覆盖；下一轮按[新版教学方案](Docs/M2形体运动教学方案.md)迁移。旧“光心附近游移”8步停止作为当前指南。M1场景必须保留，参考叠图不能算实时还原。

## 2. 已确定决定

- 新工程 `D:/Works/智能交互设计/QingTianVFX`；不以 UnityMusicVisuals 为资源或配置基线。
- Unity 6000.3.28f1、URP / VFX Graph 17.3.0；粒子必须使用 VFX Graph，M1保持无粒子，M2只实现雾与两光。
- Windows 编辑器先完成整曲与风格帧级视觉；未来 iPhone 使用 Metal/ARKit。
- 暗幕方案、纯黑背景，先按30fps考虑。
- 名义68 BPM取现有约136 BPM序列第0、2、4…个点（phase0）。保留原检测时刻的细微浮动，音源pitch=1，不拉伸音乐。已生成本地核对音频。
- 关键时刻：56.80、93.61、155.41、264.05秒。
- 已有M1通道保留四锚点参数精确等值的历史行为和回归测试；新M2约束形态/位置/颜色关系，不能要求所有动态自由度或速度同时归零。时钟/音频原始信号始终真实。
- 手套接口本轮不做。
- 创建公开GitHub仓库并推送；原曲、衍生含原曲音频、含原曲录屏不进入公开仓库。无权限则完成本地仓库并写明用户操作。
- M1曾授权独立完成；M2改为用户在场合作，节点图由用户搭、逐步截图确认。助手自主完成图外准备，常规实现决定记录依据。
- M2教学方式：用户希望增加步骤、一次看到更多成果；每轮可围绕完整成果给6–8步，每步讲清操作、设置含义、为什么取这个值、预期现象；区分临时验证值与最终雾层参数，帮助用户在搭建中学习原理。

## 3. 新架构、三层时间语义与锚点处理

### 目标数据流（迁移设计，尚未写入运行时）

原AudioSource / DSP SongClock → SongTime、播放状态、章句标签。
确认后的Web形体动作剧本 + 曲式/句阶段 + 实时音频/68节拍 → 形体动作帧。
形体动作帧 + 四个瞬时构图约束 → 连续形体路径/形变/材料输运。
参数桥 → VFX Graph共享形体函数 → 各层粒子随形体运动 → 外观合成。
调试面板分别显示原始音乐信号、动作输出与参考约束，不能把“旧Final变化”当作形体已在运动。

| 时间尺度 | 新语义 | 可观察结果 |
|---|---|---|
| 慢：段落/曲式，秒至数十秒 | 决定动作方向、舞台范围、展开程度与能量底线；四视觉章的聚→分→近→散是故事关系，不是四段静态状态。主歌/副歌标签另取曲式，不与C1–C4混同 | 前奏已进入动作；主歌缓流，副歌大幅展开；C4之后继续散出 |
| 中：歌词句，数秒 | 一句驱动一次收拢、牵引、转向、卷回、伸展或散出过程，形体前后段可有延迟；句间基础流动持续 | 同一个形体一步步变形，句末不凭空消失、句首不重新随机出生 |
| 快：节拍/音量/频段，数十毫秒至秒 | 声音调节形体速度、动作幅度、重音前冲与惯性释放；亮度只是其中一项。高频可加边缘卷动，低频可加主体推进 | 重音整体亮起并向外推进，随后回落；关闭细点后仍能看出音乐响应 |

### 锚点：约束形态，不制造停靠

1. 56.80 / 93.61 / 155.41 / 264.05秒保留。约束形体在这些瞬间的构图、位置、范围和色彩关系，运动轨迹穿过这些状态后继续。
2. 不为锚点设置静止窗，不让所有动作乘AnchorFreedom压零；不将时间相位/粒子状态在锚点重置或切换另一张贴图。
3. 形体位置经过目标并不要求速度为零；连续检查位移/轮廓及前后方向。允许局部转向点瞬时速度为零，但不能让整幅所有动作停下。数值位移连续也不足以证明有动感。
4. 第一锚点前有明确进入动作，最后锚点后有明确散出动作。渐入/渐出仅控制可见程度，不锁定形体。
5. 锚点按钮为了对照可以手动暂停；它的截图不证明正常播放时应该停在那里。每个锚点必须同时验收静态对照与前后各2秒连续窗口。
6. 具体数学方法不预先锁定，可用连续形变/路径/有状态输运等；采用哪种方式必须支持暂停、重播、seek和预算，并按确认Web动作验证。不能只调大噪声或亮度系数来代替设计迁移。

### 运行时事实与保护边界

本轮未替换现有实现。ScoreModel仍用四预设五次插值、首尾基准保持、0.85秒压零及小幅中快调制；这些是**待迁移的旧假设**，不再是新设计要求。完整源码定位、合同变化和测试处理见[M1迁移审计](Docs/M1旧设计审计与形体运动迁移.md)。原M1精确参数测试保留为旧通道基线；新动作通道另设形态约束/连续穿行测试，不通过删旧断言伪造通过。

| 组件 | 保留或迁移职责 |
|---|---|
| ScoreModel.cs中的SongClock | 保留DSP时基、暂停/恢复、排程、seek、重播与终点；不为视觉迁移重写时钟 |
| ScoreModel.cs视觉求值 | 当前旧1.2基线；后续独立新增M2形体动作求值，明确版本，逐项替换旧视觉假设 |
| QingTianPlayer.cs | 保留AudioSource、实时信号分析、播放控制、叠图；未来面板分开展示动作与参考值 |
| VfxParameterBridge.cs | 后续接入形体动作输出并核对Exposed端口；C#组织时钟/音乐/动作，不逐粒子搬位置 |
| VFX Graph / 外部HLSL | 用户搭节点；先实现形体共同变形与材料输运，再叠局部细节和外观 |
| M2Setup.cs / M1场景 | 保留独立M2；已有手搭图不重建，M1不被覆盖 |

迁移时必须选定seek策略：解析求值或可重建缓存；若采用状态模拟，则使用检查点和固定步重演等明确方案。实时输入具有历史时，同一输入记录可复现，不承诺不同输入历史的画面逐像素一致。暂停时动作与音乐同停，恢复后连续，不可另用独立Total Time。

### 已有音频基础（继续保留）

音频使用48kHz双声道PCM、DecompressOnLoad、非循环2D AudioSource。主时钟来自DSP，不累计deltaTime；播放/恢复提前100ms排程，暂停和恢复等待期保持参数。源文件精确长度269.747208333秒；演出逻辑遵循用户终点269.747秒，相差0.208毫秒，完整源数据保留，无开头裁切或速度变化。

实时FFT为2048频谱、BlackmanHarris窗，RMS取1024输出样本，声道0，按实际输出采样率积分30–250Hz与2–10kHz。固定归一化来自一次Unity整曲实测p97，[校准报告](Docs/Evidence/live-audio-calibration.json)记录当前48kHz输出条件。50Hz `audio-features.json`仅作离线确定性曲线/测试，默认 `useCachedFeatures=false`。两种FFT标度不同，分别校准；更换音源、FFT或输出采样率须重校准。动态切换音频设备本轮未验收。

## 4. 目录规范

- `Assets/QingTian/Runtime`：本项目运行时代码。
- `Assets/QingTian/Editor`：本项目编辑器工具。
- `Assets/QingTian/Tests/EditMode`、`Tests/PlayMode`：有独立asmdef的测试。
- `Assets/QingTian/Scenes`、`Data`、`Settings`、`ReferenceFrames`：项目场景、参数/时间线、管线配置、风格帧。
- `Assets/QingTian/Shaders/M2`：用户Custom HLSL块引用的自有算法；`Textures/M2`：可复现生成的软粒子纹理；测试专用Compute在Tests/EditMode，不参与场景演出。
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

上述合同是当前旧M1通道的事实记录，数值未改；新形体合同尚未实施。新增/改义项见[M1迁移审计](Docs/M1旧设计审计与形体运动迁移.md)。可读合同及三份Plan已加迁移提示，不能把其中旧插值/压零说明当作M2最高要求。

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

### M2–M4新版计划与验收顺序

| 阶段 | 产出 | 验收标准 |
|---|---|---|
| M2-A 形体动作 | 按确认Web剧本迁移粉/青主体推进、旋转、伸展、弯曲和分离/靠近；低细节VFX预览 | 固定镜头、隐藏细点后仍有大形体运动；首尾都有动作；主副歌反差与重音余势可见 |
| M2-B 雾材料与两光 | 在已会行动的形体上布置薄雾密度/拖尾/内部输运，合计不超过64槽 | 形体不是许多无方向小条；雾增强层次而不盖住动作，黑隙与粉青关系保持 |
| M2-C 连续锚点与性能 | 四锚点静态对照和前后窗口录像、整曲抽检、同条件性能比较 | 到点接近风格帧且前后不停靠；中间帧完整；Windows30fps目标及CPU/GPU开销有证据 |
| M3 光纤/星尘/光斑 | 光纤随共同形体脊线变化，星尘/光斑成为随流材料；逐层Solo验证 | 光带本身弯曲、推进和展开；关闭小点后主体仍动。逐层增加后不改坏M2动作 |
| M4 花/雨/黑隙及全层 | 句驱动花形的收聚展开散出，雨随方向场、黑隙随两形体关系演化；统一深度与Bloom | 共同形体动作贯穿各层，不是独立图层淡入淡出；任意时刻有完整构图，整曲及首尾/四锚点窗口通过 |

Windows整曲视觉验收之后再做iPhone Metal/ARKit、AR与手套。旧方案1.2的视觉测量/预算可引用，但运动语义以第0节为准。

### 当前交付与迁移停点

- 本轮完成原则重写、视频38帧分析、源码/合同审计和新教学方案；没有实现新形体导演或新图端口。
- Unity独立CLI最终27项EditMode与2项PlayMode全通过，0跳过；它证明现有基础没有回归，不证明新视觉已落地。
- Web工作树正在变化；冻结用户确认后的剧本是Unity新动作迁移的输入条件。本轮对旧提交5eaf0fa的隔离快照重跑14/14通过；对进行中的工作树只读检查为12/14、2项失败（锚点偏移和音频开关幅度断言），详见[工作树报告](Docs/Evidence/DesignCorrection/web-working-tree-summary.json)及[TAP](Docs/Evidence/DesignCorrection/web-working-tree-tests.tap)。没有修改那边的代码或放宽断言，也不把[历史快照14/14](Docs/Evidence/DesignCorrection/web-baseline-summary.json)冒充当前Web全部通过。
- [SHA核对](Docs/Evidence/DesignCorrection/runtime-preservation.json)确认ScoreModel、播放器、参数JSON、M1/M2场景、旧雾HLSL及EditorSettings未变。用户图原有待保存节点已由SaveAssets落盘，未由助手编辑拓扑。测试后已重新打开M2 Edit Mode，并[回读MCP场景](Docs/Evidence/DesignCorrection/editor-restored-scene.json)：已加载、无脏标记；画面观察确认未处于Play。
- 可重复命令：关闭本工程Editor后运行 `python Tools/run_tests.py --evidence-dir Docs/Evidence/DesignCorrection`。本机无可用全局Python别名时，使用 `../cross-sensory-live-music/experiments/experiment-v2/.venv/Scripts/python.exe`；旧测试入口默认报告目录不变。


### M2旧方案实现与证据（历史基线，不是当前动作目标）

- 独立场景：[M2_MistAndLights.unity](Assets/QingTian/Scenes/M2_MistAndLights.unity)。M1场景文件未改，SHA-256仍为`f4ad1b09254fe8ecbdf8d92926dafb2e765a9123a96e558741cdec16f7776090`。
- 图外准备完成：固定1280×720 HDR相机输出接入原调试面板；正交相机Size=5、z=-10，映射平面距相机10。纯黑背景，独立Volume启用Bloom，强度0.35/阈值1/Scatter0.65，关闭高质量过滤，并覆盖关闭管线模板继承的Neutral色调映射和暗角；亮度仍待光点和雾实际校准。
- 总预算：雾合计64槽、可见24–48片，A/B共用，不能每团各64。单点阶段1粒子；当前双实例阶段每团1粒子，合计2。后续同图扩雾时每实例最多32，合计64。
- 桥输出：保留LightCenterA/B原始Vector2；图外将左上原点变为Unity视口的左下原点，再投影输出Vector3 `LightCenterAWorld` / `LightCenterBWorld`。图须采用World模拟空间。C1的A约(-4.2621,1.6940,0)。
- 测试：新增6项投影测试，EditMode 20/20通过（含原14项），PlayMode原2项全部通过，共22/22。均通过当前Unity MCP实际运行。首次PlayMode运行因播放器被停止而中断，未记录断言失败；保留[中断记录](Docs/Evidence/M2/playmode-interrupted.json)，随后完整重跑[2/2通过](Docs/Evidence/M2/playmode-mcp.json)。测试临时关闭域重载的设置已恢复。
- [准备回读](Docs/Evidence/M2/setup.json)、[EditMode结果](Docs/Evidence/M2/editmode-mcp.json)、[合作搭建记录](Docs/M2搭建记录.md)。用户从Minimal System创建`M2_Mist.vfx`，助手将其绑定到`VFX_Mist`，[引用回读](Docs/Evidence/M2/graph-binding.json)正确；这些早期准备记录不代表当时已经完成GPU验证，最新实际验证见下。
- 用户第2张截图及保存的图文件确认：Single Burst Count=1、Delay=0；Capacity=1、World；Manual Bounds中心0、Size=(20,12,4)。[截图](Docs/Evidence/M2/user_02_spawn_bounds.png)。助手新增128×128白RGB/径向透明度软圆点贴图`Assets/QingTian/Textures/M2/SoftDisc.png`，已导入；[导入回读](Docs/Evidence/M2/soft-disc-import.json)。未替用户添加或修改节点。
- 待后续完成：按新指南接入软雾纹理与HLSL → 校准四锚点雾包络与轻呼吸 → 整曲审阅 → 四锚点叠图截图 → 雾开/关与Bloom开/关同条件性能比较。当前没有雾层性能数字。
- 用户单点管道已通过：保存图有Exposed Vector3 `LightCenterAWorld`→Update Set Position、Initialize Set Size=0.3、SoftDisc/Alpha。用户实播反馈可以继续，并提供[单点截图](Docs/Evidence/M2/user_03_single_point_display_issue.png)。助手进一步读取真实1280×720渲染贴图，四锚点及70/80/90秒共7样本均1个存活粒子；位置桥误差0，亮度加权像素中心最大误差0.0024px。[实际渲染审计](Docs/Evidence/M2/single-point-render-audit.json)。这是暂停定位采样，不冒充完整连续演出或性能测试。
- 显示修复：M2专用`M2_Display`相机只输出Display 1黑底，cullingMask=0，无阴影/后处理/额外AudioListener，消除RT相机没有直接输出屏幕时的“No cameras rendering”。`presentationView`默认在M2开启，按原16:9适配Game窗口，仅显示实时RT；F切调试面板，Esc也可返回。调试面板保留叠图和参数，纯画面不叠参考图。真实键盘已验证双向切换，[截图](Docs/Evidence/M2/M2_editor_clean_display_fixed.png)、[调试模式](Docs/Evidence/M2/M2_editor_debug_display_fixed.png)、[切换记录](Docs/Evidence/M2/display-toggle-check.json)。M1保持原行为。
- 最新回归：EditMode20/20、PlayMode2/2均通过，[EditMode](Docs/Evidence/M2/display-editmode-tests.json)、[PlayMode](Docs/Evidence/M2/display-playmode-tests.json)。首次EditMode的2项投影测试受到当前Game窗口尺寸取整影响；保留[失败记录](Docs/Evidence/M2/display-editmode-initial-failure.json)，测试夹具改用与M2一致的1280×720 RenderTexture，未放宽断言容差，未改运行时投影算法。域重载设置恢复原值，M1场景SHA未变；本轮用户VFX图SHA前后相同。
- A颜色关卡已完成：用户截图[C1淡紫](Docs/Evidence/M2/user_04_colored_A_C1.png)、[C2粉紫](Docs/Evidence/M2/user_05_colored_A_C2.png)与保存图确认LightColorA→Update Set Color、Initialize Size=1。助手已将原VFX_Mist命名为VFX_LightA，新增VFX_LightB，两者引用同一个用户M2_Mist资产，分别绑定A/B源参数，种子68/69；[场景回读](Docs/Evidence/M2/two-light-instances-prepared.json)。没有代替用户改图，通用端口尚待用户创建/改名，不能宣称双光已显示。
- 本轮新桥输出：每实例`LightCenterWorld`/Vector3、`LightScaleWorld`/Vector3、`LightColor`/Color、`LightGain`/Float，按实例A/B路由；`MasterGain`沿用原合同。原52参数及A/B数据未改。ToWorldSize将画宽/画高比例分别变为世界尺寸，Z=1；当前把LightScale解释为第一版Quad完整宽高，SoftDisc实际可见范围更小，正式雾包络须再校准。C1 A约4.6222×2.0单位。端口表和用户8步见[M2搭建记录](Docs/M2搭建记录.md)。
- 双实例准备的测试：新增2项尺寸转换测试，包含画宽/画高分别缩放、旋转相机和透视距离；[EditMode22/22](Docs/Evidence/M2/pair-editmode-tests.json)、[PlayMode2/2](Docs/Evidence/M2/pair-playmode-tests.json)，共24项通过。通用端口未由用户搭好，本轮未验证双实例GPU图输出。

#### 此前进展：两光已由用户确认，局部流动雾图外准备

- 用户反馈两团光可见。只读检查其图：五个通用Exposed端口、位置/尺寸/颜色/alpha设置、Additive均已保存；MCP确认A/B实例引用相同图且全部端口可写，[回读](Docs/Evidence/M2/two-light-ports-verified.json)。这一确认来自用户实播反馈与资产/实例检查，不冒充本轮新采集的双光渲染截图。
- 新增`Shaders/M2/MistMotion.hlsl`，Update用Custom HLSL的`QingTianMist`函数；保留用户Set Color乘法。算法写position、scaleX/Y/Z、angleZ、alpha。32槽/实例、两实例合计64，按总MistTargetCount淡入淡出对称雾片，不Kill、不每帧重新随机；C1–C4分别24/16/20/12可见片每团。全部64槽仍参与模拟，不能把透明片视为没有GPU开销。
- 新增`Textures/M2/MistWisp.png`，256×256程序生成非均匀alpha、白RGB、零透明边；线性/Uncompressed/Clamp/Trilinear/Mipmap，来源工具`Tools/make_mist_wisp.py`。[导入回读](Docs/Evidence/M2/mist-assets-imported.json)。未编辑参考图。
- 桥新增派生Float `MistSizeWorld = MistSize × 当前平面画幅世界宽`、`MistPhaseOffset = A:0/B:2.17`。MistTargetCount/MistOpacity/FlowPhase沿用原桥。四预设、原52参数及播放器未改。
- 本机17.3 HLSL解析器识别唯一函数QingTianMist和8个用户输入，属性解析无错误，[解析报告](Docs/Evidence/M2/mist-hlsl-parser.json)。Compute探针直接include同一算法做GPU数值检查，没有自动创建任何VFX图。最终用户图的编译/渲染、雾层性能和iPhone兼容性仍待后续实测。
- 本轮最终回归：[EditMode27/27](Docs/Evidence/M2/mist-editmode-tests.json)，包含原22项和5项实际GPU雾算法测试（已包含度/180度镜像检查）；[PlayMode2/2](Docs/Evidence/M2/mist-playmode-tests.json)，共29项通过、0跳过。[控制台0错误](Docs/Evidence/M2/mist-final-console.json)。域重载选项恢复为0。测试检查的是已有功能与新算法，不是宣称完成用户新图或整曲雾视觉验收。
- 操作指南：[M2流动雾搭建指南](Docs/M2流动雾搭建指南.md)。本轮没有替用户调整图；开始与结束SHA均`5B8E51B9B2FFE3E0637260D4326992897DF80B3EBAC041EE0289979AE998A178`。M1场景SHA仍同上，编辑器回到M2 Edit Mode。
- [最终文件审计](Docs/Evidence/M2/mist-preparation-audit.json)保存图/M1/HLSL的SHA。17.3属性解析器会误把注释中的`attributes use`当成属性访问，已改写该注释并重新确认解析0错误；这是注释解析修正，没有改动已通过测试的数学计算。

## 7. 如何运行和测试

打开：双击 `打开工程.cmd`，启动本机8082 MCP与已安装编辑器，并显式打开M1场景。编辑器已开时双击场景或菜单 `QingTian/0 - Open M1 scene`。点击Unity Play自动从头播放。面板支持暂停/继续、重播、进度拖动、精确锚点、C1–C4叠图/透明度、参数搜索/滚动；空格/R/1–4快捷键在输入框失焦时使用。详细醒后操作见README。

测试：先退出本工程编辑器，运行 `python Tools/run_tests.py` 或双击 `运行测试.cmd`。实际成功的命令行流程为两个独立Unity进程：`-batchmode -runTests -testPlatform EditMode/PlayMode -assemblyNames QingTian.EditModeTests/QingTian.PlayModeTests`；脚本检查新鲜XML、退出码和测试结果。改代码后按影响范围重跑，不把旧报告当新验证。

导出：退出Play后选 `QingTian/2 - Export full song parameter evidence`，再运行 `python Tools/plot_evidence.py`。脚本只绘制C#导出，不另写参数算法。`Tools/document_contract.py`从同一JSON更新可读合同。

实播审计：Play或 `QingTian/Evidence/Replay clean full song`；中途暂停/seek会取消“完整连续一遍”标记。结束自动写full-song-playback与live-audio-measurements。校准需完整播放后运行 `python Tools/calibrate_live_audio.py`，再重建场景绑定新校准。动态调试编译会阻塞主线程，性能观测期间避免使用execute_code。

截图菜单为 `QingTian/Evidence/Capture live panel` / `Capture C1–C4`。录屏工具record_editor.py支持观察到的Unity桌面物理边界；交付短录屏是实际Editor运行、无声，听音乐请用Unity现场或单独68 BPM核对文件。

新克隆恢复本地音源：`python Tools/restore_audio.py 原始FLAC绝对路径`，先验证源SHA，再用ffmpeg转换；Unity执行 `QingTian/1 - Build or repair M1 scene` 重新绑定。此菜单会重建M1，进入M2后不得覆盖手工场景。完整研究重算用prepare_inputs.py，需要原研究归档；普通克隆不需要复制研究仓库。

MCP：Coplay10.3.0嵌入包，仅监听127.0.0.1:8082；本机服务 `../.unity-tools/mcp-10.3.0/Scripts/mcp-for-unity.exe`。可用QINGTIAN_MCP_SERVER覆盖路径，QINGTIAN_UNITY覆盖编辑器路径。菜单 `QingTian/Connect MCP` 重连，CLI客户端Tools/mcp_client.py使用现有MCP Python环境。来源、工程范围修正与许可证见 [LOCAL-CHANGES](Packages/com.coplaydev.unity-mcp/LOCAL-CHANGES.md)、[MIT LICENSE](Packages/com.coplaydev.unity-mcp/LICENSE)。

M2入口：菜单 `QingTian/M2/1 - Prepare or open M2 scene`，已有M2时只打开。用户创建图后由助手执行 `QingTian/M2/2 - Bind user-created M2 graph`；绑定工具只引用已有图，不创建节点。M2播放与截图证据输出`Docs/Evidence/M2`，不会覆盖M1实播证据。原根目录启动脚本仍默认M1。

M2画面模式：Play默认纯画面，先点击Game黑色区域取得焦点，F切换参数面板，Esc返回参数面板；面板右上也有纯画面按钮。空格暂停/继续、R重播、1–4定位在纯画面仍可用。参考图只在调试面板显示，纯画面始终只显示实时粒子。需要修复显示相机时，在Edit Mode执行`QingTian/M2/3 - Repair display and enable presentation view`，只更新M2显示相关配置。

## 8. 决定记录

- 2026-11-16 / 用户设计修正：撤回把四风格帧视为停留状态的理解。旧首尾保持、端点平滑插值、0.85秒压零、小扰动以及围绕固定光心的成对雾片，虽然能让参数连续与锚点精确，却无法保证主体持续推进、旋转、伸展和演变；局部粒子在动也不等于形体在动。改为形体动作先行，风格帧是穿行约束，材料跟随共同形体场。旧方法保留在以下历史记录与M1回归通道，不继续指导M2。
- 2026-11-16 / 本轮范围：用户要求检查并列出ScoreModel需要改什么，且Unity以Web确认后的剧本为准。本轮不抢先替换运行时或改测试断言；完成新版规范、具体迁移表、视频取样分析和教学执行方案。Web进行中的外部修改保留，不在本轮修补或提交。
- 2026-11-16 / 验证：独立CLI首次两次启动因原Editor尚未退出，没有新XML，不算测试失败或通过；确认退出后27+2全通过。给测试工具新增可选--evidence-dir，默认行为不变，新报告与M1历史报告分开。退出前SaveAssets落盘了用户未保存的图进展（Capacity32和Custom HLSL）；助手未编辑节点，不回滚、不混入本轮提交。

- 2026-11-16 / 首版流动雾：使用固定池+解析曲线路径，FlowPhase驱动，暂停/seek不依赖积分历史；相反位置及180度旋转的成对薄片稳定中心，目标数量用alpha平滑权重而非Set Alive。长轴使用MistSize画宽单位，短轴约0.26–0.34倍。LightScaleWorld从单Quad完整尺寸过渡为雾片中心分布范围依据；最终可见包络由尺寸/alpha/纹理共同决定，须实图校准。FlowPhase在本轮作无量纲运动相位，不把计划中的W/s冒充每片实测物理速度；运动幅度系数为待审美校准初值。
- 2026-11-16 / HLSL核对：Custom HLSL首次从Inspector的Shader File选外部文件，函数QingTianMist；不要让用户在画布加同名Operator。依据本机17.3源码与[官方Custom HLSL](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/Block-CustomHLSL.html)。核对发现VFX angle使用度，已把内部弧度转度并增加180度镜像检查，不能因通用HLSL编译成功就认为所有VFX语义正确。[角度属性官方定义](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/Reference-Attributes.html)。
- 2026-11-16 / 双光共用图：用户希望增加单轮成果，改为8步完成两光位置、颜色、范围和轻呼吸。用两个VisualEffect实例共享同一张用户图，各自接收A/B参数，避免重复维护两套节点；依据[VisualEffect组件与属性覆盖](https://docs.unity3d.com/Packages/com.unity.visualeffectgraph@17.3/manual/VisualEffectComponent.html)。原合同A/B名称不变，新增通用图端口属于适配层。后续每实例容量32，总预算64。
- 2026-11-16 / 双光初形：尺寸预设只写“包络尺寸”而未定义可见等亮线，本轮先将其解释为Quad完整宽高比例，明确为初形选择，不伪称从静态图测出sigma或半径。暂用SoftDisc和Additive建立两处发光关系；正式雾会另校准纹理/alpha/重叠，Additive不作为全层材质统一决定。LightGain已含RMS与Beat的平滑微扰，不再次叠Beat；MasterGain连接Alpha保证片头片尾渐隐。此阶段逻辑只需尺寸换算与乘法，HLSL留给后续多片雾的稳定分布/形变。
- 2026-11-16 / M2显示：用户反馈预览小且中央提示遮挡。保留固定RT、相机投影和原调试布局，新增可切换纯画面与独立Display黑底相机，不修改VFX节点和M1场景。相机targetTexture非空时输出到贴图而非屏幕，依据[Unity Camera.targetTexture](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Camera-targetTexture.html)；纯画面采用[ScaleToFit](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/ScaleMode.ScaleToFit.html)保留宽高比。额外显示相机开销未来计入M2同条件性能测试，此处不宣称零开销。
- 2026-11-16 / M2验证：浮动Game窗口会影响无目标贴图的测试相机投影，表现为边界偏差约0.01144世界单位；测试改用1280×720固定RT后20项通过。未改业务算法或放宽阈值。窗口事件注入在Unity未聚焦时未触发F，改为实际聚焦Game并发送原生按键，双向切换通过；屏幕坐标截图曾命中别的前台窗口，已删除该无效文件，最终证据使用选定Unity窗口的捕获。
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

- 当前停点：等待Web形体动作剧本的确认版本，再由助手准备M2新动作模块/桥/测试，用户按[M2新版教学](Docs/M2形体运动教学方案.md)亲手接图。旧节点保留待迁移；本轮未实现新形体导演，不再要求用户继续完成旧局部游移方案。
- 睡醒后复听68 BPM核对音频，确认重拍感；自动声学判断不能替代主观节奏判断。
- 时间骨架仍有21句低置信度；本轮保持既定时间线并显示置信度，不把它标为逐句听审通过。
- 四个锚点暂按用户确定值执行，未来视觉审阅后可以修改。
- 旧0.85秒整体压零与小幅游移已明确撤回为新视觉方案，不再列为待用户批准的初值。句成形权重、动作幅度/传播速度仍需按Web确认剧本定标；C1锚点所在L09置信度0.35需复听。
- 当前采用IMGUI调试布局，后续粒子阶段再按需隐藏/重排；左右对照、参考线、Solo和冻结层开关尚未实现，不属于本轮必需项。
- 自有代码和风格帧暂未另行授权开源许可证；公开仓库不等于放弃素材权利。若希望统一MIT等许可证再决定，第三方许可证已保留。

## 10. 变更日志

### 2026-11-16 — 最高设计原则修正：持续形体与瞬时锚点

完整阅读当前上下文、逐条核查ScoreModel/合同/桥/旧HLSL及Web版本；从本地参考视频抽取38帧并检查三个连续窗口。重写设计原则、三层时间语义、锚点处理和M2–M4计划，提供旧假设审计与新版教学。旧教程标为历史，M1运行时与参数JSON保持原样；新增测试报告目录选项，Unity独立CLI27/27+2/2通过。视频/音频/抽帧均留本地忽略目录；不提交歌词。Web正在进行的工作及用户图修改均保留。新形体动作运行时尚未实施，待确认Web剧本后接入。

### 2026-11-16 — 两光完成反馈，流动雾图外准备

读取用户完成的共用图并用MCP验证五个通用端口。新增解析雾HLSL、程序纹理及5项GPU算法测试，桥增加尺寸世界单位与两团固定错相输出；原参数演算、M1场景、用户图未改。提供完整8步带解释的流动雾指南，明确新图仍待用户手搭，四锚点外观、流动速度和雾性能尚未验收。VFX角度单位在核对官方源码时修正为度，并增加180度镜像检查。最终EditMode27/27、PlayMode2/2通过，0跳过，控制台无错误，恢复域重载设置。

### 2026-11-16 — A颜色通过，双光共用图准备

保存用户C1/C2色彩截图及用户图检查点；按最新偏好把每轮教学扩为完整可见成果的6–8步。新增图外LightInstance路由、画幅尺寸投影、M2双实例准备菜单，MCP实际创建并回读两实例共享图且分别绑定A/B。原图内容由用户保留，助手只准备外部引用；通用端口等待用户手搭。新增2项有意义的尺寸测试，EditMode22/22、PlayMode2/2通过；保持M1场景及原参数不变，域重载选项恢复。下一轮验收两光显示、尺寸和轻呼吸，再进入多片雾形态。

### 2026-11-16 — M2单点实播核验与显示修复

归档用户首次单点播放图。修复RT预览上“No cameras rendering”提示，新增M2纯画面/F切换、独立黑底显示相机；保留调试面板、参考图及原M1行为。实际键盘验证切换，采集两模式编辑器截图。回读7个真实GPU渲染样本的位置，通过单点管道关卡；不宣称完成雾或整曲视觉验收。20项EditMode和2项PlayMode通过，记录并修复测试相机依赖Game视图尺寸的问题。本轮未改用户VFX图；已返回M2 Edit Mode，下一组指导A颜色连接和临时放大。

### 2026-11-16 — M2第3步，位置输入与单点外观完成

用户报告完成后，只读核对保存的M2_Mist.vfx：LightCenterAWorld为Exposed Vector3，整组输出连接World系统Update的Set Position，Initialize Set Size=0.3，Output Main Texture GUID与SoftDisc.png.meta一致。没有替用户编辑图，没有修改运行时代码、场景或M1；本轮不重复已有22项测试，也不新增运行时通过结论。接下来由用户实播查看光点、四锚点位置及70–90秒移动，收到反馈后再做运行时证据核验。

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
