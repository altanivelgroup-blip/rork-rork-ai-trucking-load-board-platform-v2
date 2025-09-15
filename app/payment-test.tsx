import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, DollarSign, Star, Zap } from 'lucide-react-native';
import { theme, type Theme } from '@/constants/theme';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';

export default function PaymentTestScreen() {
  const { user } = useAuth();
  const {
    isProcessing,
    transactions,
    processDeliveryFee,
    processMembershipUpgrade,
    processWalletTopUp,
    getPaymentHistory,
  } = usePayments();

  const [topUpAmount, setTopUpAmount] = useState<string>('50.00');
  const [deliveryAmount, setDeliveryAmount] = useState<string>('2500.00');

  const handleDeliveryFeeTest = async () => {
    try {
      const amount = parseFloat(deliveryAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid delivery amount');
        return;
      }

      await processDeliveryFee('test_load_123', amount);
      Alert.alert('Success', 'Delivery fee processed successfully!');
    } catch (error) {
      Alert.alert('Error', `Payment failed: ${error}`);
    }
  };

  const handleMembershipUpgrade = async (type: 'basic' | 'premium') => {
    try {
      await processMembershipUpgrade(type);
      Alert.alert('Success', `${type} membership upgrade processed successfully!`);
    } catch (error) {
      Alert.alert('Error', `Payment failed: ${error}`);
    }
  };

  const handleWalletTopUp = async () => {
    try {
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount < 5) {
        Alert.alert('Error', 'Minimum top-up amount is $5.00');
        return;
      }

      await processWalletTopUp(Math.round(amount * 100)); // Convert to cents
      Alert.alert('Success', 'Wallet top-up processed successfully!');
    } catch (error) {
      Alert.alert('Error', `Payment failed: ${error}`);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      await getPaymentHistory();
      Alert.alert('Success', 'Payment history loaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to load payment history: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <CreditCard size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Payment Gateway Test</Text>
          <Text style={styles.subtitle}>Test Stripe integration and payment flows</Text>
        </View>

        {/* Delivery Fee Test */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Fee (5%)</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Test automatic 5% fee deduction on completed deliveries
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Delivery Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={deliveryAmount}
              onChangeText={setDeliveryAmount}
              placeholder="2500.00"
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={handleDeliveryFeeTest}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <DollarSign size={20} color="#fff" />
                <Text style={styles.buttonText}>Process 5% Fee</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Membership Upgrades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Membership Upgrades</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Test membership upgrade payments ($49 Basic, $199 Premium)
          </Text>

          <View style={styles.membershipButtons}>
            <TouchableOpacity
              style={[styles.membershipButton, styles.basicButton]}
              onPress={() => handleMembershipUpgrade('basic')}
              disabled={isProcessing}
            >
              <Text style={styles.membershipButtonText}>Basic - $49</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.membershipButton, styles.premiumButton]}
              onPress={() => handleMembershipUpgrade('premium')}
              disabled={isProcessing}
            >
              <Text style={styles.membershipButtonText}>Premium - $199</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Top-up */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Wallet Top-up</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Test wallet balance top-up functionality
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Top-up Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholder="50.00"
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isProcessing && styles.buttonDisabled]}
            onPress={handleWalletTopUp}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Zap size={20} color="#fff" />
                <Text style={styles.buttonText}>Top-up Wallet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment History</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={loadPaymentHistory}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryButtonText}>Load Payment History</Text>
          </TouchableOpacity>

          {transactions.length > 0 && (
            <View style={styles.transactionsList}>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
              {transactions.slice(0, 5).map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <Text style={styles.transactionType}>{transaction.type}</Text>
                  <Text style={styles.transactionAmount}>
                    ${(transaction.amount / 100).toFixed(2)}
                  </Text>
                  <Text style={styles.transactionStatus}>{transaction.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Test Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Test Mode Information</Text>
          <Text style={styles.infoText}>
            • All payments are processed in Stripe test mode{'\n'}
            • Use test card: 4242 4242 4242 4242{'\n'}
            • Any future date and CVC{'\n'}
            • No real money will be charged{'\n'}
            • User: {user?.email || 'Not logged in'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  membershipButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  membershipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  basicButton: {
    backgroundColor: '#4CAF50',
  },
  premiumButton: {
    backgroundColor: '#FF9800',
  },
  membershipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    marginTop: 20,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  transactionType: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  transactionStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});