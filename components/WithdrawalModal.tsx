import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { X, DollarSign, AlertCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { usePayments } from '@/hooks/usePayments';

interface WithdrawalModalProps {
  visible: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, method: string) => Promise<void>;
  availableBalance: number;
}

export default function WithdrawalModal({
  visible,
  onClose,
  onWithdraw,
  availableBalance,
}: WithdrawalModalProps) {
  const { methods } = usePayments();
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const defaultMethod = methods.find(m => m.isDefault);
  const withdrawalAmount = parseFloat(amount) || 0;
  const isValidAmount = withdrawalAmount > 0 && withdrawalAmount <= availableBalance;

  const handleWithdraw = useCallback(async () => {
    if (!isValidAmount) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    const methodToUse = selectedMethod || defaultMethod?.name || 'Default Payment Method';

    try {
      setIsProcessing(true);
      await onWithdraw(withdrawalAmount, methodToUse);
      setAmount('');
      setSelectedMethod('');
      onClose();
      Alert.alert(
        'Withdrawal Initiated',
        `Your withdrawal of $${withdrawalAmount.toLocaleString()} has been initiated. Funds will be available in 1-3 business days.`
      );
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Withdrawal Failed', 'Unable to process withdrawal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [isValidAmount, withdrawalAmount, selectedMethod, defaultMethod, onWithdraw, onClose]);

  const handleClose = useCallback(() => {
    setAmount('');
    setSelectedMethod('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Withdraw Funds</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              ${availableBalance.toLocaleString()}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
            <View style={styles.amountInput}>
              <DollarSign size={20} color={theme.colors.gray} />
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            {withdrawalAmount > availableBalance && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color={theme.colors.danger} />
                <Text style={styles.errorText}>
                  Amount exceeds available balance
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {methods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  (selectedMethod === method.name || (!selectedMethod && method.isDefault)) &&
                    styles.selectedMethod,
                ]}
                onPress={() => setSelectedMethod(method.name)}
              >
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDetail}>{method.detail}</Text>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.feeInfo}>
            <Text style={styles.feeText}>
              Processing time: 1-3 business days • No withdrawal fees
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!isValidAmount || isProcessing) && styles.disabledButton,
            ]}
            onPress={handleWithdraw}
            disabled={!isValidAmount || isProcessing}
          >
            <Text style={styles.withdrawButtonText}>
              {isProcessing ? 'Processing...' : `Withdraw $${withdrawalAmount.toLocaleString()}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  balanceInfo: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  balanceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.8,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.white,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.dark,
    marginLeft: theme.spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    marginLeft: theme.spacing.xs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMethod: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  methodDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  defaultBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  defaultText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
  },
  feeInfo: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  feeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  withdrawButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.gray,
    opacity: 0.6,
  },
  withdrawButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
});