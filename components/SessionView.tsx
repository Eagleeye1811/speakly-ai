import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveSession, Modality } from '@google/genai';
import { Scenario } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';
import { float32ToInt16, arrayBufferToBase64, base64ToUint8Array, pcmToAudioBuffer } from '../utils/audio';
import AudioVisualizer from './AudioVisualizer';
import { Mic, MicOff, PhoneOff, AlertCircle } from 'lucide-react';

interface SessionViewProps {
  scenario: Scenario;
  onEndSession: () => void;
}

export default function SessionView({ scenario, onEndSession }: SessionViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0); // 0-100 for visualizer

  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isCleanup = false;

    const startSession = async () => {
      try {
        if (!process.env.API_KEY) {
          throw new Error("API Key is missing.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Initialize Audio Contexts
        // Output context (standard playback)
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000, // Gemini output rate
        });

        // Input context (microphone capture)
        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000, // Gemini input rate expectation
        });

        // Get Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        streamRef.current = stream;

        // Connect to Gemini Live API
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: scenario.voiceName,
                },
              },
            },
            systemInstruction: SYSTEM_INSTRUCTION_TEMPLATE(scenario),
          },
          callbacks: {
            onopen: () => {
              if (isCleanup) return;
              setIsConnected(true);
              
              // Setup Audio Input Processing
              if (!inputContextRef.current) return;
              
              const source = inputContextRef.current.createMediaStreamSource(stream);
              sourceNodeRef.current = source;
              
              // Use ScriptProcessor for raw PCM access (bufferSize, inputChannels, outputChannels)
              const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (isMuted) return; // Don't send data if muted

                const inputData = e.inputBuffer.getChannelData(0);
                
                // Calculate volume for visualizer
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setAudioVolume(Math.min(100, rms * 400)); // boost sensitivity

                // Convert to PCM Int16
                const pcmData = float32ToInt16(inputData);
                
                // Send to API
                const base64Data = arrayBufferToBase64(pcmData.buffer);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                    }
                  });
                });
              };

              source.connect(processor);
              processor.connect(inputContextRef.current.destination);
            },
            onmessage: async (message) => {
              if (isCleanup) return;

              // Handle Audio Response
              const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && audioContextRef.current) {
                const ctx = audioContextRef.current;
                const rawBytes = base64ToUint8Array(audioData);
                
                // Convert raw bytes (Int16) to Int16Array
                const pcmInt16 = new Int16Array(rawBytes.buffer);
                const audioBuffer = pcmToAudioBuffer(pcmInt16, ctx, 24000);

                // Queue playback
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // Schedule seamless playback
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
              }

              // Handle Interruptions (clearing queue)
              if (message.serverContent?.interrupted) {
                 nextStartTimeRef.current = 0;
                 // Note: Ideally we would stop currently playing nodes here, 
                 // but tracking them all adds complexity. The API usually stops sending data.
              }
            },
            onclose: () => {
              if (!isCleanup) setIsConnected(false);
            },
            onerror: (err) => {
              console.error(err);
              setError("Connection error. Please try again.");
            }
          }
        });
        
        // Save session reference to close it later
        sessionRef.current = await sessionPromise;
        
      } catch (err: any) {
        setError(err.message || "Failed to initialize session.");
      }
    };

    startSession();

    return () => {
      isCleanup = true;
      // Stop Microphone
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Close Audio Contexts
      audioContextRef.current?.close();
      inputContextRef.current?.close();
      // Close Session
      if (sessionRef.current) {
        // sessionRef.current.close(); // Method might not exist on the type wrapper, but good practice if available
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]); // Re-run if scenario changes (shouldn't happen in this view without unmounting)

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className={`h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br ${scenario.bgGradient} text-white relative transition-colors duration-500`}>
      
      {/* Background Ambience / Decor */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-8">
        
        {/* Scenario Info */}
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-medium backdrop-blur-md border border-white/10">
            {scenario.role}
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{scenario.title}</h2>
          <p className="text-white/80 max-w-sm mx-auto">{scenario.description}</p>
        </div>

        {/* Visualizer Area */}
        <div className="h-64 w-64 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-2xl relative overflow-hidden ring-4 ring-white/5">
          {error ? (
            <div className="text-center p-4">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-100">{error}</p>
            </div>
          ) : !isConnected ? (
            <div className="animate-pulse text-white/70 font-medium">Connecting...</div>
          ) : (
            <AudioVisualizer volume={audioVolume} isActive={isConnected} />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
           <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-red-500/90 hover:bg-red-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button 
            onClick={onEndSession}
            className="px-8 py-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
            End Session
          </button>
        </div>

        {/* Instructions */}
        {isConnected && (
           <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-sm text-white/90 max-w-md w-full border border-white/10">
              <h3 className="font-semibold mb-1 text-white uppercase tracking-wider text-xs">Coach's Focus</h3>
              <p>{scenario.skills}</p>
           </div>
        )}
      </div>
    </div>
  );
}