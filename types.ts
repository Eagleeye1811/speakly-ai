export interface Scenario {
  id: string;
  title: string;
  role: string;
  tone: string;
  skills: string;
  description: string;
  goal: string;
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  bgGradient: string;
}

export interface LiveSessionState {
  isConnected: boolean;
  isAudioStreaming: boolean;
  error: string | null;
  volume: number;
}