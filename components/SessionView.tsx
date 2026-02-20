import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Scenario } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';
import { float32ToInt16, arrayBufferToBase64, base64ToUint8Array, pcmToAudioBuffer } from '../utils/audio';
import AudioVisualizer from './AudioVisualizer';
import { Mic, MicOff, PhoneOff, AlertCircle, MessageSquare, Activity, CheckCircle2, Clock } from 'lucide-react';

interface SessionViewProps {
  scenario: Scenario;
  onEndSession: () => void;
}

interface TranscriptMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isFinal: boolean;
}

export default function SessionView({ scenario, onEndSession }: SessionViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [sessionTime, setSessionTime] = useState(0);

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);
  const currentInterimIdRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isConnected]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let isCleanup = false;

    // --- 1. Init Web Speech API for User Transcript Demo ---
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscripts(prev => {
          const newTranscripts = [...prev];

          if (finalTranscript) {
            if (currentInterimIdRef.current) {
              // Replace interim with final
              const idx = newTranscripts.findIndex(t => t.id === currentInterimIdRef.current);
              if (idx !== -1) {
                newTranscripts[idx] = { id: Date.now().toString(), sender: 'user', text: finalTranscript, isFinal: true };
              } else {
                newTranscripts.push({ id: Date.now().toString(), sender: 'user', text: finalTranscript, isFinal: true });
              }
              currentInterimIdRef.current = null;
            } else {
              newTranscripts.push({ id: Date.now().toString(), sender: 'user', text: finalTranscript, isFinal: true });
            }
          } else if (interimTranscript) {
            if (!currentInterimIdRef.current) {
              currentInterimIdRef.current = 'interim-' + Date.now();
              newTranscripts.push({ id: currentInterimIdRef.current, sender: 'user', text: interimTranscript, isFinal: false });
            } else {
              const idx = newTranscripts.findIndex(t => t.id === currentInterimIdRef.current);
              if (idx !== -1) {
                newTranscripts[idx].text = interimTranscript;
              }
            }
          }
          return newTranscripts;
        });
      };

      recognition.onerror = () => { /* ignore silence errors */ };
      recognitionRef.current = recognition;
    }

    const startSession = async () => {
      try {
        if (!process.env.API_KEY) {
          throw new Error("API Key is missing.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });

        inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });

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

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.0-flash-exp',
          config: {
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: scenario.voiceName,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION_TEMPLATE(scenario) }]
          },
          callbacks: {
            onopen: () => {
              if (isCleanup) return;
              setIsConnected(true);
              recognitionRef.current?.start(); // Start user transcription

              // Trigger the AI to start speaking
              sessionPromise.then(session => {
                // @ts-ignore - The SDK uses sendClientContent for Live interactions
                session.sendClientContent({
                  turns: [
                    { role: 'user', parts: [{ text: 'Hello! I am ready to start the scenario.' }] }
                  ],
                  turnComplete: true
                });
              });

              if (!inputContextRef.current) return;
              const source = inputContextRef.current.createMediaStreamSource(stream);
              sourceNodeRef.current = source;

              const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (isMuted) return;

                const inputData = e.inputBuffer.getChannelData(0);

                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setAudioVolume(Math.min(100, rms * 400));

                const pcmData = float32ToInt16(inputData);
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

              // Check if Gemini sends text parts too
              const textData = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (textData) {
                setTranscripts(prev => {
                  const newTranscripts = [...prev];
                  const lastIdx = newTranscripts.length - 1;
                  if (lastIdx >= 0 && newTranscripts[lastIdx].sender === 'ai' && !newTranscripts[lastIdx].isFinal) {
                    newTranscripts[lastIdx] = {
                      ...newTranscripts[lastIdx],
                      text: newTranscripts[lastIdx].text + textData
                    };
                  } else {
                    newTranscripts.push({
                      id: Date.now().toString() + Math.random(),
                      sender: 'ai',
                      text: textData,
                      isFinal: false
                    });
                  }
                  return newTranscripts;
                });
              }

              // Set final if turn completes or interrupted
              if (message.serverContent?.turnComplete || message.serverContent?.interrupted) {
                setTranscripts(prev => {
                  const newTranscripts = [...prev];
                  const lastIdx = newTranscripts.length - 1;
                  if (lastIdx >= 0 && newTranscripts[lastIdx].sender === 'ai') {
                    newTranscripts[lastIdx] = { ...newTranscripts[lastIdx], isFinal: true };
                  }
                  return newTranscripts;
                });
              }

              const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && audioContextRef.current) {
                const ctx = audioContextRef.current;
                const rawBytes = base64ToUint8Array(audioData);
                const pcmInt16 = new Int16Array(rawBytes.buffer);
                const audioBuffer = pcmToAudioBuffer(pcmInt16, ctx, 24000);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
                }

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

                // Demo effect: If Gemini doesn't stream text, we can show a placeholder "AI is speaking..." block
                // (Omitted for brevity, but could be added!)
              }

              if (message.serverContent?.interrupted) {
                nextStartTimeRef.current = 0;
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

        sessionRef.current = await sessionPromise;

      } catch (err: any) {
        setError(err.message || "Failed to initialize session.");
      }
    };

    startSession();

    return () => {
      isCleanup = true;
      recognitionRef.current?.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
      inputContextRef.current?.close();
    };
  }, [scenario]);

  useEffect(() => {
    // If we mute, we pause recognition so we don't transcribe
    if (isMuted) {
      recognitionRef.current?.stop();
    } else if (isConnected && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) { } // Catch if already started
    }
  }, [isMuted, isConnected]);

  // Scroll to bottom of transcript
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#0B0F19] text-slate-50 font-sans overflow-hidden">

      {/* LEFT PANEL: AVATAR & MAIN STAGE */}
      <div className="flex-1 flex flex-col relative border-r border-slate-800">

        {/* Top Bar */}
        <div className="p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <span className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-blue-500/30">
              {scenario.role}
            </span>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              {scenario.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50 backdrop-blur-md">
            {isConnected ? (
              <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span><span className="text-sm font-medium text-emerald-400">Live</span></>
            ) : (
              <><span className="h-3 w-3 rounded-full bg-slate-500"></span><span className="text-sm font-medium text-slate-400">Connecting...</span></>
            )}
            <div className="w-px h-4 bg-slate-700 mx-2"></div>
            <span className="flex items-center gap-1.5 text-slate-300 text-sm font-medium"><Clock className="w-4 h-4" /> {formatTime(sessionTime)}</span>
          </div>
        </div>

        {/* Video / Avatar Stage */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${scenario.bgGradient} opacity-5 blur-3xl pointer-events-none`}></div>

          <div className="w-full max-w-2xl aspect-video bg-[#131B2C] rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col items-center justify-center relative">
            {/* Fake Video Box / AI Container */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none"></div>

            {error ? (
              <div className="text-center p-4 z-10">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-red-200">{error}</p>
              </div>
            ) : !isConnected ? (
              <div className="z-10 text-center">
                <div className="w-24 h-24 border-4 border-t-blue-500 border-r-blue-500 border-b-slate-700 border-l-slate-700 rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-slate-400 font-medium tracking-wide">Initializing Scenario...</p>
              </div>
            ) : (
              <div className="z-10 flex flex-col items-center">
                {/* Orb */}
                <div className="relative w-40 h-40 rounded-full bg-slate-800/80 flex items-center justify-center shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)] border border-slate-600/50 backdrop-blur-md">
                  <AudioVisualizer volume={audioVolume} isActive={isConnected} />
                </div>
                <div className="mt-8 text-center text-slate-300 bg-slate-900/40 px-6 py-2 rounded-full border border-white/5 backdrop-blur-sm shadow-xl">
                  <span className="font-semibold">{scenario.voiceName}</span> is listening
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> AI Native Audio Stream</div>
              <div className="px-3 py-1 bg-black/40 rounded shadow-inner">Focus: {scenario.skills.split(',')[0]}</div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="p-8 pb-12 flex justify-center items-center gap-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 ${isMuted ? 'bg-red-500/90 text-white shadow-red-500/30' : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200'}`}
          >
            {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <button
            onClick={onEndSession}
            className="px-8 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide shadow-xl shadow-red-900/20 transition-all flex items-center gap-3 transform hover:scale-105 border border-red-500"
          >
            <PhoneOff className="w-6 h-6" />
            End Roleplay
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: TRANSCRIPT & METRICS */}
      <div className="w-full lg:w-[450px] flex flex-col bg-[#0F1423] border-l border-slate-800 shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">

        <div className="p-6 border-b border-slate-800/80 bg-slate-900/30">
          <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Live Coaching View
          </h3>
        </div>

        {/* Transcript Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {transcripts.length === 0 && isConnected && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
              <Mic className="w-8 h-8" />
              <p className="text-sm font-medium">Start speaking to see transcript...</p>
            </div>
          )}

          {transcripts.map((msg) => {
            if (msg.sender === 'ai' && msg.text.includes('Coach Note:')) {
              const parts = msg.text.split('Coach Note:');
              const beforeNote = parts[0].trim();
              const noteContent = parts[1] ? parts[1].trim() : '';

              return (
                <div key={msg.id} className="flex flex-col w-full gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300 mb-4">
                  {beforeNote && (
                    <div className="w-full flex flex-col items-start">
                      <span className="text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wider">Coach</span>
                      <div className="max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700 shadow-md">
                        {beforeNote}
                      </div>
                    </div>
                  )}

                  <div className="w-[90%] bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-xl text-sm shadow-xl flex items-start gap-3 mt-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-indigo-400 block mb-1 uppercase tracking-wider text-xs">Live Feedback</span>
                      {noteContent || <span className="animate-pulse">Analyzing...</span>}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} mb-4 animate-in fade-in zoom-in-95 duration-200`}>
                <span className="text-xs font-semibold text-slate-500 mb-1 ml-1 mr-1 uppercase tracking-wider">
                  {msg.sender === 'user' ? 'You' : 'Coach'}
                </span>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                  ? `bg-blue-600/90 text-white rounded-tr-sm shadow-md shadow-blue-900/20 ${!msg.isFinal ? 'opacity-80 border border-blue-400/30 animate-pulse' : ''}`
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700 shadow-md'
                  }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Metrics Cards (Simulated logic for demo) */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Real-Time Insights</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#182136] border border-slate-700/50 rounded-xl p-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold text-slate-100">{Math.floor(sessionTime / 15) * 15}</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Words Spoken</div>
            </div>

            <div className="bg-[#182136] border border-slate-700/50 rounded-xl p-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <Activity className="w-5 h-5 text-orange-400 mb-2" />
              <div className="text-2xl font-bold text-slate-100">{sessionTime > 10 ? '110' : '0'}</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Pace (wpm) target: 130</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}