import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MessageSquareText, Play } from 'lucide-react-native';
import { useAutoArrive } from '@/hooks/useAutoArrive';
import { useLoads } from '@/hooks/useLoads';

interface Props {}

function AutoArriveSheetInner(_: Props) {
  const { isSheetOpen, closeSheet, sheetLoadId } = useAutoArrive();
  const { currentLoad } = useLoads();

  const visible = isSheetOpen && sheetLoadId && currentLoad && sheetLoadId === currentLoad.id;
  const pickup = currentLoad?.origin;

  const onCall = () => {
    try {
      if (!currentLoad) return;
      const url = 'tel:' + (currentLoad.shipperId || '');
      if (Platform.OS === 'web') {
        window.open(url, '_self');
      } else {
        Linking.openURL(url).catch(() => {});
      }
    } catch {}
  };
  const onText = () => {
    try {
      if (!currentLoad) return;
      const url = 'sms:' + (currentLoad.shipperId || '');
      if (Platform.OS === 'web') {
        window.open(url, '_self');
      } else {
        Linking.openURL(url).catch(() => {});
      }
    } catch {}
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.backdrop} testID="autoArriveBackdrop" accessibilityLabel="Close actions" accessible onTouchEnd={closeSheet} />
      <SafeAreaView style={styles.sheetContainer} edges={['bottom']}>
        <View style={styles.sheet} testID="autoArriveSheet" accessibilityRole="menu">
          <Text style={styles.title}>Arrived at pickup</Text>
          <Text style={styles.subtitle}>{pickup?.city}, {pickup?.state}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onCall} accessibilityLabel="Call" testID="btnCall" activeOpacity={0.8}>
              <Phone color="#fff" size={22} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onText} accessibilityLabel="Message" testID="btnMessage" activeOpacity={0.8}>
              <MessageSquareText color="#fff" size={22} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.primary]} onPress={closeSheet} accessibilityLabel="Start Loading" testID="btnStartLoading" activeOpacity={0.8}>
              <Play color="#111" size={22} />
              <Text style={[styles.actionText, styles.primaryText]}>Start Loading</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default memo(AutoArriveSheetInner);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    backgroundColor: '#ffd60a',
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryText: {
    color: '#111',
  }
});
