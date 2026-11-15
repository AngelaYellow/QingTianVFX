using System;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace QingTian.Editor
{
    public static class QingTianSetup
    {
        public const string ScenePath = "Assets/QingTian/Scenes/M1_ParameterPerformance.unity";
        static string Root => Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
        static TextAsset Data(string name) => AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/QingTian/Data/" + name + ".json");
        public static ScoreModel LoadModel() => new ScoreModel(Data("timeline").text, Data("parameter-contract").text, Data("beats68").text, Data("audio-features").text);

        [MenuItem("QingTian/0 - Open M1 scene")]
        public static void OpenPerformance()
        {
            if (EditorApplication.isPlaying) return;
            if (UnityEngine.SceneManagement.SceneManager.GetActiveScene().isDirty)
                throw new InvalidOperationException("Save current scene before opening M1.");
            EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
        }

        [MenuItem("QingTian/1 - Build or repair M1 scene")]
        public static void BuildScene()
        {
            if (EditorApplication.isPlaying) throw new InvalidOperationException("Exit Play Mode before rebuilding.");
            Directory.CreateDirectory(Path.Combine(Application.dataPath, "Template")); AssetDatabase.Refresh();
            foreach (string folder in new[] { "Scenes", "Settings", "TutorialInfo" })
                if (AssetDatabase.IsValidFolder("Assets/" + folder))
                { string error = AssetDatabase.MoveAsset("Assets/" + folder, "Assets/Template/" + folder); if (error.Length > 0) throw new Exception(error); }
            foreach (string file in new[] { "Readme.asset", "InputSystem_Actions.inputactions" })
                if (File.Exists(Path.Combine(Application.dataPath, file))) AssetDatabase.MoveAsset("Assets/" + file, "Assets/Template/" + file);

            string audioPath = "Assets/QingTian/Audio/LocalOnly/QingTian.wav";
            var importer = AssetImporter.GetAtPath(audioPath) as AudioImporter;
            if (importer != null)
            {
                var settings = importer.defaultSampleSettings;
                settings.loadType = AudioClipLoadType.DecompressOnLoad; settings.compressionFormat = AudioCompressionFormat.PCM;
                settings.sampleRateSetting = AudioSampleRateSetting.PreserveSampleRate;
                settings.preloadAudioData = true; importer.defaultSampleSettings = settings; importer.forceToMono = false;
                importer.SaveAndReimport();
            }
            for (int i = 1; i <= 4; i++)
            {
                var texture = (TextureImporter)AssetImporter.GetAtPath("Assets/QingTian/ReferenceFrames/C" + i + ".png");
                texture.maxTextureSize = 2048; texture.textureCompression = TextureImporterCompression.Uncompressed;
                texture.mipmapEnabled = false; texture.SaveAndReimport();
            }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var camObject = new GameObject("Main Camera"); camObject.tag = "MainCamera";
            var cam = camObject.AddComponent<Camera>(); cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
            camObject.transform.position = new Vector3(0, 0, -10); cam.orthographic = true; cam.orthographicSize = 5;
            camObject.AddComponent<AudioListener>();
            cam.GetUniversalAdditionalCameraData().renderPostProcessing = false;
            var playerObject = new GameObject("QingTian · M1 Controller");
            var player = playerObject.AddComponent<QingTianPlayer>();
            player.song = AssetDatabase.LoadAssetAtPath<AudioClip>(audioPath);
            player.timeline = Data("timeline"); player.contract = Data("parameter-contract"); player.beats = Data("beats68"); player.features = Data("audio-features");
            player.liveCalibration = Data("audio-live-normalization");
            player.referenceFrames = Enumerable.Range(1, 4).Select(i => AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/QingTian/ReferenceFrames/C" + i + ".png")).ToArray();
            player.autoPlay = true;
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            PlayerSettings.companyName = "AngelaYellow"; PlayerSettings.productName = "QingTianVFX";
            PlayerSettings.colorSpace = ColorSpace.Linear; PlayerSettings.runInBackground = true;
            PlayerSettings.defaultScreenWidth = 1920; PlayerSettings.defaultScreenHeight = 1080;
            QualitySettings.vSyncCount = 0;
            AssetDatabase.SaveAssets();
            Directory.CreateDirectory(Path.Combine(Root, "Docs/Evidence"));
            File.WriteAllText(Path.Combine(Root, "Docs/Evidence/project-setup.json"), JsonConvert.SerializeObject(new {
                unity = Application.unityVersion, projectPath = Root, source = "Unity installed URP official template 17.0.14, packages aligned to 17.3.0",
                pipeline = GraphicsSettings.defaultRenderPipeline == null ? "MISSING" : GraphicsSettings.defaultRenderPipeline.GetType().FullName,
                qualityPipeline = QualitySettings.renderPipeline == null ? "default" : QualitySettings.renderPipeline.name,
                scene = ScenePath, audioImported = player.song != null, audioSamples = player.song == null ? 0 : player.song.samples,
                originalSongTracked = false, particles = 0, background = "black", targetFps = 30
            }, Formatting.Indented));
            Debug.Log("[QingTian] M1 scene saved.");
        }

        [MenuItem("QingTian/2 - Export full song parameter evidence")]
        public static void ExportScore()
        {
            var model = LoadModel(); var frame = model.NewFrame();
            string output = Path.Combine(Root, "Docs/Evidence"); Directory.CreateDirectory(output);
            var times = new SortedSet<double>(Enumerable.Range(0, (int)(model.Timeline.duration * 120) + 1).Select(i => i / 120d));
            times.Add(model.Timeline.duration); foreach (double t in model.Contract.anchorTimes) times.Add(t);
            foreach (var c in model.Timeline.chapters) { times.Add(c.start); times.Add(c.end); }
            using (var fs = File.Create(Path.Combine(output, "parameters-120hz.csv.gz")))
            using (var gzip = new GZipStream(fs, System.IO.Compression.CompressionLevel.Optimal))
            using (var writer = new StreamWriter(gzip, new UTF8Encoding(false)))
            {
                var header = new List<string> { "time", "chapter", "lyric", "LyricEnvelope", "BeatPulse", "Rms01", "Low01", "High01", "Onset01", "AnchorFreedom", "FlowPhase" };
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++) foreach (string stage in new[] { "slow", "mid", "fast", "final" }) header.Add(p.name + (p.minimum.Length == 1 ? "" : "." + j) + "." + stage);
                foreach (var layer in model.Contract.layers) { header.Add(layer.layer + ".LayerDepth"); header.Add(layer.layer + ".LayerDepthJitter"); }
                writer.WriteLine(string.Join(",", header));
                foreach (double t in times)
                {
                    model.Evaluate(t, model.CachedSignals(t), frame);
                    var values = new List<double> { t, frame.ChapterIndex + 1, frame.LyricIndex, frame.LyricEnvelope, frame.BeatPulse, frame.Signals.rms, frame.Signals.low, frame.Signals.high, frame.Signals.onset, frame.AnchorFreedom, frame.FlowPhase };
                    foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++)
                    { int n = p.offset + j; values.Add(frame.Slow[n]); values.Add(frame.MidDelta[n]); values.Add(frame.FastDelta[n]); values.Add(frame.Final[n]); }
                    for (int i = 0; i < model.Contract.layers.Length; i++) { values.Add(frame.LayerDepth[i]); values.Add(frame.LayerDepthJitter[i]); }
                    writer.WriteLine(string.Join(",", values.Select(v => v.ToString("R", CultureInfo.InvariantCulture))));
                }
            }
            var events = new SortedSet<double>(model.Beats.times.Concat(model.Contract.anchorTimes).Concat(model.Timeline.chapters.Select(c => c.start)).Concat(model.Timeline.lyrics.SelectMany(l => new[] { l.start, l.end })));
            float maxNormalizedDifference = 0; string worst = ""; double worstTime = 0;
            var before = model.NewFrame(); var after = model.NewFrame();
            foreach (double t in events)
            {
                model.Evaluate(t - .000001, model.CachedSignals(t - .000001), before);
                model.Evaluate(t + .000001, model.CachedSignals(t + .000001), after);
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++)
                {
                    float delta = Mathf.Abs(before.Final[p.offset + j] - after.Final[p.offset + j]) / Mathf.Max(p.maximum[j] - p.minimum[j], .00001f);
                    if (delta > maxNormalizedDifference) { maxNormalizedDifference = delta; worst = p.name; worstTime = t; }
                }
            }
            var anchors = model.Contract.anchorTimes.Select((t, index) => {
                model.Evaluate(t, new AudioSignals(1, 1, 1, 1), frame); float error = 0;
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++) error = Mathf.Max(error, Mathf.Abs(frame.Final[p.offset + j] - p.presets[index][j]));
                return new { time = t, maximumAbsoluteError = error, inputRms = frame.Signals.rms, freedom = frame.AnchorFreedom };
            }).ToArray();
            File.WriteAllText(Path.Combine(output, "continuity-report.json"), JsonConvert.SerializeObject(new {
                generatedBy = "QingTian.ScoreModel (same C# evaluator as runtime)", featureMode = "deterministic cached features; runtime defaults to LIVE",
                sampleRate = 120, rows = times.Count, parameterNames = model.Contract.parameters.Length, scalarComponents = model.ValueCount,
                checkedEventCount = events.Count, epsilonSeconds = .000001, maximumNormalizedAcrossEventDifference = maxNormalizedDifference,
                worstParameter = worst, worstTime, anchors,
                interpretation = "Dense sampling and epsilon tests support C0 continuity. Discrete chapter/lyric labels are intentionally excluded; real-time audio variations are not claimed identical to cached curves."
            }, Formatting.Indented));
            Debug.Log("[QingTian] Score evidence exported.");
        }

        [MenuItem("QingTian/3 - Show Game view")]
        public static void ShowGame()
        { var type = typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView"); var view = EditorWindow.GetWindow(type); view.Focus(); view.maximized = true; }
    }
}
