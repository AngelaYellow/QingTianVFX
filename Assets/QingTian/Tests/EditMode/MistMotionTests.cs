using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace QingTian.Tests
{
    public sealed class MistMotionTests
    {
        static readonly Vector3 Center = new Vector3(-4.2f, 1.7f, 0);
        ComputeShader shader;
        ComputeBuffer buffer;

        [SetUp] public void SetUp()
        {
            if (!SystemInfo.supportsComputeShaders) Assert.Ignore("Requires compute shaders; not a passing mobile compatibility result.");
            shader = AssetDatabase.LoadAssetAtPath<ComputeShader>("Assets/QingTian/Tests/EditMode/MistMotionProbe.compute");
            Assert.That(shader, Is.Not.Null);
            buffer = new ComputeBuffer(64, 16);
        }
        [TearDown] public void TearDown() { buffer?.Release(); }

        Vector4[] Sample(float phase = 2.556f, float count = 48, float master = 1, float offset = 0)
        {
            int kernel = shader.FindKernel("Probe");
            shader.SetBuffer(kernel, "Results", buffer);
            shader.SetVector("Center", Center);
            shader.SetVector("Envelope", new Vector3(4.62f, 2, 1));
            shader.SetFloat("CardSize", 3.91f); shader.SetFloat("TotalCount", count);
            shader.SetFloat("Opacity", .14f); shader.SetFloat("Master", master);
            shader.SetFloat("Phase", phase); shader.SetFloat("PhaseOffset", offset);
            shader.Dispatch(kernel, 1, 1, 1);
            var result = new Vector4[64]; buffer.GetData(result); return result;
        }

        [Test] public void AnchorCountsDivideAcrossTwoLightsAndZeroFadesAll()
        {
            foreach (int count in new[] { 0, 24, 32, 40, 48, 64 })
            {
                var data = Sample(count: count); int visible = 0;
                for (int i = 0; i < 32; i++) if (data[i * 2].w > .001f) visible++;
                Assert.That(visible * 2, Is.EqualTo(count));
            }
            foreach (int i in new[] { 0, 8, 16, 24, 31 }) Assert.That(Sample(master: 0)[i * 2].w, Is.Zero);
        }

        [Test] public void OppositePairsKeepTheCloudCenteredDuringFlow()
        {
            foreach (float phase in new[] { 0f, 2.556f, 4.807f, 9f, 15f })
            {
                var data = Sample(phase);
                for (int pair = 0; pair < 16; pair++)
                {
                    Vector3 midpoint = ((Vector3)data[pair * 4] + (Vector3)data[pair * 4 + 2]) * .5f;
                    Assert.That(Vector3.Distance(midpoint, Center), Is.LessThan(1e-5f));
                    Assert.That(data[pair * 4].w, Is.EqualTo(data[pair * 4 + 2].w));
                    Assert.That(data[pair * 4 + 3].w - data[pair * 4 + 1].w,
                        Is.EqualTo(180).Within(.0001f), "VFX angles are degrees, not radians.");
                }
            }
        }

        [Test] public void SeekingAndPausingReproducePositionsWithoutSimulationHistory()
        {
            var before = Sample(); Sample(8); var after = Sample();
            Assert.That(after, Is.EqualTo(before));
            Assert.That(Sample(), Is.EqualTo(before));
            Assert.That(Sample(offset: 2.17f), Is.Not.EqualTo(before));
            Assert.That(Sample(2.8f), Is.Not.EqualTo(before));
        }

        [Test] public void TinyTimeAndCountChangesDoNotPopAtIntegerBoundaries()
        {
            var before = Sample(4.8f, 39.999f); var after = Sample(4.80001f, 40.001f);
            for (int i = 0; i < 64; i++) Assert.That(Vector4.Distance(before[i], after[i]), Is.LessThan(.001f));
        }

        [Test] public void EntirePhaseRangeHasFiniteBoundedPositionsScalesAndOpacity()
        {
            for (int t = 0; t <= 30; t++)
            {
                var data = Sample(t * .5f, 64);
                for (int i = 0; i < 32; i++)
                {
                    var p = data[i * 2]; var s = data[i * 2 + 1];
                    Assert.That(Mathf.Abs(p.x - Center.x), Is.LessThan(1.46f));
                    Assert.That(Mathf.Abs(p.y - Center.y), Is.LessThan(.55f));
                    Assert.That(Mathf.Abs(p.z), Is.LessThanOrEqualTo(.121f));
                    Assert.That(p.w, Is.InRange(0, .14001f));
                    Assert.That(s.x, Is.InRange(2.8f, 3.92f));
                    Assert.That(s.y, Is.InRange(.7f, 1.34f));
                    Assert.That(float.IsNaN(s.w) || float.IsInfinity(s.w), Is.False);
                }
            }
        }
    }
}
