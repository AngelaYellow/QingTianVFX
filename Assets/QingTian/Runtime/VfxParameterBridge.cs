using UnityEngine;
using UnityEngine.VFX;

namespace QingTian
{
    // M2 adapter. M1 creates no VisualEffect, particle system, or graph.
    // Bind one adapter per graph/layer. Every write checks the declared VFX type.
    public sealed class VfxParameterBridge : MonoBehaviour
    {
        public QingTianPlayer player;
        public VisualEffect target;
        public Camera projectionCamera;
        [Min(.01f)] public float planeDistance = 10;
        [Range(0, 5)] public int layerIndex;
        public string PositionBindingStatus => target == null || target.visualEffectAsset == null ? "等待用户创建并绑定 VFX Graph"
            : projectionCamera == null ? "缺少投影相机"
            : !target.HasVector3("LightCenterAWorld") ? "图中尚无已暴露的 Vector3 LightCenterAWorld"
            : "LightCenterA → LightCenterAWorld 已可写入；仍需图中连接 Set Position";

        void LateUpdate()
        {
            if (target == null || player == null || player.Frame == null) return;
            Apply(target, player.Model, player.Frame, layerIndex);
            if (projectionCamera == null) return;
            ApplyCenter("LightCenterA", "LightCenterAWorld");
            ApplyCenter("LightCenterB", "LightCenterBWorld");
        }
        void ApplyCenter(string contractName, string graphName)
        {
            if (!target.HasVector3(graphName)) return;
            foreach (var p in player.Model.Contract.parameters)
                if (p.name == contractName)
                {
                    var f = player.Frame.Final;
                    target.SetVector3(graphName, ToWorld(projectionCamera, new Vector2(f[p.offset], f[p.offset + 1]), planeDistance));
                    return;
                }
        }
        // Contract coordinates originate at the image's top-left; Unity viewport y points up.
        // No dependence on Game window resolution, UI scaling, or transform of the VFX object.
        // The graph must use World simulation space for these derived Vector3 properties.
        public static Vector3 ToWorld(Camera camera, Vector2 imagePosition, float distance)
            => camera.ViewportToWorldPoint(new Vector3(imagePosition.x, 1 - imagePosition.y, distance));
        public static void Apply(VisualEffect target, ScoreModel model, ParameterFrame frame, int layerIndex)
        {
            foreach (var p in model.Contract.parameters)
            {
                int id = Shader.PropertyToID(p.name), n = p.offset; var v = frame.Final;
                switch (p.kind)
                {
                    case "Float": if (target.HasFloat(id)) target.SetFloat(id, v[n]); break;
                    case "Vector2": if (target.HasVector2(id)) target.SetVector2(id, new Vector2(v[n], v[n + 1])); break;
                    case "Vector3": if (target.HasVector3(id)) target.SetVector3(id, new Vector3(v[n], v[n + 1], v[n + 2])); break;
                    case "Color": if (target.HasVector4(id)) target.SetVector4(id, new Vector4(v[n], v[n + 1], v[n + 2], v[n + 3])); break;
                }
            }
            Set(target, "SongTime", (float)frame.SongTime); Set(target, "FlowPhase", (float)frame.FlowPhase);
            int blendId = Shader.PropertyToID("ChapterBlend");
            if (target.HasVector4(blendId)) target.SetVector4(blendId, new Vector4(frame.ChapterBlend[0], frame.ChapterBlend[1], frame.ChapterBlend[2], frame.ChapterBlend[3]));
            Set(target, "LyricEnvelope", frame.LyricEnvelope); Set(target, "BeatPulse", frame.BeatPulse);
            Set(target, "Rms01", frame.Signals.rms); Set(target, "Low01", frame.Signals.low); Set(target, "High01", frame.Signals.high); Set(target, "Onset01", frame.Signals.onset);
            int layer = Mathf.Clamp(layerIndex, 0, model.Contract.layers.Length - 1);
            Set(target, "LayerDepth", frame.LayerDepth[layer]); Set(target, "LayerDepthJitter", frame.LayerDepthJitter[layer]);
        }
        static void Set(VisualEffect target, string name, float value) { int id = Shader.PropertyToID(name); if (target.HasFloat(id)) target.SetFloat(id, value); }
    }
}
