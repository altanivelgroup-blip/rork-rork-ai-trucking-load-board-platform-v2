import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface VoiceCaptureProps {
  onTranscribed: (text: string) => void;
  size?: 'sm' | 'md';
  label?: string;
  testID?: string;
}

export const VoiceCapture: React.FC<VoiceCaptureProps> = memo(({ onTranscribed, size = 'md', label, testID }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const chunksRef = useRef<BlobPart[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await sendToSTT(blob);
        } catch (e) {
          console.log('[VoiceCapture] onstop error', e);
        }
      };
      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.log('[VoiceCapture] startWebRecording error', e);
      Alert.alert('Microphone Error', 'Please allow microphone access in your browser.');
    }
  }, []);

  const stopWebRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } catch (e) {
      console.log('[VoiceCapture] stopWebRecording error', e);
    }
  }, []);

  const sendToSTT = useCallback(async (blob: Blob) => {
    setIsSending(true);
    try {
      const file = new File([blob], 'speech.webm', { type: 'audio/webm' });
      const form = new FormData();
      form.append('audio', file as unknown as Blob);
      const res = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as { text?: string };
      const txt = (data?.text ?? '').trim();
      if (txt.length > 0) {
        onTranscribed(txt);
      } else {
        Alert.alert('No speech detected', 'Try speaking closer to the mic.');
      }
    } catch (e) {
      console.log('[VoiceCapture] STT error', e);
      Alert.alert('Transcription failed', 'Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [onTranscribed]);

  const handlePress = useCallback(() => {
    if (Platform.OS === 'web') {
      if (!isRecording) void startWebRecording();
      else stopWebRecording();
      return;
    }
    Alert.alert('Recording not enabled', 'Voice capture is available on web preview. We can enable mobile recording next.');
  }, [isRecording, startWebRecording, stopWebRecording]);

  const s = useMemo(() => (size === 'sm' ? styles.sm : styles.md), [size]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.btn, s, isRecording && styles.btnActive]}
      disabled={isSending}
      accessibilityRole="button"
      testID={testID ?? 'voice-capture-btn'}
    >
      {isSending ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : isRecording ? (
        <Square size={16} color={theme.colors.white} />
      ) : (
        <Mic size={16} color={theme.colors.white} />
      )}
      {label ? <Text style={styles.text}>{isRecording ? 'Stop' : label}</Text> : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  sm: { height: 36 },
  md: { height: 48 },
  btnActive: { backgroundColor: theme.colors.dark },
  text: { color: theme.colors.white, fontWeight: '700' },
});
