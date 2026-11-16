using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace QingTian.Tests
{
    public sealed class ProjectionTests
    {
        GameObject owner;
        Camera camera;
        RenderTexture target;
        [SetUp] public void CreateCamera()
        {
            owner = new GameObject("Projection test camera"); camera = owner.AddComponent<Camera>();
            // Match M2's fixed render surface; a floating Game View size can round viewport pixels.
            target = new RenderTexture(1280, 720, 0); camera.targetTexture = target;
            camera.orthographic = true; camera.orthographicSize = 5; camera.aspect = 16f / 9f;
            owner.transform.position = new Vector3(0, 0, -10);
        }
        [TearDown] public void CleanUp() { Object.DestroyImmediate(owner); Object.DestroyImmediate(target); }
        [Test] public void ImageTopLeftAndBottomRightReachCorrectCameraCorners()
        {
            var topLeft = VfxParameterBridge.ToWorld(camera, Vector2.zero, 10);
            var bottomRight = VfxParameterBridge.ToWorld(camera, Vector2.one, 10);
            Assert.That(topLeft.x, Is.EqualTo(-80f / 9).Within(.00001));
            Assert.That(topLeft.y, Is.EqualTo(5).Within(.00001));
            Assert.That(topLeft.z, Is.EqualTo(0).Within(.00001));
            Assert.That(bottomRight.x, Is.EqualTo(80f / 9).Within(.00001));
            Assert.That(bottomRight.y, Is.EqualTo(-5).Within(.00001));
        }
        [TestCase(0)] [TestCase(1)] [TestCase(2)] [TestCase(3)]
        public void BothAnchorCentersProjectBackToTheirReferenceImageCoordinates(int chapter)
        {
            string Read(string n) => File.ReadAllText(Path.Combine(Application.dataPath, "QingTian/Data/" + n + ".json"));
            var model = new ScoreModel(Read("timeline"), Read("parameter-contract"), Read("beats68"), Read("audio-features"));
            var frame = model.NewFrame(); model.Evaluate(model.Contract.anchorTimes[chapter], new AudioSignals(), frame);
            foreach (var p in model.Contract.parameters)
            {
                if (p.name != "LightCenterA" && p.name != "LightCenterB") continue;
                var uv = new Vector2(frame.Final[p.offset], frame.Final[p.offset + 1]);
                var viewport = camera.WorldToViewportPoint(VfxParameterBridge.ToWorld(camera, uv, 10));
                Assert.That(viewport.x, Is.EqualTo(uv.x).Within(.00001));
                Assert.That(viewport.y, Is.EqualTo(1 - uv.y).Within(.00001));
            }
        }
        [Test] public void ProjectionUsesCameraOrientationAndAspectInsteadOfScreenPixels()
        {
            camera.aspect = 1; owner.transform.SetPositionAndRotation(new Vector3(3, 4, -8), Quaternion.Euler(0, 25, 10));
            var center = VfxParameterBridge.ToWorld(camera, new Vector2(.5f, .5f), 10);
            Assert.That(Vector3.Distance(center, owner.transform.position + owner.transform.forward * 10), Is.LessThan(.0001));
            var edge = VfxParameterBridge.ToWorld(camera, new Vector2(1, .5f), 10);
            Assert.That(Vector3.Distance(edge, center), Is.EqualTo(5).Within(.0001));
        }
    }
}
