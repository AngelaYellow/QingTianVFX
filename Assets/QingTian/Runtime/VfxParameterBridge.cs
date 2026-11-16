using UnityEngine;
using UnityEngine.VFX;

namespace QingTian
{
    public enum LightInstance { WholeGraph, A, B }
    // M2 adapter. M1 creates no VisualEffect, particle system, or graph.
    // Bind one adapter per graph/layer. Every write checks the declared VFX type.
    public sealed class VfxParameterBridge : MonoBehaviour
    {
        public QingTianPlayer player;
        public VisualEffect target;
        public Camera projectionCamera;
        [Min(.01f)] public float planeDistance = 10;
        [Range(0, 5)] public int layerIndex;
        public LightInstance lightInstance;
        public string PositionBindingStatus => target == null || target.visualEffectAsset == null ? "等待用户创建并绑定 VFX Graph"
            : projectionCamera == null ? "缺少投影相机"
            : !target.HasVector3(lightInstance == LightInstance.WholeGraph ? "LightCenterAWorld" : "LightCenterWorld")
                ? "图中尚无当前绑定方式要求的暴露位置输入"
                : "位置输入已可写入；仍需图中连接 Set Position 并检查实际渲染";

        void LateUpdate()
        {
            if (target == null || player == null || player.Frame == null) return;
            Apply(target, player.Model, player.Frame, layerIndex);
            if (projectionCamera == null) return;
            ApplyCenter("LightCenterA", "LightCenterAWorld");
            ApplyCenter("LightCenterB", "LightCenterBWorld");
            ApplyLightInstance();
        }
        void ApplyLightInstance()
        {
            if (lightInstance == LightInstance.WholeGraph) return;
            string suffix = lightInstance == LightInstance.A ? "A" : "B";
            var model = player.Model; var f = player.Frame.Final;
            int center = model.Spec("LightCenter" + suffix).offset;
            int scale = model.Spec("LightScale" + suffix).offset;
            int color = model.Spec("LightColor" + suffix).offset;
            if (target.HasVector3("LightCenterWorld")) target.SetVector3("LightCenterWorld",
                ToWorld(projectionCamera, new Vector2(f[center], f[center + 1]), planeDistance));
            if (target.HasVector3("LightScaleWorld")) target.SetVector3("LightScaleWorld",
                ToWorldSize(projectionCamera, new Vector2(f[scale], f[scale + 1]), planeDistance));
            if (target.HasVector4("LightColor")) target.SetVector4("LightColor",
                new Vector4(f[color], f[color + 1], f[color + 2], f[color + 3]));
            Set(target, "LightGain", model.Get(player.Frame, "LightGain" + suffix));
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
        // First two-light blockout: full quad width/height, expressed as fractions of the frame.
        // The texture's visible footprint is smaller than its quad; calibrate the final fog separately.
        public static Vector3 ToWorldSize(Camera camera, Vector2 frameSize, float distance)
        {
            var left = camera.ViewportToWorldPoint(new Vector3(0, .5f, distance));
            var right = camera.ViewportToWorldPoint(new Vector3(1, .5f, distance));
            var bottom = camera.ViewportToWorldPoint(new Vector3(.5f, 0, distance));
            var top = camera.ViewportToWorldPoint(new Vector3(.5f, 1, distance));
            return new Vector3(Vector3.Distance(left, right) * frameSize.x,
                Vector3.Distance(bottom, top) * frameSize.y, 1);
        }
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
