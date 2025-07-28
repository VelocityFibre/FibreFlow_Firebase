#!/usr/bin/env python3
import speech_recognition as sr
from pydub import AudioSegment
import os

# Convert MP3 to WAV (required by speech_recognition)
audio_file = "/home/ldp/Downloads/WhatsApp_Voice_2025-07-28.mp3"
wav_file = "/home/ldp/Downloads/WhatsApp_Voice_2025-07-28.wav"

print("Converting MP3 to WAV...")
audio = AudioSegment.from_mp3(audio_file)
audio.export(wav_file, format="wav")

# Initialize recognizer
r = sr.Recognizer()

# Load the audio file
print("Loading audio file...")
with sr.AudioFile(wav_file) as source:
    audio_data = r.record(source)

# Try different recognition services
print("\nAttempting transcription using Google Speech Recognition...")
try:
    # Google Speech Recognition (free, no API key required)
    text = r.recognize_google(audio_data)
    print("\n=== TRANSCRIPTION ===")
    print(text)
    print("===================\n")
except sr.UnknownValueError:
    print("Google Speech Recognition could not understand the audio")
except sr.RequestError as e:
    print(f"Could not request results from Google Speech Recognition; {e}")

# Clean up
if os.path.exists(wav_file):
    os.remove(wav_file)
    print("Cleaned up temporary WAV file.")