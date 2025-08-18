import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X, AlertCircle, Save } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { preInspectionCategories } from '@/mocks/inspectionItems';

type InspectionStatus = 'pass' | 'fail' | 'na';

export default function PreTripInspectionScreen() {
  const router = useRouter();
  const [inspectionItems, setInspectionItems] = useState<Record<string, InspectionStatus>>({});
  const [notes, setNotes] = useState('');

  const handleStatusChange = (item: string, status: InspectionStatus) => {
    setInspectionItems(prev => ({ ...prev, [item]: status }));
  };

  const handleSave = () => {
    console.log('Saving inspection:', { inspectionItems, notes });
    router.back();
  };

  const getStatusColor = (status?: InspectionStatus) => {
    switch (status) {
      case 'pass': return theme.colors.success;
      case 'fail': return theme.colors.danger;
      case 'na': return theme.colors.gray;
      default: return theme.colors.lightGray;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pre-Trip Inspection</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Save size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <AlertCircle size={20} color={theme.colors.warning} />
            <Text style={styles.infoText}>
              Complete all required inspection items before starting your trip
            </Text>
          </View>

          {preInspectionCategories.map((category) => (
            <View key={category.category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              
              {category.items.map((item) => {
                const itemKey = `${category.category}-${item}`;
                const status = inspectionItems[itemKey];
                
                return (
                  <View key={item} style={styles.inspectionItem}>
                    <Text style={styles.itemName}>{item}</Text>
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          status === 'pass' && styles.statusButtonActive,
                          { borderColor: theme.colors.success }
                        ]}
                        onPress={() => handleStatusChange(itemKey, 'pass')}
                      >
                        <Check size={16} color={status === 'pass' ? theme.colors.white : theme.colors.success} />
                        <Text style={[
                          styles.statusButtonText,
                          status === 'pass' && styles.statusButtonTextActive
                        ]}>Pass</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          status === 'fail' && styles.statusButtonActive,
                          status === 'fail' && { backgroundColor: theme.colors.danger },
                          { borderColor: theme.colors.danger }
                        ]}
                        onPress={() => handleStatusChange(itemKey, 'fail')}
                      >
                        <X size={16} color={status === 'fail' ? theme.colors.white : theme.colors.danger} />
                        <Text style={[
                          styles.statusButtonText,
                          status === 'fail' && styles.statusButtonTextActive
                        ]}>Fail</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          status === 'na' && styles.statusButtonActive,
                          status === 'na' && { backgroundColor: theme.colors.gray },
                          { borderColor: theme.colors.gray }
                        ]}
                        onPress={() => handleStatusChange(itemKey, 'na')}
                      >
                        <Text style={[
                          styles.statusButtonText,
                          status === 'na' && styles.statusButtonTextActive
                        ]}>N/A</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter any additional notes or observations..."
              placeholderTextColor={theme.colors.gray}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.completeButton} onPress={handleSave}>
            <Text style={styles.completeButtonText}>Complete Inspection</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  closeButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#fff9e6',
    padding: theme.spacing.md,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  categorySection: {
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  categoryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  inspectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  itemName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  statusButtonActive: {
    backgroundColor: theme.colors.success,
  },
  statusButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  statusButtonTextActive: {
    color: theme.colors.white,
  },
  notesSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  notesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    minHeight: 100,
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
});