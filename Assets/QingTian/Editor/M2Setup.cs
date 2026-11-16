using System;
using System.IO;
using Newtonsoft.Json;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.VFX;

namespace QingTian.Editor
{
    public static class M2Setup
    {
        public const string ScenePath = "Assets/QingTian/Scenes/M2_MistAndLights.unity";
        public const string GraphPath = "Assets/QingTian/VFX/M2_Mist.vfx";
        const string Settings = "Assets/QingTian/Settings/M2";

        [MenuItem("QingTian/M2/1 - Prepare or open M2 scene")]
        public static void Prepare()
        {
            if (EditorApplication.isPlaying) throw new InvalidOperationException("Exit Play Mode first.");
            if (SceneManager.GetActiveScene().isDirty) throw new InvalidOperationException("Save the current scene before opening M2.");
            // Never recreate a scene after the user has begun working in it.
            if (File.Exists(ScenePath)) { EditorSceneManager.OpenScene(ScenePath); return; }
            Directory.CreateDirectory(Settings);
            Directory.CreateDirectory("Assets/QingTian/VFX");
            Directory.CreateDirectory("Docs/Evidence/M2");
            AssetDatabase.Refresh();
            if (!AssetDatabase.CopyAsset(QingTianSetup.ScenePath, ScenePath)) throw new IOException("Could not copy M1 to a new M2 scene.");
            var scene = EditorSceneManager.OpenScene(ScenePath);
            var player = UnityEngine.Object.FindFirstObjectByType<QingTianPlayer>();
            var cam = Camera.main;
            var rt = new RenderTexture(1280, 720, 24, RenderTextureFormat.ARGBHalf, RenderTextureReadWrite.Linear)
            { name = "M2_Performance_1280x720", antiAliasing = 1, useMipMap = false, autoGenerateMips = false };
            AssetDatabase.CreateAsset(rt, Settings + "/M2_Performance.renderTexture");
            cam.targetTexture = rt; cam.aspect = 16f / 9f;
            cam.orthographic = true; cam.orthographicSize = 5;
            cam.transform.SetPositionAndRotation(new Vector3(0, 0, -10), Quaternion.identity);
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
            cam.allowHDR = true; cam.allowMSAA = false; cam.nearClipPlane = .1f; cam.farClipPlane = 50;
            cam.GetUniversalAdditionalCameraData().renderPostProcessing = true;
            player.performancePreview = rt; player.stageLabel = "M2 柔光雾与两处光";
            player.evidenceSubfolder = "M2";
            player.gameObject.name = "QingTian · M2 Controller";
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            profile.name = "M2_Bloom";
            AssetDatabase.CreateAsset(profile, Settings + "/M2_Bloom.asset");
            var bloom = profile.Add<Bloom>(true);
            bloom.intensity.Override(.35f); bloom.threshold.Override(1f);
            bloom.scatter.Override(.65f); bloom.highQualityFiltering.Override(false);
            AssetDatabase.AddObjectToAsset(bloom, profile);
            // The template pipeline's default profile enables Neutral tone mapping and vignette.
            // Override them locally so M2 evaluates color and size without inherited grading.
            var tonemapping = profile.Add<Tonemapping>(true);
            tonemapping.mode.Override(TonemappingMode.None); AssetDatabase.AddObjectToAsset(tonemapping, profile);
            var vignette = profile.Add<Vignette>(true);
            vignette.intensity.Override(0); AssetDatabase.AddObjectToAsset(vignette, profile);
            var volume = new GameObject("M2 · Bloom").AddComponent<Volume>();
            volume.isGlobal = true; volume.sharedProfile = profile;
            var root = new GameObject("VFX_Mist");
            var vfx = root.AddComponent<VisualEffect>();
            vfx.resetSeedOnPlay = false; vfx.startSeed = 68;
            var bridge = root.AddComponent<VfxParameterBridge>();
            bridge.player = player; bridge.target = vfx; bridge.projectionCamera = cam;
            bridge.layerIndex = 0; bridge.planeDistance = 10;
            ConfigureDisplay(player);
            EditorSceneManager.SaveScene(scene);
            AssetDatabase.SaveAssets();
            Selection.activeObject = AssetDatabase.LoadAssetAtPath<DefaultAsset>("Assets/QingTian/VFX");
            WriteSetupEvidence();
        }

        [MenuItem("QingTian/M2/2 - Bind user-created M2 graph")]
        public static void BindGraph()
        {
            if (EditorApplication.isPlaying || SceneManager.GetActiveScene().path != ScenePath)
                throw new InvalidOperationException("Open M2 in Edit Mode first.");
            var graph = AssetDatabase.LoadAssetAtPath<VisualEffectAsset>(GraphPath);
            if (graph == null) throw new InvalidOperationException("The user must first create " + GraphPath);
            var bridge = UnityEngine.Object.FindFirstObjectByType<VfxParameterBridge>();
            Undo.RecordObject(bridge.target, "Bind user-created M2 graph");
            bridge.target.visualEffectAsset = graph;
            EditorUtility.SetDirty(bridge.target);
            EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());
            EditorSceneManager.SaveScene(SceneManager.GetActiveScene());
            WriteSetupEvidence();
        }

        [MenuItem("QingTian/M2/3 - Repair display and enable presentation view")]
        public static void RepairDisplay()
        {
            if (EditorApplication.isPlaying || SceneManager.GetActiveScene().path != ScenePath)
                throw new InvalidOperationException("Open M2 in Edit Mode first.");
            ConfigureDisplay(UnityEngine.Object.FindFirstObjectByType<QingTianPlayer>());
            EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());
            EditorSceneManager.SaveScene(SceneManager.GetActiveScene());
        }

        static void ConfigureDisplay(QingTianPlayer player)
        {
            // The VFX camera renders into an RT. Give Display 1 a black background camera
            // so Unity does not draw its 'No cameras rendering' overlay over our IMGUI view.
            var displayObject = GameObject.Find("M2_Display");
            if (displayObject == null) { displayObject = new GameObject("M2_Display"); Undo.RegisterCreatedObjectUndo(displayObject, "Add M2 display camera"); }
            var display = displayObject.GetComponent<Camera>();
            if (display == null) display = Undo.AddComponent<Camera>(displayObject);
            Undo.RecordObject(display, "Configure M2 display camera");
            display.enabled = true; display.targetTexture = null; display.targetDisplay = 0;
            display.clearFlags = CameraClearFlags.SolidColor; display.backgroundColor = Color.black;
            display.cullingMask = 0; display.depth = -100; display.allowHDR = false; display.allowMSAA = false;
            display.useOcclusionCulling = false;
            var additional = display.GetUniversalAdditionalCameraData();
            additional.renderPostProcessing = false; additional.renderShadows = false;
            additional.requiresColorOption = CameraOverrideOption.Off;
            additional.requiresDepthOption = CameraOverrideOption.Off;
            Undo.RecordObject(player, "Enable M2 presentation view");
            player.presentationView = true;
            EditorUtility.SetDirty(player); EditorUtility.SetDirty(display); EditorUtility.SetDirty(additional);
        }

        public static void WriteSetupEvidence()
        {
            var bridge = UnityEngine.Object.FindFirstObjectByType<VfxParameterBridge>();
            var cam = bridge.projectionCamera;
            var sample = VfxParameterBridge.ToWorld(cam, new Vector2(.260257f, .330599f), 10);
            Directory.CreateDirectory("Docs/Evidence/M2");
            File.WriteAllText("Docs/Evidence/M2/setup.json", JsonConvert.SerializeObject(new {
                scene = SceneManager.GetActiveScene().path, graphCreatedByAssistant = false,
                graph = bridge.target.visualEffectAsset == null ? null : AssetDatabase.GetAssetPath(bridge.target.visualEffectAsset),
                binding = bridge.PositionBindingStatus, preview = new { width = cam.targetTexture.width, height = cam.targetTexture.height, hdr = cam.allowHDR },
                camera = new { orthographic = cam.orthographic, size = cam.orthographicSize, aspect = cam.aspect, planeDistance = bridge.planeDistance },
                bloom = new { intensity = .35f, threshold = 1f, scatter = .65f, highQuality = false },
                inheritedTemplateEffects = "Neutral tonemapping and vignette explicitly overridden to off in the M2 volume",
                c1CenterAWorld = new[] { sample.x, sample.y, sample.z },
                mistTotalCapacityBudget = 64, mistVisibleBudget = "24–48 total across A/B",
                actualRenderedParticlesVerified = false,
                iphone = "Basic unlit quad/compute path only; Metal device validation remains future work."
            }, Formatting.Indented));
            Debug.Log("[QingTian M2] " + bridge.PositionBindingStatus);
        }
    }
}
