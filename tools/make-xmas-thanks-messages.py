#!/usr/bin/env python3
"""Generate Santa-style spoken thank-you lines and mix them after the jingles.

Uses eSpeak NG (formant TTS) plus light processing. Released audio is CC0 1.0.
See sounds/xmas-thanks/SOURCES.md.
"""
from __future__ import annotations

import math
import os
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
ROOT = Path("/workspace/cf-wt/sounds/xmas-thanks")
ES = os.environ.get("ESPEAK_NG", "/tmp/tts/espeak/root/usr/bin/espeak-ng")
ES_ENV = {
    **os.environ,
    "LD_LIBRARY_PATH": os.environ.get(
        "LD_LIBRARY_PATH",
        "/tmp/tts/espeak/root/usr/lib/x86_64-linux-gnu",
    ),
    "ESPEAK_DATA_PATH": os.environ.get(
        "ESPEAK_DATA_PATH",
        "/tmp/tts/espeak/root/usr/lib/x86_64-linux-gnu/espeak-ng-data",
    ),
}

# id, tier, text, jingle stem, speech starts at (s), speed, pitch
# Lower pitch / slightly slower = warmer and bigger for higher tiers.
LINES = [
    ("heartme-1", "heartme", "Thank you!", "jingle-heartme", 0.32, 150, 38),
    ("heartme-2", "heartme", "Ho ho ho, thank you!", "jingle-heartme", 0.32, 148, 36),
    ("small-1", "small", "Thank you for the gift!", "jingle-small", 0.42, 148, 36),
    ("small-2", "small", "Thanks a lot, merry Christmas!", "jingle-small", 0.42, 148, 36),
    ("medium-1", "medium", "Ho ho ho, thank you for the gift!", "jingle-medium", 0.95, 140, 32),
    ("medium-2", "medium", "Thank you! You're on the nice list!", "jingle-medium", 0.95, 140, 32),
    ("medium-3", "medium", "Merry Christmas, and thank you!", "jingle-medium", 0.95, 140, 32),
    ("request-1", "request", "Thank you for the request!", "jingle-medium", 0.95, 140, 32),
    ("request-2", "request", "Ho ho ho, thank you, merry Christmas!", "jingle-medium", 0.95, 140, 32),
    ("big-1", "big", "Ho ho ho, thank you for that wonderful gift!", "jingle-big", 1.55, 135, 28),
    ("big-2", "big", "Thank you! You've been very generous!", "jingle-big", 1.55, 135, 28),
    ("big-3", "big", "Merry Christmas and thank you from Oasis Radio!", "jingle-big", 1.55, 135, 28),
    ("huge-1", "huge", "Ho ho ho! Thank you for that huge gift!", "jingle-huge", 2.15, 136, 25),
    ("huge-2", "huge", "What a Christmas treat! Thank you so much!", "jingle-huge", 2.15, 136, 25),
    ("legend-1", "legend", "Ho ho ho! Thank you, you legend! Merry Christmas!", "jingle-legend", 2.85, 135, 24),
    ("legend-2", "legend", "Ho ho ho, what a generous gift! You're top of the nice list!", "jingle-legend", 2.85, 135, 24),
]


def fade(x: np.ndarray, ms: float = 8) -> np.ndarray:
    n = min(len(x), int(SR * ms / 1000))
    if n <= 0:
        return x
    env = np.linspace(0, 1, n)
    y = x.copy()
    y[:n] *= env
    y[-n:] *= env[::-1]
    return y


def norm(x: np.ndarray, peak: float = 0.85) -> np.ndarray:
    x = np.nan_to_num(x)
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def butter_filt(x, kind, cuts, order=3):
    if isinstance(cuts, (int, float)):
        wn = cuts / (SR / 2)
    else:
        wn = [c / (SR / 2) for c in cuts]
    b, a = butter(order, wn, btype=kind)
    return lfilter(b, a, x)


def reverb(x: np.ndarray, rt: float = 0.35, mix: float = 0.14) -> np.ndarray:
    acc = np.zeros(len(x) + int(0.5 * SR))
    acc[: len(x)] += x
    wet = np.zeros_like(acc)
    for d, g in zip([0.027, 0.033, 0.041, 0.047], [0.55, 0.5, 0.45, 0.4]):
        n = int(d * SR)
        b = np.zeros(n + 1)
        b[n] = 1.0
        a = np.zeros(n + 1)
        a[0] = 1.0
        a[n] = -g
        wet += lfilter(b, a, acc)
    wet *= 0.25
    return acc + wet * (mix / 0.14)


def load_audio(path: Path) -> np.ndarray:
    """Decode any ffmpeg-readable file to mono float64 at SR."""
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path),
        "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", str(SR), "-",
    ])
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


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


def espeak(text: str, dest: Path, speed: int, pitch: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.check_call([
        ES, "-v", "en+santa", "-s", str(speed), "-p", str(pitch),
        "-g", "5", "-a", "140", "-w", str(dest), text,
    ], env=ES_ENV)


def process_speech(x: np.ndarray, bigger: bool) -> np.ndarray:
    # Mild pitch-down (bigger tiers a touch more), darken, chest warmth, short reverb.
    shift = 0.93 if bigger else 0.95
    # resample pitch via simple linear interpolation after rate idea:
    # use ffmpeg in a helper for quality
    return x, shift  # placeholder, real work below


def pitch_down(x: np.ndarray, factor: float) -> np.ndarray:
    """Lower pitch by resampling, then time-stretch back with linear hop (simple)."""
    # Write through ffmpeg for quality (asetrate + atempo)
    tmp_in = Path("/tmp/santa-work/in.wav")
    tmp_out = Path("/tmp/santa-work/out.wav")
    tmp_in.parent.mkdir(parents=True, exist_ok=True)
    write_wav(tmp_in, norm(x, 0.95))
    # atempo range is 0.5-2.0; factor 0.93-0.95 => atempo 1/factor ≈ 1.05-1.075
    atempo = min(2.0, max(0.5, 1.0 / factor))
    eq = "firequalizer=gain_entry='entry(100,4);entry(220,3.5);entry(700,0.5);entry(2500,-1.5);entry(6000,-5)'"
    verb = "aecho=0.85:0.7:28:0.12"
    af = f"asetrate={SR}*{factor}:.8f,aresample={SR},atempo={atempo:.4f},highpass=f=80,lowpass=f=5000,{eq},{verb}"
    # fix typo
    af = (
        f"asetrate={SR*factor:.2f},aresample={SR},atempo={atempo:.4f},"
        f"highpass=f=80,lowpass=f=5000,{eq},{verb}"
    )
    subprocess.check_call([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp_in), "-af", af, str(tmp_out),
    ])
    return load_audio(tmp_out)


def mix(jingle: np.ndarray, speech: np.ndarray, at: float) -> np.ndarray:
    j = reverb(norm(butter_filt(jingle, "lowpass", 11000, 2), 0.85), rt=0.32, mix=0.14) * 0.50
    s = reverb(norm(speech, 0.90), rt=0.28, mix=0.12) * 0.80
    start = int(at * SR)
    n = max(len(j), start + len(s)) + int(0.12 * SR)
    y = np.zeros(n)
    y[: len(j)] += j
    # duck jingle under the first words
    duck_from = max(0, start - int(0.06 * SR))
    duck_to = min(n, start + int(0.20 * SR))
    if duck_to > duck_from:
        fade_len = duck_to - duck_from
        y[duck_from:duck_to] *= np.linspace(1.0, 0.38, fade_len)
        y[duck_to: len(j)] *= 0.38
    y[start: start + len(s)] += s
    y = np.tanh(y * 1.05) / math.tanh(1.05)
    return fade(norm(y, 0.70), 12)


def main() -> None:
    wavdir = Path("/tmp/santa-work/wav")
    wavdir.mkdir(parents=True, exist_ok=True)
    report = []
    for ident, tier, text, jingle_stem, at, speed, pitch in LINES:
        raw = wavdir / f"msg-{ident}-raw.wav"
        espeak(text, raw, speed, pitch)
        speech_raw = load_audio(raw)
        bigger = tier in {"big", "huge", "legend"}
        speech = pitch_down(speech_raw, 0.93 if bigger else 0.95)
        speech = fade(norm(speech, 0.90), 8)
        write_wav(wavdir / f"msg-{ident}.wav", speech)
        wav_to_mp3(wavdir / f"msg-{ident}.wav", ROOT / f"msg-{ident}.mp3")

        jpath = ROOT / f"{jingle_stem}.mp3"
        jingle = load_audio(jpath)
        combined = mix(jingle, speech, at)
        write_wav(wavdir / f"thanks-{ident}.wav", combined)
        wav_to_mp3(wavdir / f"thanks-{ident}.wav", ROOT / f"thanks-{ident}.mp3")

        dur_s = len(speech) / SR
        dur_c = len(combined) / SR
        peak = float(np.max(np.abs(combined)))
        report.append((ident, tier, dur_s, dur_c, peak, text))
        print(f"{ident:12} speech={dur_s:.2f}s  combo={dur_c:.2f}s  peak={peak:.3f}  {text}")

    print("\n# LINES")
    for ident, tier, dur_s, dur_c, peak, text in report:
        print(f"- [{tier}] {text}  (msg {dur_s:.1f}s, with jingle {dur_c:.1f}s)")


if __name__ == "__main__":
    main()
