import { Ionicons } from '@expo/vector-icons';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiStt, apiTts, apiSendMessage } from '@/lib/api';

const WAVE_BAR_COUNT = 9;
const IS_WEB = Platform.OS === 'web';
function hasWebSpeech(): boolean {
  if (!IS_WEB || typeof window === 'undefined') return false;
  try {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  } catch { return false; }
}

function PulseRings() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const animateRing = (anim: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  useEffect(() => {
    animateRing(ring1, 0);
    animateRing(ring2, 800);
    animateRing(ring3, 1600);
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    top: '50%' as const,
    left: '50%' as const,
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.5)',
    opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 0.4, 0] }),
    transform: [
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) },
    ],
  });

  return (
    <>
      <Animated.View style={ringStyle(ring1)} pointerEvents="none" />
      <Animated.View style={[ringStyle(ring2), { width: 130, height: 130, marginLeft: -65, marginTop: -65 }]} pointerEvents="none" />
      <Animated.View style={[ringStyle(ring3), { width: 140, height: 140, marginLeft: -70, marginTop: -70 }]} pointerEvents="none" />
    </>
  );
}

function RotatingRing({ children }: { children: React.ReactNode }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 110,
          height: 110,
          marginLeft: -55,
          marginTop: -55,
          borderRadius: 55,
          borderWidth: 1,
          borderColor: 'rgba(192,132,252,0.3)',
          transform: [
            { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          ],
        }}
      >
        <View style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          width: 10,
          height: 10,
          marginLeft: -5,
          borderRadius: 5,
          backgroundColor: '#c084fc',
          shadowColor: '#c084fc',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 0,
        }} />
      </Animated.View>
      {children}
    </View>
  );
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceCallScreen() {
  const insets = useSafeAreaInsets();
  const [callActive, setCallActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [waveHeights, setWaveHeights] = useState(Array(WAVE_BAR_COUNT).fill(12));
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(IS_WEB ? window.speechSynthesis : null);
  const loopActiveRef = useRef(false);

  const topPad = Platform.OS === 'web' ? 14 : insets.top + 10;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionModeAndroid: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
      if (recorder.isRecording) recorder.stop().catch(() => {});
      playerRef.current?.remove();
      loopActiveRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startWaveAnimation = useCallback(() => {
    if (waveRef.current) clearInterval(waveRef.current);
    waveRef.current = setInterval(() => {
      setWaveHeights(Array.from({ length: WAVE_BAR_COUNT }, () => Math.floor(Math.random() * 35) + 12));
    }, 120);
  }, []);

  const stopWaveAnimation = useCallback(() => {
    if (waveRef.current) {
      clearInterval(waveRef.current);
      waveRef.current = null;
    }
    setWaveHeights(Array(WAVE_BAR_COUNT).fill(12));
  }, []);

  // ── Web Speech loop ──────────────────────────────────────────────────
  const startWebSpeechLoop = useCallback(() => {
    if (!hasWebSpeech()) return;
    loopActiveRef.current = true;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = 'en-US';
    recognitionRef.current = recog;

    recog.onresult = async (event: any) => {
      if (!loopActiveRef.current) return;
      const userText = event.results[event.results.length - 1][0].transcript;
      setTranscript(userText);
      setIsProcessing(true);

      try {
        const { data: chatData } = await apiSendMessage('aurora', userText);
        const replyText = chatData?.aiMessage?.content ?? "I'm here. Tell me more.";
        setLastResponse(replyText);

        // TTS via Web Speech API (free, no key needed)
        if (synthRef.current && !muted) {
          synthRef.current.cancel();
          const utterance = new SpeechSynthesisUtterance(replyText);
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          utterance.onend = () => {
            if (loopActiveRef.current) startWebSpeechLoop();
          };
          synthRef.current.speak(utterance);
        } else {
          if (loopActiveRef.current) startWebSpeechLoop();
        }
      } catch {
        if (loopActiveRef.current) startWebSpeechLoop();
      }
      setIsProcessing(false);
    };

    recog.onerror = () => {
      if (loopActiveRef.current) setTimeout(() => startWebSpeechLoop(), 1000);
    };

    recog.onend = () => {
      if (loopActiveRef.current) setTimeout(() => startWebSpeechLoop(), 500);
    };

    recog.start();
  }, [muted]);

  const stopWebSpeechLoop = useCallback(() => {
    loopActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (synthRef.current) synthRef.current.cancel();
  }, []);

  // ── Expo-native voice loop (uses apiStt/apiTts) ──────────────────────
  const transcribeAndReply = async (audioUri: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
        reader.readAsDataURL(blob);
      });

      const { data: sttData } = await apiStt(base64);
      const userText = sttData?.text ?? '(Speech not recognized)';
      setTranscript(userText);

      const { data: chatData } = await apiSendMessage('aurora', userText);
      const replyText = chatData?.aiMessage?.content ?? "I'm here. Tell me more.";
      setLastResponse(replyText);

      const { data: ttsData } = await apiTts(replyText);
      if (ttsData) {
        const uint8 = new Uint8Array(ttsData);
        const binary = String.fromCharCode(...uint8);
        const b64 = btoa(binary);
        const dataUri = `data:audio/mp3;base64,${b64}`;

        playerRef.current?.remove();
        const player = createAudioPlayer({ uri: dataUri });
        playerRef.current = player;
        player.volume = muted ? 0 : 1;
        player.addListener('playbackStatusUpdate', (status) => {
          if (status.didJustFinish) startCallRecording();
        });
        if (!muted) player.play();
      } else {
        startCallRecording();
      }
    } catch {
      startCallRecording();
    }
    setIsProcessing(false);
  };

  const startCallRecording = async () => {
    try {
      if (recorder.isRecording) await recorder.stop();
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Recording Error', 'Could not start recording. Check microphone permissions.');
    }
  };

  const stopCallRecording = async () => {
    try {
      if (!recorder.isRecording) return;
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) await transcribeAndReply(uri);
    } catch {
      setIsProcessing(false);
    }
  };

  const [micError, setMicError] = useState<string | null>(null);

  const startCall = async () => {
    if (callActive) return;
    setCallActive(true);
    setSecondsElapsed(0);
    setTranscript(null);
    setLastResponse(null);
    setMicError(null);
    startWaveAnimation();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);

    if (IS_WEB) {
      if (hasWebSpeech()) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          setMicError('Microphone permission denied. Please allow mic access in your browser and try again.');
          endCall();
          return;
        }
        startWebSpeechLoop();
      } else {
        setMicError('Voice recording requires Chrome or Edge browser. Please switch or allow microphone access.');
        endCall();
      }
    } else {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setMicError('Microphone permission denied. Please allow mic access and try again.');
        endCall();
        return;
      }
      await startCallRecording();
    }
  };

  const endCall = async () => {
    loopActiveRef.current = false;
    setCallActive(false);
    setMuted(false);
    stopWaveAnimation();
    stopWebSpeechLoop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    await stopCallRecording();
    playerRef.current?.remove();
    playerRef.current = null;
    setSecondsElapsed(0);
    setTranscript(null);
    setLastResponse(null);
    router.back();
  };

  const toggleMute = () => {
    if (!callActive) {
      Alert.alert('Start a call first', 'Tap the mic to begin a call before using mute.');
      return;
    }
    setMuted(prev => {
      if (!prev) {
        setWaveHeights(Array(WAVE_BAR_COUNT).fill(8));
        if (waveRef.current) clearInterval(waveRef.current);
        if (playerRef.current) playerRef.current.volume = 0;
        if (synthRef.current) synthRef.current.cancel();
      } else {
        startWaveAnimation();
        if (playerRef.current) playerRef.current.volume = 1;
      }
      return !prev;
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4c1d95', '#2e1065', '#0f172a']}
        locations={[0.2, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View pointerEvents="none" style={styles.orbOverlay1} />
      <View pointerEvents="none" style={styles.orbOverlay2} />

      <View style={[styles.containerInner, { paddingTop: topPad }]}>
        <View style={styles.mainHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={endCall} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Call</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.callContainer}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <PulseRings />
              <LinearGradient
                colors={['#c084fc', '#7c3aed']}
                style={styles.avatarLarge}
              >
                <Ionicons name="sparkles" size={56} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.callerName}>Aurora</Text>
            <View style={styles.callStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Neural voice channel</Text>
            </View>
          </View>

          {callActive && (
            <>
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>
              </View>

              <View style={styles.waveform}>
                {waveHeights.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: h,
                        opacity: muted ? 0.3 : (0.5 + Math.random() * 0.5),
                      },
                    ]}
                  />
                ))}
              </View>

              {(transcript || lastResponse) && (
                <ScrollView style={styles.transcriptBox} showsVerticalScrollIndicator={false}>
                  {transcript && (
                    <View style={styles.transcriptRow}>
                      <Text style={styles.transcriptLabel}>You said:</Text>
                      <Text style={styles.transcriptText}>{transcript}</Text>
                    </View>
                  )}
                  {lastResponse && (
                    <View style={styles.transcriptRow}>
                      <Text style={styles.transcriptLabel}>Aurora:</Text>
                      <Text style={styles.transcriptText}>{lastResponse}</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {isProcessing && (
                <Text style={styles.processingText}>Processing...</Text>
              )}

              {micError && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color="#f87171" />
                  <Text style={styles.errorText}>{micError}</Text>
                </View>
              )}
            </>
          )}

          <View>
            <RotatingRing>
              <TouchableOpacity
                style={[styles.micButton, callActive && styles.micButtonActive]}
                onPress={startCall}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={muted ? 'mic-off' : 'mic'}
                  size={40}
                  color="#fff"
                />
              </TouchableOpacity>
            </RotatingRing>
            <Text style={styles.micLabel}>
              {callActive ? 'Connected · Listening' : 'Tap mic to begin'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.muteBtn, muted && styles.muteBtnActive]}
              onPress={toggleMute}
              activeOpacity={0.8}
            >
              <Ionicons
                name={muted ? 'mic-off' : 'mic-off-outline'}
                size={24}
                color={muted ? '#f87171' : '#fff'}
              />
              <Text style={styles.actionLabel}>Mute</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.endBtn]}
              onPress={endCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.actionLabel}>End</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimer}>
            <Ionicons name="hardware-chip-outline" size={12} color="rgba(216,180,254,0.85)" />
            <Text style={styles.disclaimerText}>AI companion — not a real person</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  orbOverlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    shadowColor: '#c084fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 120,
    elevation: 0,
  },
  orbOverlay2: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 120,
    elevation: 0,
  },
  containerInner: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 35, 0.45)',
    zIndex: 2,
  },

  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 30,
    backgroundColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    fontFamily: 'Sora_700Bold',
  },

  callContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },

  avatarSection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 35,
    elevation: 10,
    borderWidth: 4,
    borderColor: 'rgba(168,85,247,0.6)',
    zIndex: 2,
  },
  callerName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'Sora_800ExtraBold',
    marginBottom: 6,
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 0,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(216,180,254,0.9)',
    fontFamily: 'Manrope_600SemiBold',
  },

  timerBox: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 60,
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.5)',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 3,
    fontFamily: 'Sora_700Bold',
    fontVariant: ['tabular-nums'],
  },

  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    marginBottom: 20,
  },
  waveBar: {
    width: 5,
    backgroundColor: '#c084fc',
    borderRadius: 8,
    shadowColor: 'rgba(192,132,252,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 0,
  },

  micButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(139,92,246,0.5)',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
    zIndex: 3,
  },
  micButtonActive: {
    backgroundColor: '#c084fc',
  },
  transcriptBox: {
    maxHeight: 100,
    width: '100%',
    marginBottom: 12,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  transcriptRow: {
    marginBottom: 6,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(192,132,252,0.7)',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  transcriptText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 18,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(192,132,252,0.8)',
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(239,68,68,0.4)',
    marginBottom: 8,
    maxWidth: '90%',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fca5a5',
    fontFamily: 'Manrope_600SemiBold',
    flex: 1,
  },
  micLabel: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(216,180,254,0.9)',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: 'Manrope_600SemiBold',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 12,
  },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Manrope_600SemiBold',
    position: 'absolute',
    bottom: -18,
  },
  muteBtn: {},
  muteBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderColor: '#ef4444',
  },
  endBtn: {
    backgroundColor: 'rgba(239,68,68,0.5)',
    borderColor: '#ef4444',
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,85,247,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 40,
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.3)',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(216,180,254,0.85)',
    fontFamily: 'Manrope_500Medium',
  },
});
