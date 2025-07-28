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

# Try transcription with Afrikaans language
print("\nAttempting transcription in Afrikaans...")
try:
    # Google Speech Recognition with Afrikaans language code
    text = r.recognize_google(audio_data, language="af-ZA")
    print("\n=== AFRIKAANSE TRANSKRIPSIE ===")
    print(text)
    print("================================\n")
except sr.UnknownValueError:
    print("Google Speech Recognition kon nie die klank verstaan nie")
except sr.RequestError as e:
    print(f"Kon nie resultate van Google Speech Recognition kry nie; {e}")

# Also try English to compare
print("\nFor comparison, here's what it sounds like in English:")
try:
    text_en = r.recognize_google(audio_data, language="en-US")
    print(text_en)
except:
    pass

# Clean up
if os.path.exists(wav_file):
    os.remove(wav_file)
    print("\nCleaned up temporary WAV file.")