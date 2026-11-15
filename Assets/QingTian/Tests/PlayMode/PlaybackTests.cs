using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace QingTian.Tests
{
    public sealed class PlaybackTests
    {
        QingTianPlayer player;
        [UnitySetUp] public IEnumerator OpenScene()
        {
            yield return SceneManager.LoadSceneAsync("M1_ParameterPerformance");
            yield return null; player = Object.FindFirstObjectByType<QingTianPlayer>();
            Assert.That(player, Is.Not.Null); Assert.That(player.song, Is.Not.Null, "Run prepare_inputs.py before audio integration tests.");
            player.Pause(); player.Seek(0);
        }
        [UnityTest] public IEnumerator RealAudioClockPauseResumeSeekAndReplay()
        {
            player.Play(); yield return new WaitForSecondsRealtime(1.2f);
            Assert.That(player.Source.isPlaying, Is.True); Assert.That(player.SongTime, Is.InRange(.9, 1.4));
            Assert.That(player.Frame.Signals.rms, Is.GreaterThan(0));
            Assert.That(System.Math.Abs(player.Source.timeSamples / (double)player.song.frequency - player.SongTime), Is.LessThan(.12));
            player.Pause(); double t = player.SongTime; yield return new WaitForSecondsRealtime(.3f);
            Assert.That(player.SongTime, Is.EqualTo(t)); Assert.That(player.Source.isPlaying, Is.False);
            var held = (float[])player.Frame.Final.Clone(); player.Play(); yield return null;
            CollectionAssert.AreEqual(held, player.Frame.Final, "Scheduled resume must hold the paused visual frame before audio starts.");
            yield return new WaitForSecondsRealtime(.4f); Assert.That(player.SongTime, Is.GreaterThan(t + .2));
            player.Seek(155); yield return new WaitForSecondsRealtime(.4f); Assert.That(player.SongTime, Is.InRange(155.2, 155.5)); Assert.That(player.Frame.ChapterIndex, Is.EqualTo(2));
            player.Replay(); yield return new WaitForSecondsRealtime(.3f); Assert.That(player.SongTime, Is.InRange(.1, .4));
            player.Seek(269.6); yield return new WaitForSecondsRealtime(.5f); Assert.That(player.Clock.State, Is.EqualTo(PlaybackState.Ended)); Assert.That(player.SongTime, Is.EqualTo(269.747));
        }
        [UnityTest] public IEnumerator AllOverlayFramesAndExactPreviewWork()
        {
            for (int i = 0; i < 4; i++)
            {
                player.JumpToAnchor(i); player.SetOverlay(i, .7f); yield return null;
                Assert.That(player.OverlayIndex, Is.EqualTo(i)); Assert.That(player.OverlayOpacity, Is.EqualTo(.7f));
                Assert.That(player.referenceFrames[i], Is.Not.Null); Assert.That(player.SongTime, Is.EqualTo(player.Model.Contract.anchorTimes[i]));
                foreach (var p in player.Model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++) Assert.That(player.Frame.Final[p.offset + j], Is.EqualTo(p.presets[i][j]), p.name);
            }
            player.SetOverlay(20, -1); Assert.That(player.OverlayIndex, Is.EqualTo(3)); Assert.That(player.OverlayOpacity, Is.Zero);
            player.SetOverlay(-1, 2); Assert.That(player.OverlayIndex, Is.Zero); Assert.That(player.OverlayOpacity, Is.EqualTo(1));
        }
    }
}
