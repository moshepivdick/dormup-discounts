"""
Generate a premium mobile UI confirmation sound
inspired by Apple Pay and Revolut.
"""

import numpy as np
from scipy.io import wavfile
from scipy import signal

# Audio parameters
SAMPLE_RATE = 44100
DURATION = 0.3  # 300 ms
MICRO_CLICK_DURATION = 0.002  # 2 ms
FREQ_GLIDE_START = 900  # Hz
FREQ_GLIDE_END = 1200  # Hz
FREQ_GLIDE_DURATION = 0.08  # 80 ms
FADE_OUT_DURATION = 0.05  # 50 ms
PEAK_LEVEL = -1.0  # dB

# Calculate sample counts
total_samples = int(SAMPLE_RATE * DURATION)
micro_click_samples = int(SAMPLE_RATE * MICRO_CLICK_DURATION)
freq_glide_samples = int(SAMPLE_RATE * FREQ_GLIDE_DURATION)
fade_out_samples = int(SAMPLE_RATE * FADE_OUT_DURATION)

# Create time arrays
t = np.linspace(0, DURATION, total_samples, False)
t_glide = np.linspace(0, FREQ_GLIDE_DURATION, freq_glide_samples, False)

# 1. Generate micro-click (1-3 ms tactile tap)
# A very short, sharp transient using a high-frequency burst
click_samples = min(micro_click_samples, int(SAMPLE_RATE * 0.003))  # Max 3 ms
click_t = np.linspace(0, click_samples / SAMPLE_RATE, click_samples, False)
# Create a brief high-frequency burst that decays quickly
click_freq = 2000  # Hz
micro_click = np.sin(2 * np.pi * click_freq * click_t)
# Apply exponential decay envelope
click_envelope = np.exp(-click_t * 100)  # Fast decay
micro_click = micro_click * click_envelope
micro_click = micro_click * 0.15  # Subtle volume

# 2. Generate main tone with frequency glide
# Create frequency sweep from 900 Hz to 1200 Hz over 80 ms
# Using linear frequency sweep
freq_sweep = np.linspace(FREQ_GLIDE_START, FREQ_GLIDE_END, freq_glide_samples)
# Generate chirp signal
phase = 2 * np.pi * np.cumsum(freq_sweep) / SAMPLE_RATE
main_tone = np.sin(phase)

# Extend main tone to fill remaining duration (after glide)
remaining_samples = total_samples - freq_glide_samples
if remaining_samples > 0:
    # Continue at final frequency (1200 Hz)
    t_remaining = np.linspace(0, remaining_samples / SAMPLE_RATE, remaining_samples, False)
    main_tone_remaining = np.sin(2 * np.pi * FREQ_GLIDE_END * t_remaining)
    main_tone = np.concatenate([main_tone, main_tone_remaining])

# 3. Combine micro-click and main tone
audio = np.zeros(total_samples)
# Add micro-click at the start
audio[:len(micro_click)] += micro_click
# Add main tone (starting slightly after click for clarity)
main_tone_start = len(micro_click)
audio[main_tone_start:main_tone_start + len(main_tone)] += main_tone[:len(audio) - main_tone_start]

# 4. Apply envelope: fast attack, short sustain, fade-out
envelope = np.ones(total_samples)

# Fast attack (first 5 ms)
attack_samples = int(SAMPLE_RATE * 0.005)
if attack_samples > 0:
    envelope[:attack_samples] = np.linspace(0, 1, attack_samples)

# Sustain at full level (until fade-out starts)
fade_out_start = total_samples - fade_out_samples
if fade_out_start > attack_samples:
    # Sustain is already at 1.0, no change needed
    pass

# Fade-out (last 50 ms)
if fade_out_samples > 0:
    envelope[fade_out_start:] = np.linspace(1, 0, fade_out_samples)

# Apply envelope
audio = audio * envelope

# 5. High-pass filter to remove any bass frequencies
# Butterworth high-pass filter at 400 Hz (removes bass, keeps the tone clean)
nyquist = SAMPLE_RATE / 2
cutoff = 400 / nyquist
b, a = signal.butter(4, cutoff, btype='high')
audio = signal.filtfilt(b, a, audio)

# 6. Normalize to peak at -1 dB
peak = np.max(np.abs(audio))
if peak > 0:
    # Convert -1 dB to linear scale
    target_linear = 10 ** (PEAK_LEVEL / 20)
    audio = audio * (target_linear / peak)

# 7. Ensure mono and convert to int16
audio = audio.astype(np.float32)
# Convert to int16 for WAV export
audio_int16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)

# 8. Export as WAV
output_filename = 'dormup_scan_confirm.wav'
wavfile.write(output_filename, SAMPLE_RATE, audio_int16)

print(f"Generated {output_filename}")
print(f"  Duration: {DURATION * 1000:.0f} ms")
print(f"  Sample rate: {SAMPLE_RATE} Hz")
print(f"  Channels: Mono")
print(f"  Peak level: {PEAK_LEVEL} dB")
print(f"  Frequency sweep: {FREQ_GLIDE_START} Hz -> {FREQ_GLIDE_END} Hz over {FREQ_GLIDE_DURATION * 1000:.0f} ms")
