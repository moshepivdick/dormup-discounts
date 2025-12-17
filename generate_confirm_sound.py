"""
Generate a premium Apple Pay-style mobile UI confirmation sound
with two distinct sounds separated by a micro pause.
"""

import numpy as np
from scipy.io import wavfile
from scipy import signal

# Audio parameters
SAMPLE_RATE = 44100

# First sound: Tactile tap (micro-click)
TACTILE_TAP_DURATION = 0.003  # 3 ms (2-4 ms range)
TACTILE_TAP_FREQ = 2200  # Hz - crisp, high frequency
TACTILE_TAP_VOLUME = 0.2  # Subtle but audible

# Micro pause: Silent gap between sounds
PAUSE_DURATION = 0.032  # 32 ms (25-40 ms range)

# Second sound: Confirmation tone
CONFIRMATION_TONE_GLIDE_DURATION = 0.120  # 120 ms for the frequency glide
CONFIRMATION_TONE_SUSTAIN_DURATION = 0.150  # 150 ms sustain at final frequency
CONFIRMATION_TONE_DURATION = CONFIRMATION_TONE_GLIDE_DURATION + CONFIRMATION_TONE_SUSTAIN_DURATION  # 270 ms total
CONFIRMATION_FREQ_START = 900  # Hz
CONFIRMATION_FREQ_END = 1200  # Hz
FADE_OUT_DURATION = 0.050  # 50 ms

# Total duration
TOTAL_DURATION = TACTILE_TAP_DURATION + PAUSE_DURATION + CONFIRMATION_TONE_DURATION  # ~305 ms
PEAK_LEVEL = -1.0  # dB

# Calculate sample counts
tap_samples = int(SAMPLE_RATE * TACTILE_TAP_DURATION)
pause_samples = int(SAMPLE_RATE * PAUSE_DURATION)
glide_samples = int(SAMPLE_RATE * CONFIRMATION_TONE_GLIDE_DURATION)
sustain_samples = int(SAMPLE_RATE * CONFIRMATION_TONE_SUSTAIN_DURATION)
tone_samples = glide_samples + sustain_samples
fade_out_samples = int(SAMPLE_RATE * FADE_OUT_DURATION)
total_samples = tap_samples + pause_samples + tone_samples

# ============================================
# 1. FIRST SOUND: Tactile tap (micro-click)
# ============================================
tap_t = np.linspace(0, TACTILE_TAP_DURATION, tap_samples, False)
# Create a crisp, high-frequency burst
tactile_tap = np.sin(2 * np.pi * TACTILE_TAP_FREQ * tap_t)
# Apply very fast exponential decay for crispness
tap_envelope = np.exp(-tap_t * 200)  # Very fast decay
tactile_tap = tactile_tap * tap_envelope
tactile_tap = tactile_tap * TACTILE_TAP_VOLUME

# ============================================
# 2. MICRO PAUSE: Silent gap
# ============================================
pause = np.zeros(pause_samples)

# ============================================
# 3. SECOND SOUND: Confirmation tone
# ============================================
# Part 1: Frequency glide from 900 Hz to 1200 Hz over 120 ms
glide_t = np.linspace(0, CONFIRMATION_TONE_GLIDE_DURATION, glide_samples, False)
freq_sweep = np.linspace(CONFIRMATION_FREQ_START, CONFIRMATION_FREQ_END, glide_samples)
phase_glide = 2 * np.pi * np.cumsum(freq_sweep) / SAMPLE_RATE
tone_glide = np.sin(phase_glide)

# Part 2: Sustain at final frequency (1200 Hz) for 150 ms
sustain_t = np.linspace(0, CONFIRMATION_TONE_SUSTAIN_DURATION, sustain_samples, False)
tone_sustain = np.sin(2 * np.pi * CONFIRMATION_FREQ_END * sustain_t)

# Combine glide and sustain
confirmation_tone = np.concatenate([tone_glide, tone_sustain])

# Apply envelope to confirmation tone: fast attack, sustain, soft fade-out
tone_envelope = np.ones(tone_samples)

# Fast attack (first 5 ms)
attack_samples = int(SAMPLE_RATE * 0.005)
if attack_samples > 0 and attack_samples < tone_samples:
    tone_envelope[:attack_samples] = np.linspace(0, 1, attack_samples)

# Sustain at full level (until fade-out starts)
fade_out_start_tone = tone_samples - fade_out_samples
if fade_out_start_tone > attack_samples:
    # Sustain is already at 1.0, no change needed
    pass

# Soft fade-out (last 50 ms)
if fade_out_samples > 0 and fade_out_samples < tone_samples:
    tone_envelope[fade_out_start_tone:] = np.linspace(1, 0, fade_out_samples)

# Apply envelope to confirmation tone
confirmation_tone = confirmation_tone * tone_envelope

# ============================================
# 4. COMBINE ALL ELEMENTS
# ============================================
audio = np.zeros(total_samples)

# Place tactile tap at the start
audio[:tap_samples] = tactile_tap

# Place pause (already zeros, so this is just for clarity)
# audio[tap_samples:tap_samples + pause_samples] = pause  # Already zeros

# Place confirmation tone after the pause
tone_start = tap_samples + pause_samples
audio[tone_start:tone_start + tone_samples] = confirmation_tone

# ============================================
# 5. HIGH-PASS FILTER: Remove bass frequencies
# ============================================
# Butterworth high-pass filter at 400 Hz
nyquist = SAMPLE_RATE / 2
cutoff = 400 / nyquist
b, a = signal.butter(4, cutoff, btype='high')
audio = signal.filtfilt(b, a, audio)

# ============================================
# 6. NORMALIZE: Peak at -1 dB
# ============================================
peak = np.max(np.abs(audio))
if peak > 0:
    # Convert -1 dB to linear scale
    target_linear = 10 ** (PEAK_LEVEL / 20)
    audio = audio * (target_linear / peak)

# ============================================
# 7. CONVERT AND EXPORT
# ============================================
# Ensure mono and convert to int16
audio = audio.astype(np.float32)
audio_int16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)

# Export as WAV
output_filename = 'dormup_scan_confirm.wav'
wavfile.write(output_filename, SAMPLE_RATE, audio_int16)

# Print summary
print(f"Generated {output_filename}")
print(f"  Total duration: {TOTAL_DURATION * 1000:.1f} ms")
print(f"  Sample rate: {SAMPLE_RATE} Hz")
print(f"  Channels: Mono")
print(f"  Peak level: {PEAK_LEVEL} dB")
print(f"")
print(f"  Structure:")
print(f"    1. Tactile tap: {TACTILE_TAP_DURATION * 1000:.1f} ms ({TACTILE_TAP_FREQ} Hz)")
print(f"    2. Micro pause: {PAUSE_DURATION * 1000:.1f} ms (silence)")
print(f"    3. Confirmation tone: {CONFIRMATION_TONE_DURATION * 1000:.1f} ms")
print(f"       - Frequency glide: {CONFIRMATION_TONE_GLIDE_DURATION * 1000:.1f} ms ({CONFIRMATION_FREQ_START} Hz -> {CONFIRMATION_FREQ_END} Hz)")
print(f"       - Sustain: {CONFIRMATION_TONE_SUSTAIN_DURATION * 1000:.1f} ms at {CONFIRMATION_FREQ_END} Hz")
