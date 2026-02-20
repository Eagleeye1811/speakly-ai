import { Modality } from "@google/genai";

/**
 * Converts Float32Array audio data (from Web Audio API) to Int16Array PCM (required by Gemini).
 * Scales the float values (-1.0 to 1.0) to 16-bit integers (-32768 to 32767).
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Encodes a byte array to a base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM Int16 audio data into an AudioBuffer for playback.
 */
export function pcmToAudioBuffer(
  pcmData: Int16Array,
  audioContext: AudioContext,
  sampleRate: number
): AudioBuffer {
  const buffer = audioContext.createBuffer(1, pcmData.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcmData.length; i++) {
    channelData[i] = pcmData[i] / 32768.0;
  }
  return buffer;
}
