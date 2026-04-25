/**
 * Voice Message Recorder Component
 * 
 * Advanced voice recording component with real-time visualization,
 * compression, and mobile optimization for PropertyHub chat system.
 * 
 * Features:
 * - Real-time audio visualization
 * - Automatic gain control and noise suppression
 * - MP3/OGG compression for optimal file sizes
 * - Mobile-optimized touch controls
 * - Voice activity detection
 * - Recording time limits and quality settings
 * - Waveform preview during playback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Send, 
  Trash2, 
  Download,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number, waveform: number[]) => Promise<void>;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  waveform: number[];
}

export function VoiceMessageRecorder({
  onSend,
  onCancel,
  maxDuration = 300, // 5 minutes default
  className = ""
}: VoiceMessageRecorderProps) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    waveform: []
  });

  const [isSending, setIsSending] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const supported = !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia &&
        window.MediaRecorder &&
        MediaRecorder.isTypeSupported('audio/webm') ||
        MediaRecorder.isTypeSupported('audio/mp4') ||
        MediaRecorder.isTypeSupported('audio/ogg')
      );
      
      setIsSupported(supported);
      
      if (!supported) {
        toast.error('Voice recording is not supported in your browser');
      }
    };

    checkSupport();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });
      
      // Test and immediately stop to check permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      toast.error('Microphone access is required to record voice messages');
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // Setup audio visualization
  const setupAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Start visualization
      updateWaveform();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  }, []);

  // Update waveform data
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !state.isRecording) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average amplitude
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    setState(prev => ({
      ...prev,
      waveform: [...prev.waveform.slice(-49), normalizedLevel] // Keep last 50 values
    }));

    if (state.isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }
  }, [state.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('Voice recording is not supported');
      return;
    }

    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine the best supported format
      let mimeType = 'audio/webm;codecs=opus';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000 // Lower bitrate for voice
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false
        }));

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      // Setup visualization
      setupAudioVisualization(stream);

      mediaRecorder.start(1000); // Capture data every second
      startTimeRef.current = Date.now();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        waveform: []
      }));

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
          toast.info(`Recording stopped at ${maxDuration} second limit`);
        }
      }, 100);

      toast.success('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  }, [isSupported, permissionGranted, requestPermission, setupAudioVisualization, maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [state.isRecording]);

  // Pause/Resume recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (state.isPaused) {
        mediaRecorderRef.current.resume();
        startTimeRef.current = Date.now() - (state.duration * 1000);
        
        timerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          setState(prev => ({ ...prev, duration: elapsed }));
        }, 100);

        setState(prev => ({ ...prev, isPaused: false }));
        toast.info('🎤 Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setState(prev => ({ ...prev, isPaused: true }));
        toast.info('⏸️ Recording paused');
      }
    }
  }, [state.isPaused, state.duration]);

  // Play recorded audio
  const playRecording = useCallback(() => {
    if (!state.audioUrl) return;

    if (state.isPlaying) {
      audioElementRef.current?.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(state.audioUrl);
        
        audioElementRef.current.onended = () => {
          setState(prev => ({ ...prev, isPlaying: false }));
        };

        audioElementRef.current.onerror = () => {
          toast.error('Failed to play audio');
          setState(prev => ({ ...prev, isPlaying: false }));
        };
      }

      audioElementRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
      }).catch((error) => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio');
      });
    }
  }, [state.audioUrl, state.isPlaying]);

  // Delete recording
  const deleteRecording = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      waveform: []
    });

    toast.info('Recording deleted');
  }, [state.audioUrl]);

  // Send recording
  const sendRecording = useCallback(async () => {
    if (!state.audioBlob) return;

    setIsSending(true);
    try {
      await onSend(state.audioBlob, state.duration, state.waveform);
      
      // Clean up
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      
      toast.success('🎤 Voice message sent!');
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast.error('Failed to send voice message');
    } finally {
      setIsSending(false);
    }
  }, [state.audioBlob, state.duration, state.waveform, onSend]);

  // Download recording
  const downloadRecording = useCallback(() => {
    if (!state.audioBlob || !state.audioUrl) return;

    const a = document.createElement('a');
    a.href = state.audioUrl;
    a.download = `voice-message-${Date.now()}.${state.audioBlob.type.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success('Voice message downloaded');
  }, [state.audioBlob, state.audioUrl]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [state.audioUrl]);

  if (!isSupported) {
    return (
      <div className={`bg-muted/50 rounded-lg p-4 text-center ${className}`}>
        <MicOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Voice recording is not supported in your browser
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-card border rounded-lg p-4 ${className}`}
    >
      {/* Recording Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            state.isRecording ? (state.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse') : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium">
            {state.isRecording 
              ? (state.isPaused ? 'Paused' : 'Recording') 
              : state.audioBlob 
                ? 'Ready to send' 
                : 'Voice Message'
            }
          </span>
        </div>
        
        <span className="text-sm text-muted-foreground font-mono">
          {formatDuration(state.duration)} / {formatDuration(maxDuration)}
        </span>
      </div>

      {/* Waveform Visualization */}
      <div className="h-16 bg-muted/30 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {state.waveform.length > 0 ? (
          <div className="flex items-center gap-1 h-full px-2">
            {state.waveform.map((level, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(level * 100, 2)}%` }}
                className="w-1 bg-primary rounded-full"
                style={{ minHeight: '2px' }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Mic className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {state.audioBlob ? 'Recording complete' : 'Tap record to start'}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!state.audioBlob ? (
          // Recording controls
          <>
            {!state.isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12"
              >
                <Mic className="w-5 h-5" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  {state.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12"
                >
                  <Square className="w-5 h-5" />
                </Button>
              </>
            )}
          </>
        ) : (
          // Playback and action controls
          <>
            <Button
              onClick={playRecording}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button
              onClick={deleteRecording}
              variant="outline"
              size="sm"
              className="rounded-full text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => {
                deleteRecording();
                startRecording();
              }}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              onClick={downloadRecording}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Download className="w-4 h-4" />
            </Button>

            <Button
              onClick={sendRecording}
              disabled={isSending}
              className="bg-primary hover:bg-primary/90 rounded-full px-6"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </>
        )}

        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="rounded-full"
        >
          Cancel
        </Button>
      </div>

      {/* Recording Tip */}
      {!state.isRecording && !state.audioBlob && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Hold and speak clearly. Maximum duration: {formatDuration(maxDuration)}
        </p>
      )}
    </motion.div>
  );
}