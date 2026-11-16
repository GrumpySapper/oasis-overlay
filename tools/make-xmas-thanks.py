#!/usr/bin/env python3
"""Regenerate Christmas gift-thank audio (sleigh bells + Santa ho-ho-hos).

The committed MP3s in sounds/xmas-thanks/ were produced by this script's
jingle synthesizer, then a second pass that darkens the ho-ho-hos (low-pass
around 4 kHz, parallel formants, quieter breath/grit) and peaks them at
about -3 dBFS. Re-running this file alone rebuilds the first-pass hos;
leave the committed MP3s as the preview source of truth unless you intend
to replace them.

Licence: CC0 1.0. Melody quoted: public-domain "Jingle Bells" (Pierpont, 1857).
See sounds/xmas-thanks/SOURCES.md.
"""
from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter, butter

SR = 44100
RNG = np.random.default_rng(20261116)


def fade(x: np.ndarray, ms: float = 8) -> np.ndarray:
    n = min(len(x), int(SR * ms / 1000))
    if n <= 0:
        return x
    env = np.linspace(0, 1, n)
    y = x.copy()
    y[:n] *= env
    y[-n:] *= env[::-1]
    return y


def env_adsr(n: int, a: float, d: float, s: float, r: float, slvl: float = 0.7) -> np.ndarray:
    aa, dd, rr = int(a * SR), int(d * SR), int(r * SR)
    ss = max(0, n - aa - dd - rr)
    parts = []
    if aa:
        parts.append(np.linspace(0, 1, aa))
    if dd:
        parts.append(np.linspace(1, slvl, dd))
    if ss:
        parts.append(np.full(ss, slvl))
    if rr:
        parts.append(np.linspace(slvl if ss or dd else 1, 0, rr))
    e = np.concatenate(parts) if parts else np.ones(n)
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def biquad_resonator(freq: float, bw: float):
    # Two-pole resonator: y[n] = x[n] + 2 r cos(w) y[n-1] - r^2 y[n-2]
    r = math.exp(-math.pi * bw / SR)
    w = 2 * math.pi * freq / SR
    b = np.array([1.0, 0.0, 0.0])
    a = np.array([1.0, -2 * r * math.cos(w), r * r])
    return b, a


def apply_formants(src: np.ndarray, formants: list[tuple[float, float]]) -> np.ndarray:
    y = src
    for freq, bw in formants:
        b, a = biquad_resonator(freq, bw)
        y = lfilter(b, a, y)
    # lip radiation (+6 dB/oct)
    rad = np.zeros_like(y)
    rad[1:] = y[1:] - y[:-1]
    return rad


def rosenberg_source(f0: np.ndarray, open_ratio: float = 0.62) -> np.ndarray:
    n = len(f0)
    y = np.zeros(n)
    phase = 0.0
    tp = open_ratio * 0.6
    te = open_ratio
    for i in range(n):
        phase += f0[i] / SR
        if phase >= 1.0:
            phase -= 1.0
        if phase < tp:
            y[i] = 0.5 * (1 - math.cos(math.pi * phase / tp))
        elif phase < te:
            y[i] = math.cos(math.pi * (phase - tp) / (2 * (te - tp)))
        else:
            y[i] = 0.0
    return y


def hoop(duration: float, f0_start: float, f0_end: float, breath: float = 0.055, grit: float = 0.12) -> np.ndarray:
    """One 'ho': short [h] breath + rounded 'o' vowel, falling pitch."""
    n = int(duration * SR)
    t = np.arange(n) / SR
    # slight bounce then fall
    bump = np.exp(-t * 18) * (f0_start * 0.06)
    f0 = np.linspace(f0_start, f0_end, n) + bump
    f0 += RNG.normal(0, 0.6, n)  # jitter
    src = rosenberg_source(f0, open_ratio=0.66)
    # dark, jolly 'o' (rounded back vowel)
    voiced = apply_formants(src, [(460, 90), (820, 110), (2450, 160), (3200, 200)])
    # [h] aspiration through the same mouth shape
    hb = int(breath * SR)
    noise = RNG.normal(0, 1, n)
    b_hp, a_hp = butter(2, 700 / (SR / 2), btype="highpass")
    breath_n = lfilter(b_hp, a_hp, noise)
    breath_n = apply_formants(breath_n, [(460, 140), (820, 160), (2450, 200)])
    h_env = np.zeros(n)
    if hb > 0:
        h_env[:hb] = env_adsr(hb, 0.01, 0.015, 0.0, max(0.01, breath - 0.025), slvl=0.5)
    # grit / rasp follows the glottal envelope
    grit_sig = lfilter(*butter(2, [300 / (SR / 2), 3500 / (SR / 2)], btype="band"), noise)
    v_env = env_adsr(n, 0.025, 0.05, 0.08, 0.09, slvl=0.85)
    # delay voicing slightly so the H leads
    v_shift = int(0.028 * SR)
    voiced_al = np.zeros(n)
    voiced_al[v_shift:] = voiced[: n - v_shift]
    y = (voiced_al * v_env) + (breath_n * h_env * 0.55) + (grit_sig * np.abs(voiced_al) * v_env * grit)
    y = fade(y, 6)
    peak = np.max(np.abs(y)) or 1
    return y / peak * 0.9


def hos(count: int, f0: float = 118.0, gap: float = 0.085, last_long: bool = True) -> np.ndarray:
    parts = []
    for i in range(count):
        is_last = i == count - 1
        dur = 0.36 if (is_last and last_long) else 0.22 + 0.02 * (i % 2)
        start = f0 * (1 - i * 0.045)
        end = start * (0.72 if is_last else 0.88)
        parts.append(hoop(dur, start, end, breath=0.05 + 0.008 * i, grit=0.11 + 0.02 * (i % 2)))
        if not is_last:
            parts.append(np.zeros(int(gap * SR)))
    y = np.concatenate(parts)
    return y


def reverb(x: np.ndarray, rt: float = 0.45, mix: float = 0.22) -> np.ndarray:
    delays = [0.0297, 0.0371, 0.0411, 0.0437]
    acc = np.zeros(len(x) + int(rt * SR) + 2000)
    acc[: len(x)] = x
    for d in delays:
        n = int(d * SR)
        decay = math.exp(-6.907 * d / rt)  # ~-60 dB at rt
        comb = np.zeros_like(acc)
        for i in range(n, len(acc)):
            comb[i] = acc[i - n] + decay * comb[i - n]
        # this inner python loop is slow on long buffers; use lfilter instead
    # faster comb via lfilter
    acc = np.zeros(len(x) + int(0.6 * SR))
    acc[: len(x)] += x
    wet = np.zeros_like(acc)
    for d, g in zip(delays, [0.7, 0.65, 0.6, 0.55]):
        n = int(d * SR)
        b = np.zeros(n + 1)
        b[n] = 1.0
        a = np.zeros(n + 1)
        a[0] = 1.0
        a[n] = -g
        wet += lfilter(b, a, acc)
    wet *= 0.25
    out = acc + wet * (mix / 0.22)
    return out


# ---- sleigh / pitched bells -------------------------------------------------

BELL_MODES = (1.0, 2.756, 5.404, 8.415, 11.21, 14.37)


def metallic_hit(freq: float, dur: float, amp: float = 0.4, bright: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for i, m in enumerate(BELL_MODES):
        a = amp / (1 + i * 0.85) * (0.7 + 0.3 * bright)
        dec = 0.35 + 0.9 / (1 + i)  # higher modes die faster
        y += a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t / (dur * dec * 0.55))
    # very short noise tick
    tick_n = int(0.012 * SR)
    noise = RNG.normal(0, 1, n)
    b, a = butter(2, [1800 / (SR / 2), 9000 / (SR / 2)], btype="band")
    tick = lfilter(b, a, noise) * np.exp(-t / 0.008)
    y += tick * 0.08 * amp
    return fade(y, 3)


def sleigh_shake(dur: float, density: float = 18.0, amp: float = 0.28) -> np.ndarray:
    n = int(dur * SR)
    y = np.zeros(n)
    t = 0.0
    while t < dur - 0.02:
        f = float(RNG.uniform(2400, 6200))
        hit = metallic_hit(f, 0.12, amp=amp * float(RNG.uniform(0.45, 1.0)), bright=float(RNG.uniform(0.7, 1.2)))
        at = int(t * SR)
        end = min(n, at + len(hit))
        y[at:end] += hit[: end - at]
        t += float(RNG.uniform(0.7, 1.3)) / density
    # overall shake envelope
    e = env_adsr(n, 0.02, 0.05, 0.04, 0.08, slvl=0.85)
    return y * e


def phrase(notes: list[tuple[float, float, float]], shake: float = 0.0) -> np.ndarray:
    """notes: (freq_hz, start_s, dur_s). Optional opening shake."""
    total = 0.0
    for f, s, d in notes:
        total = max(total, s + d + 0.15)
    if shake:
        total = max(total, shake + 0.1)
    n = int((total + 0.25) * SR)
    y = np.zeros(n)
    if shake > 0:
        sh = sleigh_shake(shake, density=16, amp=0.22)
        y[: len(sh)] += sh
    for f, s, d in notes:
        hit = metallic_hit(f, d, amp=0.36, bright=0.9)
        at = int(s * SR)
        end = min(n, at + len(hit))
        y[at:end] += hit[: end - at]
    return y


# Public-domain "Jingle Bells" motif (Pierpont, 1857). MIDI-ish Hz.
E5, G5, C5, D5, F5, C6, G4, E4 = 659.25, 783.99, 523.25, 587.33, 698.46, 1046.50, 392.00, 329.63


def jingle_heartme() -> np.ndarray:
    return phrase([(E5, 0.08, 0.55), (E5 * 2, 0.16, 0.35)], shake=0.35)


def jingle_small() -> np.ndarray:
    return phrase([(E5, 0.10, 0.55), (G5, 0.28, 0.65)], shake=0.40)


def jingle_medium() -> np.ndarray:
    # E E E, E E E
    notes = []
    t = 0.18
    for _group in range(2):
        for i in range(3):
            notes.append((E5, t, 0.45 if i < 2 else 0.7))
            t += 0.18 if i < 2 else 0.36
        t += 0.04
    return phrase(notes, shake=0.42)


def jingle_big() -> np.ndarray:
    # E E E, E E E, E G C D E
    notes = []
    t = 0.16
    for i in range(3):
        notes.append((E5, t, 0.42)); t += 0.17
    t += 0.14
    for i in range(3):
        notes.append((E5, t, 0.42)); t += 0.17
    t += 0.16
    for f, step, dur in ((E5, 0.18, 0.4), (G5, 0.22, 0.5), (C5, 0.22, 0.5), (D5, 0.22, 0.5), (E5, 0.0, 1.1)):
        notes.append((f, t, dur))
        t += step
    return phrase(notes, shake=0.45)


def jingle_huge() -> np.ndarray:
    y1 = jingle_big()
    # continuation: G G F E D, C E G
    t0 = 2.15
    notes = [
        (G5, t0, 0.45), (G5, t0 + 0.18, 0.45), (F5, t0 + 0.38, 0.45),
        (E5, t0 + 0.58, 0.5), (D5, t0 + 0.80, 0.7),
        (C5, t0 + 1.15, 0.55), (E5, t0 + 1.38, 0.55), (G5, t0 + 1.62, 1.1),
    ]
    y2 = phrase(notes, shake=0.0)
    n = max(len(y1), len(y2))
    out = np.zeros(n)
    out[: len(y1)] += y1
    out[: len(y2)] += y2 * 0.95
    # closing shake
    sh = sleigh_shake(0.5, density=15, amp=0.16)
    at = int(3.55 * SR)
    if at + len(sh) > len(out):
        out = np.pad(out, (0, at + len(sh) - len(out)))
    out[at: at + len(sh)] += sh
    return out


def jingle_legend() -> np.ndarray:
    y = jingle_huge()
    # extra harmony dings + final C major sparkle
    extra = phrase([
        (C5, 3.85, 1.3), (E5, 3.90, 1.3), (G5, 3.95, 1.4), (C6, 4.05, 1.5),
    ], shake=0.0)
    sh = sleigh_shake(0.7, density=17, amp=0.2)
    n = max(len(y), len(extra), int(4.05 * SR) + len(sh))
    out = np.zeros(n)
    out[: len(y)] += y
    out[: len(extra)] += extra * 0.85
    at = int(4.3 * SR)
    if at + len(sh) > len(out):
        out = np.pad(out, (0, at + len(sh) - len(out)))
    out[at: at + len(sh)] += sh
    return out


# ---- mix / write ------------------------------------------------------------

def norm(x: np.ndarray, peak: float = 0.85) -> np.ndarray:
    x = np.nan_to_num(x)
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def mix_jingle_hos(jingle: np.ndarray, ho: np.ndarray, ho_at: float, jingle_lvl: float = 0.55, ho_lvl: float = 0.8) -> np.ndarray:
    j = reverb(norm(jingle, 0.85), rt=0.35, mix=0.18) * jingle_lvl
    h = reverb(norm(ho, 0.9), rt=0.5, mix=0.28) * ho_lvl
    at = int(ho_at * SR)
    n = max(len(j), at + len(h)) + int(0.15 * SR)
    y = np.zeros(n)
    y[: len(j)] += j
    y[at: at + len(h)] += h
    # soft limiter
    y = np.tanh(y * 1.15) / math.tanh(1.15)
    return fade(norm(y, 0.89), 12)


def write_wav(path: Path, x: np.ndarray) -> None:
    x = np.clip(x, -1, 1)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def wav_to_mp3(wav: Path, mp3: Path) -> None:
    subprocess.check_call([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
        "-codec:a", "libmp3lame", "-q:a", "2", "-ar", "44100", "-ac", "1",
        str(mp3),
    ])


def main() -> None:
    out = Path("/tmp/xmas-thanks")
    wavdir = out / "wav"
    wavdir.mkdir(parents=True, exist_ok=True)

    # ho variants
    ho_clips = {
        "ho-1": hos(1, f0=122, last_long=True),
        "ho-1b": hos(1, f0=108, last_long=True),
        "ho-2": hos(2, f0=120, gap=0.09),
        "ho-2b": hos(2, f0=110, gap=0.1),
        "ho-3": hos(3, f0=118, gap=0.08),
        "ho-3b": hos(3, f0=105, gap=0.09),
        "ho-4": hos(4, f0=116, gap=0.075),
        "ho-5": hos(5, f0=112, gap=0.07),
    }

    jingles = {
        "jingle-heartme": jingle_heartme(),
        "jingle-small": jingle_small(),
        "jingle-medium": jingle_medium(),
        "jingle-big": jingle_big(),
        "jingle-huge": jingle_huge(),
        "jingle-legend": jingle_legend(),
        "jingle-request": jingle_medium(),
    }

    combined = {
        "thanks-heartme": (jingles["jingle-heartme"], ho_clips["ho-1b"], 0.32, 0.50, 0.62),
        "thanks-small": (jingles["jingle-small"], ho_clips["ho-1"], 0.42, 0.52, 0.72),
        "thanks-medium": (jingles["jingle-medium"], ho_clips["ho-2"], 0.95, 0.55, 0.78),
        "thanks-request": (jingles["jingle-medium"], ho_clips["ho-2b"], 0.95, 0.55, 0.76),
        "thanks-big": (jingles["jingle-big"], ho_clips["ho-3"], 1.55, 0.55, 0.80),
        "thanks-big-b": (jingles["jingle-big"], ho_clips["ho-3b"], 1.55, 0.55, 0.80),
        "thanks-huge": (jingles["jingle-huge"], ho_clips["ho-4"], 2.15, 0.52, 0.82),
        "thanks-legend": (jingles["jingle-legend"], ho_clips["ho-5"], 2.85, 0.52, 0.84),
    }

    written = []
    for name, audio in {**ho_clips, **jingles}.items():
        # standalone parts, lightly reverbed, for the demo page "bits" if needed
        y = fade(norm(reverb(norm(audio, 0.9), rt=0.4, mix=0.2), 0.89), 10)
        wp = wavdir / f"{name}.wav"
        write_wav(wp, y)
        written.append(name)

    for name, (j, h, at, jl, hl) in combined.items():
        y = mix_jingle_hos(j, h, at, jingle_lvl=jl, ho_lvl=hl)
        wp = wavdir / f"{name}.wav"
        write_wav(wp, y)
        written.append(name)

    # encode all wavs
    for wav in sorted(wavdir.glob("*.wav")):
        mp3 = out / (wav.stem + ".mp3")
        wav_to_mp3(wav, mp3)
        print(f"wrote {mp3.name} ({mp3.stat().st_size} bytes)")

    # duration report
    print("\n--- durations / peaks ---")
    for wav in sorted(wavdir.glob("thanks-*.wav")):
        with wave.open(str(wav)) as w:
            dur = w.getnframes() / w.getframerate()
        # peak from file
        raw = np.frombuffer(Path(wav).read_bytes()[44:], dtype=np.int16)
        peak = np.max(np.abs(raw)) / 32767
        print(f"{wav.stem}: {dur:.2f}s  peak={peak:.3f}")


if __name__ == "__main__":
    main()
