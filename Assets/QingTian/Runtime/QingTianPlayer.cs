using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace QingTian
{
    [RequireComponent(typeof(AudioSource))]
    public sealed class QingTianPlayer : MonoBehaviour
    {
        public AudioClip song;
        public TextAsset timeline, contract, beats, features, liveCalibration;
        public Texture2D[] referenceFrames;
        public bool autoPlay = true;
        public bool useCachedFeatures;
        [Tooltip("M2 optional camera output. Leave empty to retain the original M1 preview.")]
        public RenderTexture performancePreview;
        [Tooltip("M2 only: show the camera image without the debug panel. F toggles this during playback.")]
        public bool presentationView;
        public string stageLabel = "M1 参数演出";
        public string evidenceSubfolder = "";
        public ScoreModel Model { get; private set; }
        public SongClock Clock { get; private set; }
        public ParameterFrame Frame { get; private set; }
        public AudioSource Source { get; private set; }
        public double SongTime => Clock == null ? 0 : Clock.Time(AudioSettings.dspTime);
        public int OverlayIndex { get; private set; }
        public float OverlayOpacity { get; private set; }
        public float MaxSampleClockError { get; private set; }
        public int CompletedPasses { get; private set; }
        public string Status { get; private set; } = "等待播放";
        readonly float[] waveform = new float[1024], spectrum = new float[2048], previousSpectrum = new float[2048];
        readonly List<object> anchorsCrossed = new List<object>();
        readonly List<double[]> liveMeasurements = new List<double[]>();
        readonly List<float> frameIntervals = new List<float>();
        float[] liveNorm = { .2f, .06f, .025f, .15f };
        AudioSignals signals;
        double previousTime, auditStart, previousAuditFrame;
        int auditFrames;
        float minFrame = float.MaxValue, maxFrame;
        bool auditActive, suspended, didReachEnd;
        Vector2 scroll;
        string filter = "";
        Font font;
        GUIStyle label, title, small, mono, button;
        Texture2D pixel;
        static readonly string[] ChapterNames = { "C1  聚 · 光的靠近", "C2  分 · 雨与黑隙", "C3  近 · 花形与呼吸", "C4  散 · 星尘远去" };
        public string EvidenceRoot => Path.GetFullPath(Path.Combine(Application.dataPath, "../Docs/Evidence", evidenceSubfolder));

        void Awake() { Initialize(); }
        public void Initialize()
        {
            if (Model != null) return;
            Model = new ScoreModel(timeline.text, contract.text, beats.text, features.text);
            Clock = new SongClock(Model.Timeline.duration); Frame = Model.NewFrame();
            if (liveCalibration != null) liveNorm = JsonConvert.DeserializeObject<float[]>(liveCalibration.text);
            Source = GetComponent<AudioSource>(); Source.clip = song; Source.playOnAwake = false;
            Source.loop = false; Source.spatialBlend = 0; Source.pitch = 1;
            Application.targetFrameRate = 30; Application.runInBackground = true;
            QualitySettings.vSyncCount = 0;
            Model.Evaluate(0, signals, Frame);
        }
        void Start() { if (autoPlay) Play(); }
        public void Play()
        {
            if (song == null) { Status = "缺少本地音频：先运行 Tools/prepare_inputs.py"; return; }
            double t = Clock.State == PlaybackState.Ended ? 0 : SongTime;
            Schedule(t, Clock.State != PlaybackState.Paused);
            if (t == 0) BeginAudit();
        }
        void Schedule(double t, bool resetSignals = true)
        {
            Source.Stop(); Source.timeSamples = Math.Min(song.samples - 1, (int)Math.Round(t * song.frequency));
            double start = AudioSettings.dspTime + .10;
            Source.PlayScheduled(start); Clock.Play(start, t); previousTime = t;
            if (resetSignals) ResetSignals(); Status = "播放中 · 实时音频分析"; didReachEnd = false;
        }
        public void Pause()
        {
            if (Clock.State != PlaybackState.Playing) return;
            Clock.Pause(AudioSettings.dspTime); Source.Pause(); Status = "已暂停 · 参数保持";
            auditActive = false;
        }
        public void Replay() { if (song == null) { Play(); return; } Schedule(0); BeginAudit(); }
        public void Seek(double t)
        {
            t = double.IsNaN(t) || double.IsInfinity(t) ? 0 : Math.Max(0, Math.Min(Clock.Duration, t));
            bool playing = Clock.State == PlaybackState.Playing;
            auditActive = false;
            if (playing && t < Clock.Duration) Schedule(t);
            else { Source.Stop(); Clock.Seek(t, AudioSettings.dspTime); ResetSignals(); previousTime = t; }
            Model.Evaluate(t, signals, Frame);
            Status = playing ? "播放中 · 已定位" : "定位预览 · 点击播放继续";
        }
        public void JumpToAnchor(int index) { Pause(); Seek(Model.Contract.anchorTimes[Mathf.Clamp(index, 0, 3)]); SetOverlay(index, OverlayOpacity); }
        public void SetOverlay(int index, float alpha)
        { OverlayIndex = Mathf.Clamp(index, 0, 3); OverlayOpacity = float.IsNaN(alpha) ? 0 : Mathf.Clamp01(alpha); }
        void OnApplicationPause(bool paused)
        { if (paused) { suspended = Clock != null && Clock.State == PlaybackState.Playing; if (suspended) Pause(); } else if (suspended) { suspended = false; Play(); } }
        void ResetSignals() { signals = new AudioSignals(); Array.Clear(previousSpectrum, 0, previousSpectrum.Length); }
        void BeginAudit()
        { anchorsCrossed.Clear(); liveMeasurements.Clear(); frameIntervals.Clear(); auditActive = true; auditStart = previousAuditFrame = Time.realtimeSinceStartupAsDouble; auditFrames = 0; minFrame = float.MaxValue; maxFrame = 0; MaxSampleClockError = 0; }

        void Update()
        {
            if (Model == null) return;
            Clock.Tick(AudioSettings.dspTime); double t = SongTime;
            if (Clock.State == PlaybackState.Playing)
            {
                if (Clock.HasStarted(AudioSettings.dspTime)) signals = useCachedFeatures ? Model.CachedSignals(t) : MeasureAudio(Time.unscaledDeltaTime);
                if (Source.isPlaying && t > 1 && t < Clock.Duration - 1)
                    MaxSampleClockError = Mathf.Max(MaxSampleClockError, (float)Math.Abs(Source.timeSamples / (double)song.frequency - t));
                if (auditActive)
                {
                    double now = Time.realtimeSinceStartupAsDouble;
                    float interval = (float)(now - previousAuditFrame); previousAuditFrame = now;
                    if (auditFrames > 0) { frameIntervals.Add(interval); minFrame = Mathf.Min(minFrame, interval); maxFrame = Mathf.Max(maxFrame, interval); }
                    auditFrames++;
                    for (int i = 0; i < 4; i++) if (previousTime < Model.Contract.anchorTimes[i] && t >= Model.Contract.anchorTimes[i])
                    {
                        var exact = Model.NewFrame(); Model.Evaluate(Model.Contract.anchorTimes[i], signals, exact);
                        float error = 0;
                        foreach (var p in Model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++) error = Mathf.Max(error, Mathf.Abs(exact.Final[p.offset + j] - p.presets[i][j]));
                        anchorsCrossed.Add(new { chapter = i + 1, exactTime = exact.SongTime, sampledFrameTime = t, frameOvershoot = t - exact.SongTime, maxParameterError = error, rawRms = signals.rms });
                    }
                }
            }
            Model.Evaluate(t, signals, Frame); previousTime = t;
            if (Clock.State == PlaybackState.Ended && !didReachEnd)
            {
                Source.Stop(); didReachEnd = true; Status = "整曲结束 · 269.747 s";
                if (auditActive) FinishAudit();
            }
        }
        AudioSignals MeasureAudio(float dt)
        {
            Source.GetOutputData(waveform, 0); Source.GetSpectrumData(spectrum, 0, FFTWindow.BlackmanHarris);
            double sum = 0, low = 0, high = 0, flux = 0;
            foreach (float v in waveform) sum += v * v;
            float hz = AudioSettings.outputSampleRate / (2f * spectrum.Length);
            for (int i = 1; i < spectrum.Length; i++)
            {
                float f = i * hz, v = spectrum[i];
                if (f >= 30 && f <= 250) low += v * v;
                if (f >= 2000 && f <= 10000) high += v * v;
                flux += Math.Max(0, v - previousSpectrum[i]); previousSpectrum[i] = v;
            }
            // Calibration is p97 from a full real-time Unity pass at pitch 1 / 30 fps.
            // The scipy reference cache has its own normalization; it is not reused here.
            double rawRms = Math.Sqrt(sum / waveform.Length), rawLow = Math.Sqrt(low), rawHigh = Math.Sqrt(high);
            if (auditActive) liveMeasurements.Add(new[] { SongTime, rawRms, rawLow, rawHigh, flux });
            float r = Mathf.Clamp01((float)rawRms / Mathf.Max(liveNorm[0], .000001f));
            float l = Mathf.Clamp01((float)rawLow / Mathf.Max(liveNorm[1], .000001f));
            float h = Mathf.Clamp01((float)rawHigh / Mathf.Max(liveNorm[2], .000001f));
            float o = Mathf.Clamp01((float)flux / Mathf.Max(liveNorm[3], .000001f));
            return new AudioSignals(Follow(signals.rms, r, dt), Follow(signals.low, l, dt), Follow(signals.high, h, dt), Follow(signals.onset, o, dt));
        }
        static float Follow(float old, float target, float dt) => Mathf.Lerp(old, target, 1 - Mathf.Exp(-Mathf.Min(dt, .1f) / (target > old ? .03f : .18f)));
        void FinishAudit()
        {
            auditActive = false; CompletedPasses++; Directory.CreateDirectory(EvidenceRoot);
            frameIntervals.Sort();
            float Percentile(float q) => frameIntervals.Count == 0 ? 0 : frameIntervals[Mathf.Min(frameIntervals.Count - 1, Mathf.FloorToInt((frameIntervals.Count - 1) * q))];
            var result = new { completed = true, duration = SongTime, wallSeconds = Time.realtimeSinceStartupAsDouble - auditStart,
                audioClipLength = song.length, sampleRate = song.frequency, realtimeFeatures = !useCachedFeatures,
                renderedFrames = auditFrames, minFrameSeconds = minFrame, maxFrameSeconds = maxFrame,
                medianFrameSeconds = Percentile(.5f), p95FrameSeconds = Percentile(.95f), p99FrameSeconds = Percentile(.99f),
                maxAudioSampleVsDspSeconds = MaxSampleClockError, endMasterGain = Model.Get(Frame, "MasterGain"), anchors = anchorsCrossed };
            File.WriteAllText(Path.Combine(EvidenceRoot, "full-song-playback.json"), JsonConvert.SerializeObject(result, Formatting.Indented));
            File.WriteAllText(Path.Combine(EvidenceRoot, "live-audio-measurements.json"), JsonConvert.SerializeObject(new {
                columns = new[] { "songTime", "rawRms", "rawLow", "rawHigh", "rawFlux" },
                outputSampleRate = AudioSettings.outputSampleRate, spectrumSize = spectrum.Length, window = "BlackmanHarris", channel = 0,
                normalization = liveNorm, rows = liveMeasurements
            }));
            Debug.Log("[QingTian] Full song audit saved: " + EvidenceRoot);
        }
        public void Capture(string filename) { StartCoroutine(CaptureAtEnd(filename)); }
        IEnumerator CaptureAtEnd(string filename)
        { yield return new WaitForEndOfFrame(); Directory.CreateDirectory(EvidenceRoot); ScreenCapture.CaptureScreenshot(Path.Combine(EvidenceRoot, filename)); }

        void EnsureStyles()
        {
            if (label != null) return;
            font = Font.CreateDynamicFontFromOSFont(new[] { "Microsoft YaHei", "Segoe UI", "Arial" }, 20);
            label = new GUIStyle(GUI.skin.label) { font = font, fontSize = 18, normal = { textColor = new Color(.84f, .88f, .92f) } };
            small = new GUIStyle(label) { fontSize = 15 }; title = new GUIStyle(label) { fontSize = 32, fontStyle = FontStyle.Bold };
            mono = new GUIStyle(small) { alignment = TextAnchor.MiddleLeft };
            button = new GUIStyle(GUI.skin.button) { font = font, fontSize = 17 };
            pixel = new Texture2D(1, 1); pixel.SetPixel(0, 0, Color.white); pixel.Apply();
        }
        void Box(Rect r, Color color) { GUI.color = color; GUI.DrawTexture(r, pixel); GUI.color = Color.white; }
        void Text(float x, float y, float w, string value, GUIStyle style = null) => GUI.Label(new Rect(x, y, w, Mathf.Max(30, (style ?? label).fontSize + 14)), value, style ?? label);
        void Meter(float x, float y, float w, string name, float value, Color color)
        { Text(x, y, w, name + "   " + value.ToString("F3"), small); Box(new Rect(x, y + 29, w, 4), new Color(.13f, .16f, .2f)); Box(new Rect(x, y + 29, w * Mathf.Clamp01(value), 4), color); }
        string Values(float[] values, ParameterSpec p)
        {
            string text = "";
            for (int i = 0; i < p.minimum.Length; i++) text += (i > 0 ? (i == 2 ? "\n" : ", ") : "") + values[p.offset + i].ToString(p.maximum[i] > 100 ? "F1" : "F4");
            return text;
        }
        void OnGUI()
        {
            if (Model == null) return; EnsureStyles();
            HandlePlaybackKeys();
            if (performancePreview != null && presentationView)
            {
                GUI.matrix = Matrix4x4.identity;
                Box(new Rect(0, 0, Screen.width, Screen.height), Color.black);
                GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), performancePreview, ScaleMode.ScaleToFit, false);
                return;
            }
            float scale = Mathf.Min(Screen.width / 1920f, Screen.height / 1080f);
            GUI.matrix = Matrix4x4.TRS(new Vector3((Screen.width - 1920 * scale) / 2, (Screen.height - 1080 * scale) / 2), Quaternion.identity, Vector3.one * scale);
            Box(new Rect(0, 0, 1920, 1080), new Color(.025f, .033f, .045f));
            Text(38, 25, 900, "晴天 / QINGTIAN     " + stageLabel, title);
            Text(performancePreview == null ? 1270 : 1060, 35, 550, "UNITY 6.3 · URP · 30 FPS目标 · " + (performancePreview == null ? "无粒子" : "VFX GRAPH"), small);
            if (performancePreview != null && GUI.Button(new Rect(1610, 24, 270, 42), "纯画面 / 返回面板：F", button))
            { presentationView = true; GUIUtility.keyboardControl = 0; }
            Text(40, 80, 900, ChapterNames[Frame.ChapterIndex] + "     " + SongTime.ToString("F3") + " / 269.747 s");
            Text(1030, 80, 850, Status + (useCachedFeatures ? " [离线特征复核模式]" : " [LIVE]"), small);
            if (GUI.Button(new Rect(40, 124, 120, 38), Clock.State == PlaybackState.Playing ? "暂停" : "播放", button)) { if (Clock.State == PlaybackState.Playing) Pause(); else Play(); }
            if (GUI.Button(new Rect(172, 124, 120, 38), "从头重播", button)) Replay();
            float displayedTime = (float)Frame.SongTime;
            float position = GUI.HorizontalSlider(new Rect(320, 136, 1110, 24), displayedTime, 0, (float)Clock.Duration);
            if (Math.Abs(position - displayedTime) > .0001f) Seek(position);
            for (int i = 0; i < 4; i++) if (GUI.Button(new Rect(1460 + 104 * i, 124, 96, 38), "锚点 C" + (i + 1), button)) JumpToAnchor(i);
            Text(40, 176, 1840, Frame.LyricIndex < 0 ? "器乐 / 句间留白" : Model.Timeline.lyrics[Frame.LyricIndex].id + "  ·  " + Model.Timeline.lyrics[Frame.LyricIndex].imagery + "    | 成形：" + Model.Timeline.lyrics[Frame.LyricIndex].shape + "    | 置信度 " + Model.Timeline.lyrics[Frame.LyricIndex].confidence.ToString("F2"));

            Box(new Rect(40, 225, 800, 450), Color.black);
            if (performancePreview != null) GUI.DrawTexture(new Rect(40, 225, 800, 450), performancePreview, ScaleMode.StretchToFill, false);
            if (OverlayOpacity > 0 && referenceFrames != null && referenceFrames.Length == 4)
            { GUI.color = new Color(1, 1, 1, OverlayOpacity); GUI.DrawTexture(new Rect(40, 225, 800, 450), referenceFrames[OverlayIndex], ScaleMode.ScaleToFit); GUI.color = Color.white; }
            Text(58, 238, 760, OverlayOpacity > 0 ? "C" + (OverlayIndex + 1) + " 风格帧叠加 · 参考图片，不是实时粒子" : (performancePreview == null ? "纯黑演出窗口 · M1 尚无粒子" : "M2 相机实时输出 · 雾层搭建中"), small);
            Text(40, 692, 300, "风格帧对照");
            for (int i = 0; i < 4; i++) if (GUI.Button(new Rect(190 + 74 * i, 690, 66, 32), "C" + (i + 1), button)) SetOverlay(i, OverlayOpacity == 0 ? .65f : OverlayOpacity);
            Text(510, 692, 150, "透明度 " + OverlayOpacity.ToString("F2"), small);
            SetOverlay(OverlayIndex, GUI.HorizontalSlider(new Rect(660, 703, 180, 20), OverlayOpacity, 0, 1));
            var cyan = new Color(.22f, .78f, .83f); var gold = new Color(.98f, .69f, .3f);
            Meter(40, 754, 380, "慢 / C" + (Frame.ChapterIndex + 1) + " 权重", Frame.ChapterBlend[Frame.ChapterIndex], cyan);
            Meter(460, 754, 380, "中 / LyricEnvelope", Frame.LyricEnvelope, gold);
            Meter(40, 816, 240, "快 / BeatPulse", Frame.BeatPulse, gold);
            Meter(320, 816, 240, "快 / Rms01", Frame.Signals.rms, cyan);
            Meter(600, 816, 240, "Low01", Frame.Signals.low, cyan);
            Meter(40, 878, 240, "High01", Frame.Signals.high, cyan);
            Meter(320, 878, 240, "Onset01", Frame.Signals.onset, cyan);
            Meter(600, 878, 240, "AnchorFreedom", Frame.AnchorFreedom, gold);
            Text(40, 951, 820, "FlowPhase " + Frame.FlowPhase.ToString("F3") + "     68 BPM / phase 0     DSP Δmax " + MaxSampleClockError.ToString("F3") + " s", small);
            Text(40, 995, 820, "空格：暂停 / 继续    R：重播    1–4：精确锚点预览", small);
            Text(40, 1025, 820, "锚点约束只归零视觉调制；原始音频信号仍实时显示。", small);

            Box(new Rect(875, 225, 1005, 825), new Color(.045f, .06f, .078f));
            Text(895, 238, 400, "PARAMETER CONTRACT / 参数合同");
            filter = GUI.TextField(new Rect(1490, 236, 365, 30), filter);
            Text(895, 278, 230, "名称 / 可搜索", small); Text(1130, 278, 175, "慢 · 基准", small);
            Text(1310, 278, 150, "中 · 偏移", small); Text(1490, 278, 150, "快 · 偏移", small); Text(1665, 278, 200, "最终输出", small);
            int rows = 0; foreach (var p in Model.Contract.parameters) if (p.name.IndexOf(filter, StringComparison.OrdinalIgnoreCase) >= 0) rows++;
            scroll = GUI.BeginScrollView(new Rect(890, 315, 980, 714), scroll, new Rect(0, 0, 955, rows * 54 + Model.Contract.layers.Length * 38 + 50));
            int row = 0;
            foreach (var p in Model.Contract.parameters)
            {
                if (p.name.IndexOf(filter, StringComparison.OrdinalIgnoreCase) < 0) continue;
                float y = row++ * 54;
                if (row % 2 == 0) Box(new Rect(0, y, 955, 54), new Color(.06f, .08f, .1f));
                Text(4, y, 230, p.name, small); Text(4, y + 21, 220, p.kind, new GUIStyle(small) { fontSize = 11 });
                DrawValues(240, y, Frame.Slow, p); DrawValues(420, y, Frame.MidDelta, p); DrawValues(600, y, Frame.FastDelta, p); DrawValues(775, y, Frame.Final, p);
            }
            Text(4, row * 54 + 10, 940, "逐层附加输出：LayerDepth / LayerDepthJitter（非音频信号）", small);
            for (int i = 0; i < Model.Contract.layers.Length; i++) Text(4, row * 54 + 45 + i * 38, 940, Model.Contract.layers[i].layer + "     " + Frame.LayerDepth[i].ToString("F3") + " / " + Frame.LayerDepthJitter[i].ToString("F3"), small);
            GUI.EndScrollView();
            GUI.matrix = Matrix4x4.identity;
        }
        void HandlePlaybackKeys()
        {
            if (Event.current.type == EventType.KeyDown && GUIUtility.keyboardControl == 0)
            {
                if (performancePreview != null && Event.current.keyCode == KeyCode.F) { presentationView = !presentationView; Event.current.Use(); }
                if (performancePreview != null && Event.current.keyCode == KeyCode.Escape) { presentationView = false; Event.current.Use(); }
                if (Event.current.keyCode == KeyCode.Space) { if (Clock.State == PlaybackState.Playing) Pause(); else Play(); Event.current.Use(); }
                if (Event.current.keyCode == KeyCode.R) { Replay(); Event.current.Use(); }
                if (Event.current.keyCode >= KeyCode.Alpha1 && Event.current.keyCode <= KeyCode.Alpha4) { JumpToAnchor((int)Event.current.keyCode - (int)KeyCode.Alpha1); Event.current.Use(); }
            }
        }
        void DrawValues(float x, float y, float[] values, ParameterSpec p)
        {
            string value = Values(values, p);
            var style = new GUIStyle(mono) { fontSize = p.minimum.Length > 1 ? 12 : 16, wordWrap = true };
            GUI.Label(new Rect(x, y, 172, 52), value, style);
        }
        void OnDestroy() { if (pixel != null) Destroy(pixel); if (font != null) Destroy(font); }
    }
}
