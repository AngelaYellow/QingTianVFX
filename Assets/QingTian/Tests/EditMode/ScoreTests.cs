using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace QingTian.Tests
{
    public sealed class ScoreTests
    {
        ScoreModel model;
        [OneTimeSetUp] public void Load()
        {
            string Read(string n) => File.ReadAllText(Path.Combine(Application.dataPath, "QingTian/Data/" + n + ".json"));
            model = new ScoreModel(Read("timeline"), Read("parameter-contract"), Read("beats68"), Read("audio-features"));
        }
        [Test] public void ScheduledClockStartsAtZeroAndClampsAtSongEnd()
        {
            var c = new SongClock(269.747); c.Play(100.1);
            Assert.That(c.Time(100), Is.EqualTo(0)); Assert.That(c.Time(101.1), Is.EqualTo(1).Within(1e-10));
            Assert.That(c.HasStarted(100), Is.False); Assert.That(c.HasStarted(100.1), Is.True);
            c.Tick(400); Assert.That(c.Time(400), Is.EqualTo(269.747)); Assert.That(c.State, Is.EqualTo(PlaybackState.Ended));
        }
        [Test] public void PauseResumeHasNoWallTimeDrift()
        {
            var c = new SongClock(269.747); c.Play(10); c.Pause(22.345);
            Assert.That(c.Time(1000), Is.EqualTo(12.345).Within(1e-10));
            c.Play(1000, c.Time(1000)); Assert.That(c.Time(1003), Is.EqualTo(15.345).Within(1e-10));
        }
        [Test] public void SeekWorksPlayingPausedAndAtEndAndReplayResets()
        {
            var c = new SongClock(269.747); c.Play(10); c.Seek(90, 50);
            Assert.That(c.Time(51), Is.EqualTo(91)); c.Pause(51); c.Seek(56.8, 90);
            Assert.That(c.Time(100), Is.EqualTo(56.8)); c.Play(101, 269.74); c.Tick(102);
            c.Seek(5, 103); Assert.That(c.State, Is.EqualTo(PlaybackState.Paused)); c.Play(104);
            Assert.That(c.Time(104), Is.Zero); c.Seek(-4, 104); Assert.That(c.Time(104), Is.Zero);
            c.Seek(double.NaN, 104); Assert.That(c.Time(104), Is.Zero);
        }
        [Test] public void ChapterAndLyricLabelsAdvanceAtDeclaredBoundaries()
        {
            for (int i = 0; i < 4; i++)
            { var c = model.Timeline.chapters[i]; Assert.That(model.ChapterAt(c.start), Is.EqualTo(i)); Assert.That(model.ChapterAt(c.end - 1e-6), Is.EqualTo(i)); }
            for (int i = 0; i < model.Timeline.lyrics.Length; i++)
            { var l = model.Timeline.lyrics[i]; Assert.That(model.LyricAt((l.start + l.end) / 2), Is.EqualTo(i), l.id); Assert.That(model.PhraseEnvelope(l.start), Is.Zero.Within(1e-5)); }
            Assert.That(model.LyricAt(0), Is.EqualTo(-1)); Assert.That(model.LyricAt(model.Timeline.duration), Is.EqualTo(-1));
        }
        [TestCase(0)] [TestCase(1)] [TestCase(2)] [TestCase(3)]
        public void EveryAnchorExactlyEqualsPresetDespiteAudioExtreme(int i)
        {
            var f = model.NewFrame();
            foreach (var input in new[] { new AudioSignals(), new AudioSignals(1, 1, 1, 1), new AudioSignals(.3f, .9f, .7f, .8f) })
            {
                model.Evaluate(model.Contract.anchorTimes[i], input, f);
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++)
                { Assert.That(f.Final[p.offset + j], Is.EqualTo(p.presets[i][j]), p.name); Assert.That(f.MidDelta[p.offset + j], Is.Zero); Assert.That(f.FastDelta[p.offset + j], Is.Zero); }
                Assert.That(f.Signals.rms, Is.EqualTo(input.rms)); Assert.That(f.AnchorFreedom, Is.Zero);
                for (int l = 0; l < model.Contract.layers.Length; l++)
                { Assert.That(f.LayerDepth[l], Is.EqualTo(model.Contract.layers[l].LayerDepth[i])); Assert.That(f.LayerDepthJitter[l], Is.EqualTo(model.Contract.layers[l].LayerDepthJitter[i])); }
            }
        }
        [Test] public void AllParametersStayFiniteAndInRangeAcrossWholeSong()
        {
            var f = model.NewFrame(); var rng = new System.Random(17);
            for (int n = 0; n <= 32400; n++)
            {
                double t = Math.Min(model.Timeline.duration, n / 120d);
                model.Evaluate(t, new AudioSignals((float)rng.NextDouble(), (float)rng.NextDouble(), (float)rng.NextDouble(), (float)rng.NextDouble()), f);
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++)
                    Assert.That(f.Final[p.offset + j], Is.InRange(p.minimum[j], p.maximum[j]), p.name + " @ " + t);
                Assert.That(f.ChapterBlend.Sum(), Is.EqualTo(1).Within(1e-6));
            }
        }
        [Test] public void AllMusicalBoundariesAreContinuous()
        {
            var a = model.NewFrame(); var b = model.NewFrame();
            var times = model.Beats.times.Concat(model.Contract.anchorTimes).Concat(model.Timeline.chapters.Select(c => c.start)).Concat(model.Timeline.lyrics.SelectMany(l => new[] { l.start, l.end }));
            foreach (double t in times)
            {
                model.Evaluate(t - 1e-6, model.CachedSignals(t - 1e-6), a); model.Evaluate(t + 1e-6, model.CachedSignals(t + 1e-6), b);
                foreach (var p in model.Contract.parameters) for (int j = 0; j < p.minimum.Length; j++)
                { double delta = Math.Abs(a.Final[p.offset + j] - b.Final[p.offset + j]) / Math.Max(1e-5, p.maximum[j] - p.minimum[j]); Assert.That(delta, Is.LessThan(.0001), p.name + " @ " + t); }
                Assert.That(Math.Abs(a.BeatPulse - b.BeatPulse), Is.LessThan(.0001)); Assert.That(Math.Abs(a.LyricEnvelope - b.LyricEnvelope), Is.LessThan(.0001));
            }
        }
        [Test] public void RandomSeekingReturnsSameParametersAndFlowPhase()
        {
            var a = model.NewFrame(); var b = model.NewFrame();
            model.Evaluate(93.612, model.CachedSignals(93.612), a);
            model.Evaluate(250, model.CachedSignals(250), b); model.Evaluate(10, model.CachedSignals(10), b);
            model.Evaluate(93.612, model.CachedSignals(93.612), b);
            CollectionAssert.AreEqual(a.Final, b.Final); Assert.That(a.FlowPhase, Is.EqualTo(b.FlowPhase));
        }
        [Test] public void InvalidAudioInputIsSanitizedAndOutroFadesToBlack()
        {
            var f = model.NewFrame(); model.Evaluate(10, new AudioSignals(float.NaN, float.PositiveInfinity, -1, 9), f);
            Assert.That(f.Signals.rms, Is.Zero); Assert.That(f.Signals.onset, Is.EqualTo(1));
            model.Evaluate(0, new AudioSignals(), f); Assert.That(model.Get(f, "MasterGain"), Is.Zero);
            model.Evaluate(model.Timeline.duration, new AudioSignals(), f); Assert.That(model.Get(f, "MasterGain"), Is.Zero);
        }
        [Test] public void FormationLabelsChangePhraseStrengthWithoutBoundaryJumps()
        {
            foreach (var l in model.Timeline.lyrics)
                Assert.That(model.PhraseEnvelope((l.start + l.end) / 2), Is.EqualTo(l.shape == "半成形" ? .65f : 1).Within(1e-5), l.id);
        }
        [Test] public void HalfTimeBeatsAreSortedAndApproximately68Bpm()
        {
            Assert.That(model.Beats.bpm, Is.EqualTo(68).Within(.001));
            // MIR timestamps follow the recording; they are not a quantized metronome.
            var intervals = Enumerable.Range(1, model.Beats.times.Length - 1).Select(i => model.Beats.times[i] - model.Beats.times[i - 1]).OrderBy(x => x).ToArray();
            Assert.That(intervals[intervals.Length / 2], Is.EqualTo(60 / 68d).Within(.001));
            Assert.That(intervals.Min(), Is.GreaterThan(.75)); Assert.That(intervals.Max(), Is.LessThan(1));
            var original = JsonUtility.FromJson<BeatData>(File.ReadAllText(Path.Combine(Application.dataPath, "QingTian/Data/beats136-source.json")));
            for (int i = 0; i < model.Beats.times.Length; i++) Assert.That(model.Beats.times[i], Is.EqualTo(original.times[i * 2 + model.Beats.phase]).Within(1e-12));
        }
    }
}
