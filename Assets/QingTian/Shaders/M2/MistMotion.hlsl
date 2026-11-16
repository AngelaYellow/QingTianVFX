// M2: 32 persistent slots per light, 64 total. This is an analytic billboard
// layout, not a fluid simulation. FlowPhase is integrated by the song model.
#ifndef QINGTIAN_MIST_MOTION_INCLUDED
#define QINGTIAN_MIST_MOTION_INCLUDED

/// Hidden
float QingTianMistHash(in uint value)
{
    value ^= value >> 16;
    value *= 0x7feb352du;
    value ^= value >> 15;
    value *= 0x846ca68bu;
    value ^= value >> 16;
    return (value & 0x00ffffffu) / 16777216.0;
}

/// LightCenterWorld: Center of this light in world space, from the parameter bridge.
/// LightScaleWorld: Full reference envelope width and height; controls particle-center spread.
/// MistSizeWorld: Maximum mist-card long axis in world units, converted from MistSize * frame width.
/// MistTargetCount: TOTAL visible target across A and B, not the count for one instance.
/// MistOpacity: Per-card opacity. Count changes fade pairs rather than killing particles.
/// FlowPhase: Integral of FlowSpeed from song time; freezes on pause and reproduces on seek.
/// MistPhaseOffset: Fixed variation per light, A=0 and B=2.17; not an extra animation clock.
/// MasterGain: Song intro/outro fade, 0 to 1.
void QingTianMist(inout VFXAttributes attributes,
    in float3 LightCenterWorld, in float3 LightScaleWorld,
    in float MistSizeWorld, in float MistTargetCount, in float MistOpacity,
    in float FlowPhase, in float MistPhaseOffset, in float MasterGain)
{
    uint slot = attributes.particleId % 32u;
    uint pair = slot / 2u;
    float side = (slot % 2u == 0u) ? 1.0 : -1.0;
    float h0 = QingTianMistHash(pair * 5u + 11u);
    float h1 = QingTianMistHash(pair * 5u + 23u);
    float h2 = QingTianMistHash(pair * 5u + 37u);
    float phase = FlowPhase + MistPhaseOffset;
    float angle = 6.2831853 * h0 + phase * (0.55 + 0.45 * h1);
    float radius = 0.07 + 0.22 * sqrt(h2);
    float2 offset = radius * float2(cos(angle), 0.85 * sin(angle));
    offset += 0.025 * float2(sin(phase * 1.7 + h1 * 8.0), cos(phase * 1.3 + h0 * 7.0));

    // Opposite pairs retain the reference center even while the cloud flows.
    attributes.position = LightCenterWorld + side * float3(
        offset * max(LightScaleWorld.xy, float2(0.0, 0.0)),
        0.12 * sin(phase * 0.7 + h2 * 6.2831853));
    float width = max(0.001, MistSizeWorld) * (0.72 + 0.28 * h1);
    attributes.scaleX = width;
    attributes.scaleY = width * (0.26 + 0.08 * h2);
    attributes.scaleZ = 1.0;
    // Trig uses radians; VFX rotations are expressed in DEGREES.
    // Opposite cards must differ by 180 degrees to mirror their asymmetric masks.
    attributes.angleZ = 57.2957795 * ((h0 - 0.5) * 0.6 + 0.16 * sin(phase * 0.65 + h1 * 6.0))
        + ((slot % 2u == 0u) ? 0.0 : 180.0);

    // A pair in each instance represents four particles across the two lights.
    float pairWeight = saturate(clamp(MistTargetCount, 0.0, 64.0) * 0.25 - (float)pair);
    pairWeight = pairWeight * pairWeight * (3.0 - 2.0 * pairWeight);
    attributes.alpha = saturate(MistOpacity) * saturate(MasterGain) * pairWeight;
}
#endif
