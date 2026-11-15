using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

namespace QingTian
{
    public enum PlaybackState { Stopped, Playing, Paused, Ended }

    // Pure DSP-domain transport: tests supply a fake clock, runtime supplies dspTime.
    public sealed class SongClock
    {
        public double Duration { get; }
        public PlaybackState State { get; private set; }
        double origin, offset;
        public SongClock(double duration)
        {
            if (duration <= 0 || double.IsNaN(duration)) throw new ArgumentOutOfRangeException(nameof(duration));
            Duration = duration;
        }
        public double Time(double dsp) => State == PlaybackState.Playing
            ? Math.Min(Duration, Math.Max(offset, offset + dsp - origin)) : offset;
        public bool HasStarted(double dsp) => State == PlaybackState.Playing && dsp >= origin;
        public void Play(double scheduledDsp, double position = 0)
        { origin = scheduledDsp; offset = Clamp(position); State = PlaybackState.Playing; }
        public void Pause(double dsp)
        { if (State != PlaybackState.Playing) return; offset = Time(dsp); State = PlaybackState.Paused; }
        public void Seek(double position, double dsp)
        { offset = Clamp(position); origin = dsp; if (State == PlaybackState.Ended) State = PlaybackState.Paused; }
        public void Stop() { offset = 0; State = PlaybackState.Stopped; }
        public void Tick(double dsp)
        { if (State == PlaybackState.Playing && Time(dsp) >= Duration) { offset = Duration; State = PlaybackState.Ended; } }
        double Clamp(double x) => double.IsNaN(x) || double.IsInfinity(x) ? 0 : Math.Min(Duration, Math.Max(0, x));
    }

    [Serializable] public sealed class Chapter { public string id; public double start, end; }
    [Serializable] public sealed class LyricUnit { public string id, chapter, shape, imagery; public double start, end; public float confidence; }
    [Serializable] public sealed class TimelineData { public double duration; public Chapter[] chapters; public LyricUnit[] lyrics; }
    [Serializable] public sealed class ParameterSpec
    {
        public string name, kind;
        public float[] minimum, maximum;
        public float[][] presets;
        [JsonIgnore] public int offset;
    }
    [Serializable] public sealed class LayerSpec { public string layer; public float[] LayerDepth, LayerDepthJitter; }
    [Serializable] public sealed class ContractData { public string version; public double[] anchorTimes; public ParameterSpec[] parameters; public LayerSpec[] layers; }
    [Serializable] public sealed class BeatData { public double bpm; public int phase; public double[] times; }
    [Serializable] public sealed class FeatureSample { public double t; public float rms, low, high, onset; }
    [Serializable] public sealed class FeatureData { public double step; public float[] normalization; public FeatureSample[] frames; }

    public struct AudioSignals
    {
        public float rms, low, high, onset;
        public AudioSignals(float rms, float low, float high, float onset)
        { this.rms = Clean(rms); this.low = Clean(low); this.high = Clean(high); this.onset = Clean(onset); }
        static float Clean(float v) => float.IsNaN(v) || float.IsInfinity(v) ? 0 : Mathf.Clamp01(v);
    }

    public sealed class ParameterFrame
    {
        public readonly float[] Slow, MidDelta, FastDelta, Final;
        public readonly float[] ChapterBlend = new float[4];
        public readonly float[] LayerDepth, LayerDepthJitter;
        public double SongTime, FlowPhase;
        public float LyricEnvelope, BeatPulse, AnchorFreedom;
        public AudioSignals Signals;
        public int ChapterIndex, LyricIndex;
        public ParameterFrame(int count, int layers)
        { Slow = new float[count]; MidDelta = new float[count]; FastDelta = new float[count]; Final = new float[count]; LayerDepth = new float[layers]; LayerDepthJitter = new float[layers]; }
    }

    public sealed class ScoreModel
    {
        public readonly TimelineData Timeline;
        public readonly ContractData Contract;
        public readonly BeatData Beats;
        public readonly FeatureData Features;
        public readonly int ValueCount;
        readonly Dictionary<string, ParameterSpec> byName = new Dictionary<string, ParameterSpec>();
        readonly double[] phaseIntegral;
        const double PhaseStep = .01;
        public ScoreModel(string timeline, string contract, string beats, string features)
        {
            Timeline = JsonConvert.DeserializeObject<TimelineData>(timeline);
            Contract = JsonConvert.DeserializeObject<ContractData>(contract);
            Beats = JsonConvert.DeserializeObject<BeatData>(beats);
            Features = JsonConvert.DeserializeObject<FeatureData>(features);
            Validate();
            int offset = 0;
            foreach (var p in Contract.parameters) { p.offset = offset; offset += p.minimum.Length; byName.Add(p.name, p); }
            ValueCount = offset;
            phaseIntegral = new double[(int)Math.Ceiling(Timeline.duration / PhaseStep) + 2];
            for (int i = 1; i < phaseIntegral.Length; i++)
                phaseIntegral[i] = phaseIntegral[i - 1] + (SlowScalar("FlowSpeed", (i - 1) * PhaseStep) + SlowScalar("FlowSpeed", i * PhaseStep)) * .5 * PhaseStep;
        }
        void Validate()
        {
            if (Timeline == null || Timeline.duration <= 0 || Timeline.chapters.Length != 4 || Contract.anchorTimes.Length != 4) throw new ArgumentException("Invalid score structure");
            double end = 0;
            foreach (var c in Timeline.chapters) { if (Math.Abs(c.start - end) > .001 || c.end <= c.start) throw new ArgumentException("Chapter gap/overlap"); end = c.end; }
            if (Math.Abs(end - Timeline.duration) > .001) throw new ArgumentException("Chapter duration mismatch");
            foreach (var l in Timeline.lyrics)
                if (l.start < 0 || l.end <= l.start || l.end > Timeline.duration) throw new ArgumentException("Invalid lyric interval");
            var names = new HashSet<string>();
            foreach (var p in Contract.parameters)
            {
                if (!names.Add(p.name) || p.presets.Length != 4 || p.minimum.Length != p.maximum.Length) throw new ArgumentException("Invalid parameter " + p.name);
                foreach (var preset in p.presets)
                {
                    if (preset.Length != p.minimum.Length) throw new ArgumentException("Parameter arity " + p.name);
                    for (int j = 0; j < preset.Length; j++)
                        if (float.IsNaN(preset[j]) || preset[j] < p.minimum[j] || preset[j] > p.maximum[j]) throw new ArgumentException("Parameter range " + p.name);
                }
            }
            for (int i = 0; i < 4; i++)
                if (Contract.anchorTimes[i] < Timeline.chapters[i].start || Contract.anchorTimes[i] >= Timeline.chapters[i].end) throw new ArgumentException("Anchor outside chapter");
            for (int i = 1; i < Beats.times.Length; i++) if (Beats.times[i] <= Beats.times[i - 1]) throw new ArgumentException("Unsorted beats");
        }
        public ParameterFrame NewFrame() => new ParameterFrame(ValueCount, Contract.layers.Length);
        public ParameterSpec Spec(string name) => byName[name];
        public float Get(ParameterFrame f, string name) => f.Final[byName[name].offset];
        public static float Smooth(float x) { x = Mathf.Clamp01(x); return Mathf.Clamp01(x * x * x * (x * (x * 6 - 15) + 10)); }
        void Span(double t, out int a, out int b, out float blend)
        {
            var keys = Contract.anchorTimes;
            if (t <= keys[0]) { a = b = 0; blend = 0; return; }
            if (t >= keys[3]) { a = b = 3; blend = 0; return; }
            a = 0; while (a < 2 && t >= keys[a + 1]) a++;
            b = a + 1; blend = Smooth((float)((t - keys[a]) / (keys[b] - keys[a])));
        }
        float SlowScalar(string name, double t)
        { Span(t, out int a, out int b, out float u); var p = byName[name]; return Mathf.Lerp(p.presets[a][0], p.presets[b][0], u); }
        public AudioSignals CachedSignals(double t)
        {
            double index = Math.Max(0, t / Features.step); int i = Math.Min((int)index, Features.frames.Length - 1), j = Math.Min(i + 1, Features.frames.Length - 1);
            float u = (float)Math.Min(1, index - i); var a = Features.frames[i]; var b = Features.frames[j];
            return new AudioSignals(Mathf.Lerp(a.rms, b.rms, u), Mathf.Lerp(a.low, b.low, u), Mathf.Lerp(a.high, b.high, u), Mathf.Lerp(a.onset, b.onset, u));
        }
        public int ChapterAt(double t)
        { for (int i = 0; i < Timeline.chapters.Length - 1; i++) if (t < Timeline.chapters[i].end) return i; return 3; }
        public int LyricAt(double t)
        { for (int i = 0; i < Timeline.lyrics.Length; i++) if (t >= Timeline.lyrics[i].start && t < Timeline.lyrics[i].end) return i; return -1; }
        public float PhraseEnvelope(double t)
        {
            float best = 0;
            foreach (var l in Timeline.lyrics)
            {
                if (t < l.start || t >= l.end) continue;
                float u = (float)((t - l.start) / (l.end - l.start));
                float shapeWeight = l.shape == "半成形" ? .65f : 1f;
                best = Mathf.Max(best, shapeWeight * Smooth(u / .20f) * Smooth((1 - u) / .35f));
            }
            return best;
        }
        public float PulseAt(double t)
        {
            int i = Array.BinarySearch(Beats.times, t); if (i < 0) i = ~i;
            float pulse = 0;
            for (int k = Math.Max(0, i - 1); k <= Math.Min(Beats.times.Length - 1, i + 1); k++)
            {
                double d = t - Beats.times[k];
                if (d >= -.04 && d <= .18) pulse = Mathf.Max(pulse, d < 0 ? Smooth((float)((d + .04) / .04)) : Smooth((float)(1 - d / .18)));
            }
            return pulse;
        }
        public void Evaluate(double seconds, AudioSignals input, ParameterFrame f)
        {
            double t = double.IsNaN(seconds) || double.IsInfinity(seconds) ? 0 : Math.Max(0, Math.Min(Timeline.duration, seconds));
            var signals = new AudioSignals(input.rms, input.low, input.high, input.onset);
            Span(t, out int a, out int b, out float u);
            Array.Clear(f.ChapterBlend, 0, 4); f.ChapterBlend[a] += 1 - u; f.ChapterBlend[b] += u;
            f.SongTime = t; f.ChapterIndex = ChapterAt(t); f.LyricIndex = LyricAt(t);
            f.LyricEnvelope = PhraseEnvelope(t); f.BeatPulse = PulseAt(t); f.Signals = signals;
            double distance = double.MaxValue; int exact = -1;
            for (int i = 0; i < 4; i++) { double d = Math.Abs(t - Contract.anchorTimes[i]); distance = Math.Min(distance, d); if (d < 1e-8) exact = i; }
            f.AnchorFreedom = Smooth((float)(distance / .85));
            float master = Smooth((float)(t / 8)) * Smooth((float)((Timeline.duration - t) / (Timeline.duration - 265.54)));
            foreach (var p in Contract.parameters)
            {
                for (int j = 0; j < p.minimum.Length; j++)
                {
                    int n = p.offset + j;
                    float slow = exact >= 0 ? p.presets[exact][j] : Mathf.Lerp(p.presets[a][j], p.presets[b][j], u), mid = 0, fast = 0;
                    if (p.name == "FlowerForm") mid = -slow * .65f * (1 - f.LyricEnvelope);
                    else if (p.name == "DustTargetCount") mid = slow * .08f * (f.LyricEnvelope - .5f);
                    else if (p.name == "LightScaleA" || p.name == "LightScaleB") mid = slow * .025f * (f.LyricEnvelope - .5f);
                    if (p.name.StartsWith("LightGain") || p.name == "DustGain" || p.name == "BokehGain") fast = slow * (.16f * (signals.rms - .5f) + .06f * f.BeatPulse);
                    else if (p.name == "FiberWidth") fast = slow * (.08f * (signals.low - .5f) + .035f * f.BeatPulse);
                    else if (p.name == "NoiseAmp") fast = slow * .25f * (signals.high - .5f);
                    else if (p.name == "RainSpeed") fast = slow * .08f * (signals.low - .5f);
                    if (p.name == "MasterGain") slow = master;
                    mid *= f.AnchorFreedom; fast *= f.AnchorFreedom;
                    f.Slow[n] = slow; f.MidDelta[n] = mid; f.FastDelta[n] = fast;
                    f.Final[n] = exact >= 0 ? p.presets[exact][j] : Mathf.Clamp(slow + mid + fast, p.minimum[j], p.maximum[j]);
                }
            }
            for (int i = 0; i < Contract.layers.Length; i++)
            {
                var layer = Contract.layers[i];
                f.LayerDepth[i] = Mathf.Lerp(layer.LayerDepth[a], layer.LayerDepth[b], u);
                f.LayerDepthJitter[i] = Mathf.Lerp(layer.LayerDepthJitter[a], layer.LayerDepthJitter[b], u);
            }
            double pi = t / PhaseStep; int ip = Math.Min((int)pi, phaseIntegral.Length - 2);
            f.FlowPhase = phaseIntegral[ip] + (phaseIntegral[ip + 1] - phaseIntegral[ip]) * (pi - ip);
        }
    }
}
