import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  LayoutAnimation,
  Platform,
  ViewStyle,
  Animated,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { font, moderateScale } from '@/src/ui/scale';

// TODO: Load FAQ from Firestore later
// Collection: 'appContent', doc: 'faq', field: 'items'
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface MiniFAQProps {
  items: FAQItem[];
  singleOpen?: boolean;
  initiallyOpenId?: string | null;
  style?: ViewStyle;
}

interface FAQRowProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

function FAQRow({ item, isOpen, onToggle }: FAQRowProps) {
  const [rotateAnim] = useState(new Animated.Value(isOpen ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, rotateAnim]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    onToggle(item.id);
  }, [item.id, onToggle]);

  const handleKeyDown = useCallback((event: any) => {
    if (Platform.OS === 'web' && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      handlePress();
    }
  }, [handlePress]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.rowContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.questionRow,
          pressed && styles.questionRowPressed,
        ]}
        onPress={handlePress}
        {...(Platform.OS === 'web' && { onKeyDown: handleKeyDown, 'aria-expanded': isOpen })}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        testID={`faq-question-${item.id}`}
      >
        <Text style={styles.questionText} allowFontScaling={false}>
          {item.question}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronRight size={moderateScale(16)} color={theme.colors.gray} />
        </Animated.View>
      </Pressable>
      
      {isOpen && (
        <View
          style={styles.answerContainer}
          {...(Platform.OS === 'web' && { accessibilityRole: 'summary' as any })}
          testID={`faq-answer-${item.id}`}
        >
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function MiniFAQ({
  items,
  singleOpen = true,
  initiallyOpenId = null,
  style,
}: MiniFAQProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(initiallyOpenId ? [initiallyOpenId] : [])
  );

  const handleToggle = useCallback(
    (id: string) => {
      setOpenIds((prev) => {
        const newSet = new Set(prev);
        
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          if (singleOpen) {
            newSet.clear();
          }
          newSet.add(id);
        }
        
        return newSet;
      });
    },
    [singleOpen]
  );

  const renderItem = useCallback(
    ({ item }: { item: FAQItem }) => (
      <FAQRow
        item={item}
        isOpen={openIds.has(item.id)}
        onToggle={handleToggle}
      />
    ),
    [openIds, handleToggle]
  );

  const keyExtractor = useCallback((item: FAQItem) => item.id, []);

  // Use FlatList for performance if more than 10 items
  if (items.length > 10) {
    return (
      <View style={[styles.container, style]} testID="mini-faq">
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID="mini-faq">
      {items.map((item) => (
        <FAQRow
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={handleToggle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  rowContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(16),
    minHeight: moderateScale(44),
    backgroundColor: theme.colors.card,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    }),
  },
  questionRowPressed: {
    backgroundColor: theme.colors.lightGray,
  },
  questionText: {
    flex: 1,
    fontSize: font(14),
    fontWeight: '600',
    color: theme.colors.dark,
    marginRight: moderateScale(12),
    lineHeight: font(20),
  },
  answerContainer: {
    paddingHorizontal: moderateScale(16),
    paddingTop: moderateScale(4),
    paddingBottom: moderateScale(16),
    backgroundColor: theme.colors.card,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
    }),
  },
  answerText: {
    fontSize: font(13),
    color: theme.colors.gray,
    lineHeight: font(18),
  },
});