"""Original music-box waltz in F major, rendered with pure Python.
Writes a seamless loop as 16-bit mono WAV to argv[1]."""
import math, sys, struct, wave
from array import array

SR = 32000
BPM = 132
BEAT = 60 / BPM
BAR = 3 * BEAT

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# ---- timbres: (ratio, amp, decay/s) ----
BOX = [(1.0, 1.0, 2.1), (2.0, 0.22, 5.0), (5.4, 0.10, 10.0), (8.9, 0.04, 16.0)]
SOFT = [(1.0, 1.0, 1.5), (2.0, 0.18, 4.0)]
NOTE_LEN = 2.6
cache = {}
def wave_for(m, timbre):
    key = (m, id(timbre))
    if key in cache: return cache[key]
    n = int(NOTE_LEN * SR)
    f = hz(m)
    out = array("f", [0.0]) * n
    atk = int(0.004 * SR)
    for ratio, amp, dec in timbre:
        w = 2 * math.pi * f * ratio / SR
        k = math.exp(-dec / SR)
        e = amp
        for i in range(n):
            out[i] += e * math.sin(w * i)
            e *= k
    for i in range(atk):
        out[i] *= i / atk
    # fade the end to avoid clicks
    fade = int(0.05 * SR)
    for i in range(fade):
        out[n - 1 - i] *= i / fade
    cache[key] = out
    return out

# ---- composition ----
CH = {  # bass, chord tones
    "F": (53, (57, 60, 65)), "Dm": (50, (57, 62, 65)), "Bb": (46, (58, 62, 65)),
    "C": (48, (55, 60, 64)), "Gm": (55, (58, 62, 67)), "Am": (57, (60, 64, 69)),
    "C7": (48, (58, 60, 64)),
}
A = [
    ("F",  [(69, 2), (72, 1)]),
    ("Dm", [(77, 2), (76, 1)]),
    ("Bb", [(74, 1), (72, 1), (70, 1)]),
    ("C",  [(67, 2), (72, 1)]),
    ("F",  [(69, 2), (72, 1)]),
    ("Dm", [(81, 2), (77, 1)]),
    ("Gm|C", [(79, 1), (77, 1), (76, 1)]),
    ("F",  [(77, 3)]),
]
A2 = A[:6] + [
    ("Gm|C", [(74, 1), (72, 1), (76, 1)]),
    ("F",  [(77, 2), (72, 1)]),
]
B = [
    ("Bb", [(74, 2), (77, 1)]),
    ("C",  [(76, 2), (79, 1)]),
    ("Am", [(76, 2), (72, 1)]),
    ("Dm", [(77, 2), (81, 1)]),
    ("Gm", [(79, 1.5), (77, 0.5), (74, 1)]),
    ("C",  [(76, 1), (74, 1), (72, 1)]),
    ("F",  [(69, 1), (72, 1), (77, 1)]),
    ("C7", [(76, 2), (70, 1)]),
]
SONG = A + A2 + B + A

events = []  # (time, midi, timbre, amp)
t = 0.0
for chord, melody in SONG:
    first, second = (chord.split("|") + [chord])[:2] if "|" in chord else (chord, chord)
    b1, _ = CH[first]
    _, tones2 = CH[second]
    events.append((t, b1, SOFT, 0.34))
    for beat in (1, 2):
        for j, m in enumerate(tones2):
            events.append((t + beat * BEAT + j * 0.012, m, SOFT, 0.11))
    mt = t
    for m, d in melody:
        events.append((mt, m, BOX, 0.42))
        events.append((mt, m + 12, BOX, 0.07))  # octave shimmer
        mt += d * BEAT
    t += BAR

LOOP = int(t * SR)
TAIL = int(3.5 * SR)
buf = array("f", [0.0]) * (LOOP + TAIL)
for start, m, timbre, amp in events:
    w = wave_for(m, timbre)
    s = int(start * SR)
    for i in range(len(w)):
        buf[s + i] += amp * w[i]

# ---- Schroeder reverb ----
def comb(x, d, g):
    y = array("f", [0.0]) * len(x)
    for i in range(len(x)):
        y[i] = x[i] + (g * y[i - d] if i >= d else 0.0)
    return y
def allpass(x, d, g):
    y = array("f", [0.0]) * len(x)
    for i in range(len(x)):
        xd = x[i - d] if i >= d else 0.0
        yd = y[i - d] if i >= d else 0.0
        y[i] = -g * x[i] + xd + g * yd
    return y
wet = array("f", [0.0]) * len(buf)
for d, g in ((1109, 0.80), (1187, 0.79), (1279, 0.78), (1361, 0.77)):
    c = comb(buf, d, g)
    for i in range(len(buf)):
        wet[i] += c[i] * 0.25
wet = allpass(allpass(wet, 223, 0.5), 557, 0.5)
mix = array("f", (buf[i] * 0.8 + wet[i] * 0.28 for i in range(len(buf))))

# fold the tail onto the start → seamless loop
for i in range(TAIL):
    mix[i] += mix[LOOP + i]
mix = mix[:LOOP]

peak = max(abs(v) for v in mix)
gain = 0.85 / peak
with wave.open(sys.argv[1], "w") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes(b"".join(struct.pack("<h", int(v * gain * 32767)) for v in mix))
print(f"loop {t:.1f}s, notes {len(events)}, peak {peak:.2f}")
