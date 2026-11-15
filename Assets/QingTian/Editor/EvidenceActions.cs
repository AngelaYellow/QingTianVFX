using System;
using UnityEditor;
using UnityEngine;

namespace QingTian.Editor
{
    public static class EvidenceActions
    {
        static QingTianPlayer Player()
        {
            if (!EditorApplication.isPlaying) throw new InvalidOperationException("Enter Play Mode first.");
            return UnityEngine.Object.FindFirstObjectByType<QingTianPlayer>();
        }
        [MenuItem("QingTian/Evidence/Capture live panel")]
        public static void Live() => Player().Capture("M1_live_panel.png");
        [MenuItem("QingTian/Evidence/Capture C1")]
        public static void C1() => CaptureAnchor(0);
        [MenuItem("QingTian/Evidence/Capture C2")]
        public static void C2() => CaptureAnchor(1);
        [MenuItem("QingTian/Evidence/Capture C3")]
        public static void C3() => CaptureAnchor(2);
        [MenuItem("QingTian/Evidence/Capture C4")]
        public static void C4() => CaptureAnchor(3);
        static void CaptureAnchor(int i)
        { var p = Player(); p.JumpToAnchor(i); p.SetOverlay(i, .65f); p.Capture("M1_C" + (i + 1) + "_overlay.png"); }
        [MenuItem("QingTian/Evidence/Replay clean full song")]
        public static void Replay() { var p = Player(); p.SetOverlay(0, 0); p.Replay(); }
        [MenuItem("QingTian/Evidence/Exit saved editor for CLI tests")]
        public static void ExitForTests()
        {
            if (EditorApplication.isPlaying) throw new InvalidOperationException("Exit Play Mode first.");
            if (UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene().isDirty) throw new InvalidOperationException("Save the scene first.");
            AssetDatabase.SaveAssets(); EditorApplication.delayCall += () => EditorApplication.Exit(0);
        }
    }
}
