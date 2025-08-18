import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Camera, ImagePlus, Trash2, CheckCircle2, UploadCloud } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface DamagePhotosState {
  pickup: string[];
  delivery: string[];
}

type SectionKey = 'pickup' | 'delivery';

const STORAGE_KEY_PREFIX = 'damage_photos_v1_';

export default function DamageProtectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ loadId?: string }>();
  const loadId = params?.loadId ?? 'general';

  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}${loadId}`, [loadId]);

  const [state, setState] = useState<DamagePhotosState>({ pickup: [], delivery: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DamagePhotosState;
        setState({ pickup: parsed.pickup ?? [], delivery: parsed.delivery ?? [] });
      } else {
        setState({ pickup: [], delivery: [] });
      }
    } catch (e) {
      console.error('[DamageProtection] hydrate error', e);
      Alert.alert('Error', 'Failed to load previously saved photos.');
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  const persist = useCallback(async (next: DamagePhotosState) => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error('[DamageProtection] persist error', e);
      Alert.alert('Save Error', 'Could not save photos locally.');
    } finally {
      setSaving(false);
    }
  }, [storageKey]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'web') return { camera: true, media: true } as const;
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return { camera: camStatus === 'granted', media: libStatus === 'granted' } as const;
  }, []);

  const addImage = useCallback(async (section: SectionKey, mode: 'camera' | 'library') => {
    const perms = await requestPermissions();
    if (mode === 'camera' && !perms.camera) {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
      return;
    }
    if (mode === 'library' && !perms.media) {
      Alert.alert('Permission needed', 'Media library permission is required to upload a photo.');
      return;
    }

    try {
      if (mode === 'camera') {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
          exif: false,
        });
        if (!result.canceled) {
          const uri = result.assets[0]?.uri ?? '';
          if (uri) {
            const next: DamagePhotosState = { ...state, [section]: [uri, ...state[section]] } as DamagePhotosState;
            setState(next);
            await persist(next);
          }
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
          exif: false,
          selectionLimit: 1,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (!result.canceled) {
          const uri = result.assets[0]?.uri ?? '';
          if (uri) {
            const next: DamagePhotosState = { ...state, [section]: [uri, ...state[section]] } as DamagePhotosState;
            setState(next);
            await persist(next);
          }
        }
      }
    } catch (e) {
      console.error('[DamageProtection] addImage error', e);
      Alert.alert('Photo Error', 'Could not capture or select a photo.');
    }
  }, [persist, requestPermissions, state]);

  const removeImage = useCallback(async (section: SectionKey, uri: string) => {
    const nextArr = state[section].filter((u) => u !== uri);
    const next: DamagePhotosState = { ...state, [section]: nextArr };
    setState(next);
    await persist(next);
  }, [persist, state]);

  const Section = useCallback(({ title, section }: { title: string; section: SectionKey }) => {
    const data = state[section];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => addImage(section, 'camera')}
              style={styles.iconButton}
              testID={`btn-${section}-camera`}
            >
              <Camera size={20} color={theme.colors.white} />
              <Text style={styles.iconButtonText}>Live Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => addImage(section, 'library')}
              style={[styles.iconButton, styles.secondaryButton]}
              testID={`btn-${section}-upload`}
            >
              <UploadCloud size={20} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>

        {data.length === 0 ? (
          <View style={styles.emptyBox}>
            <ImagePlus size={28} color={theme.colors.gray} />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>Add clear shots of all sides for protection</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(u) => u}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbList}
            renderItem={({ item }) => (
              <View style={styles.thumbItem}>
                <Image
                  source={{ uri: item }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={150}
                />
                <TouchableOpacity
                  onPress={() => void removeImage(section, item)}
                  style={styles.deleteBadge}
                  testID={`delete-${section}-${encodeURIComponent(item)}`}
                >
                  <Trash2 size={16} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  }, [addImage, removeImage, state]);

  const canComplete = state.pickup.length > 0 && state.delivery.length > 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="damage-protection-screen">
      <View style={styles.headerNote}>
        <CheckCircle2 size={18} color={theme.colors.success} />
        <Text style={styles.headerNoteText}>
          Add photos at pickup and delivery. They will be saved to your device for documentation.
        </Text>
      </View>

      <Section title="Pickup Photos" section="pickup" />
      <Section title="Delivery Photos" section="delivery" />

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!canComplete || saving}
          onPress={() => router.back()}
          style={[styles.primaryCta, (!canComplete || saving) && styles.disabledCta]}
          testID="btn-finish"
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.primaryCtaText}>{canComplete ? 'Save & Close' : 'Add required photos'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F1FAF3',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  headerNoteText: {
    flex: 1,
    color: theme.colors.dark,
    fontSize: theme.fontSize.sm,
  },
  section: {
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  iconButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#CBD5FF',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.lightGray,
    gap: 6,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.md,
  },
  emptySubtext: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
  thumbList: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  thumbItem: {
    marginRight: theme.spacing.sm,
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
  },
  deleteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 999,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  primaryCta: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  disabledCta: {
    opacity: 0.6,
  },
  primaryCtaText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});
