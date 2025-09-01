import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Animated, Easing, ActionSheetIOS, LayoutChangeEvent, findNodeHandle, UIManager } from 'react-native';
import { theme } from '@/constants/theme';

interface SortDropdownProps {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  testID?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, options, onChange, testID }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [anchorY, setAnchorY] = useState<number>(0);
  const [anchorX, setAnchorX] = useState<number>(0);
  const [menuWidth, setMenuWidth] = useState<number>(180);
  const anim = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<TouchableOpacity | null>(null);

  const openMenu = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: 'light',
          title: 'Sort by',
        },
        (index) => {
          if (index !== undefined && index >= 0 && index < options.length) {
            onChange(options[index]);
          }
        }
      );
      return;
    }

    if (Platform.OS === 'web') {
      const handle = findNodeHandle(buttonRef.current);
      if (handle) {
        UIManager.measure(handle, (_x, _y, w, _h, pageX, pageY) => {
          setAnchorX(pageX);
          setAnchorY(pageY + 36);
          setMenuWidth(Math.max(160, w));
          setIsOpen(true);
          Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
        });
      } else {
        setIsOpen(true);
        Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: false }).start();
      }
      return;
    }

    setIsOpen(true);
    Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
  }, [ActionSheetIOS, Platform.OS, options, onChange, anim]);

  const closeMenu = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: false, easing: Easing.in(Easing.quad) }).start(({ finished }) => {
      if (finished) setIsOpen(false);
    });
  }, [anim]);

  const handleSelect = useCallback((opt: string) => {
    onChange(opt);
    closeMenu();
  }, [onChange, closeMenu]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  const onButtonLayout = useCallback((e: LayoutChangeEvent) => {
    if (Platform.OS !== 'web') return;
    const { layout } = e.nativeEvent;
    setMenuWidth(Math.max(160, layout.width));
  }, []);

  const label = useMemo(() => value, [value]);

  return (
    <>
      <TouchableOpacity
        ref={(r) => (buttonRef.current = r)}
        onPress={openMenu}
        style={styles.sortChip}
        testID={testID ?? 'sort-dropdown-button'}
        accessibilityRole="button"
        onLayout={onButtonLayout}
      >
        <Text style={styles.sortChipText}>{label}</Text>
        <Text style={styles.sortChevron}>▾</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && isOpen && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View style={[styles.webMenu, { top: anchorY, left: anchorX, width: menuWidth, opacity, transform: [{ translateY }] }]}>
            {options.map((opt) => (
              <TouchableOpacity key={opt} style={styles.menuItem} onPress={() => handleSelect(opt)} accessibilityRole="button" testID={`sort-option-${opt}`}>
                <Text style={[styles.menuItemText, opt === value && styles.menuItemTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      )}

      {Platform.OS === 'android' && (
        <Modal transparent visible={isOpen} animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View style={[styles.sheet, { opacity, transform: [{ translateY }] }]}
            testID="sort-bottom-sheet">
            <View style={styles.sheetHandle} />
            {options.map((opt) => (
              <TouchableOpacity key={opt} style={styles.sheetItem} onPress={() => handleSelect(opt)} accessibilityRole="button" testID={`sort-option-${opt}`}>
                <Text style={[styles.sheetItemText, opt === value && styles.sheetItemTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  sortChip: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortChipText: {
    color: theme.colors.dark,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  sortChevron: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  webMenu: {
    position: 'absolute',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  menuItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.lightGray,
    marginVertical: 8,
  },
  sheetItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  sheetItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
