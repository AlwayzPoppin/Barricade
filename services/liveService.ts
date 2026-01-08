
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface LiveSessionState {
  status: 'idle' | 'connecting' | 'active' | 'error';
  transcript: string;
}

export class ZenithLiveManager {
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private inputAudioContext: AudioContext | null = null;

  constructor(
    private onTranscript: (text: string, role: 'user' | 'model') => void,
    private onStateChange: (state: LiveSessionState['status']) => void
  ) {}

  async start() {
    this.onStateChange('connecting');
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            this.onStateChange('active');
            this.streamMicrophone(stream);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              this.onTranscript(message.serverContent.outputTranscription.text, 'model');
            }
            if (message.serverContent?.inputTranscription) {
              this.onTranscript(message.serverContent.inputTranscription.text, 'user');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              await this.playAudioChunk(audioData);
            }

            if (message.serverContent?.interrupted) {
              this.stopAllAudio();
            }
          },
          onclose: () => this.onStateChange('idle'),
          onerror: (e) => {
            console.error('Live API Error:', e);
            this.onStateChange('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are Barricade, an AI PC assistant and antivirus sentinel. Help manage files, security, and system health. Respond with vigilance and clarity.",
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });
    } catch (err) {
      console.error('Failed to start Live session:', err);
      this.onStateChange('error');
    }
  }

  private streamMicrophone(stream: MediaStream) {
    if (!this.inputAudioContext || !this.session) return;
    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        int16[i] = inputData[i] * 32768;
      }
      const base64 = this.encode(new Uint8Array(int16.buffer));
      this.session.sendRealtimeInput({
        media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    source.connect(processor);
    processor.connect(this.inputAudioContext.destination);
  }

  private async playAudioChunk(base64: string) {
    if (!this.audioContext) return;
    const bytes = this.decode(base64);
    const buffer = await this.decodeAudioData(bytes, this.audioContext, 24000, 1);
    
    this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private stopAllAudio() {
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  stop() {
    if (this.session) this.session.close();
    this.stopAllAudio();
    this.onStateChange('idle');
  }

  private decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
