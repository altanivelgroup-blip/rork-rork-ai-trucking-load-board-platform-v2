import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, TrendingUp, Download, CreditCard, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import ConfirmationModal from '@/components/ConfirmationModal';

import { Link } from 'expo-router';

const mockTransactions = [
  {
    id: 'withdrawal-1',
    amount: -500,
    type: 'withdrawal' as const,
    description: 'Bank Transfer',
    date: new Date('2025-01-14'),
    isLoad: false,
  },
  {
    id: 'fee-1',
    amount: -50,
    type: 'fee' as const,
    description: 'Platform Fee',
    date: new Date('2025-01-12'),
    isLoad: false,
  },
];

export default function WalletScreen() {
  const { user } = useAuth();
  const { loads } = useLoads();
  const { deleteCompletedLoadWithToast } = useLoadsWithToast();
  const wallet = user?.wallet;
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; description: string } | null>(null);

  // Get completed loads for this driver
  const completedLoads = useMemo(() => {
    return loads.filter(load => 
      load.status === 'delivered' && 
      load.assignedDriverId === user?.id
    );
  }, [loads, user?.id]);

  // Convert completed loads to transaction format
  const loadTransactions = useMemo(() => {
    return completedLoads.map(load => ({
      id: load.id,
      amount: load.rate || 0,
      type: 'earning' as const,
      description: `${load.description || 'Load'} - ${load.origin?.city || 'Unknown'} to ${load.destination?.city || 'Unknown'}`,
      date: load.deliveryDate ? new Date(load.deliveryDate) : new Date(),
      isLoad: true,
    }));
  }, [completedLoads]);

  // Combine and sort all transactions
  const allTransactions = useMemo(() => {
    return [...loadTransactions, ...mockTransactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [loadTransactions]);

  const handleDeleteTransaction = useCallback((transactionId: string, description: string) => {
    setTransactionToDelete({ id: transactionId, description });
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteTransaction = useCallback(async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteCompletedLoadWithToast(transactionToDelete.id);
      setDeleteModalVisible(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Failed to delete completed load:', error);
    }
  }, [transactionToDelete, deleteCompletedLoadWithToast]);

  const cancelDeleteTransaction = useCallback(() => {
    setDeleteModalVisible(false);
    setTransactionToDelete(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <Link href="/payment-methods" asChild>
          <TouchableOpacity
            style={styles.pmBtn}
            testID="wallet-payment-methods"
          >
            <CreditCard size={16} color={theme.colors.primary} />
            <Text style={styles.pmBtnText}>Payment Methods</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            ${wallet?.balance.toLocaleString() || '0'}
          </Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <TrendingUp size={16} color={theme.colors.warning} />
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemAmount}>
                ${wallet?.pendingEarnings.toLocaleString() || '0'}
              </Text>
            </View>
            
            <View style={styles.balanceItem}>
              <DollarSign size={16} color={theme.colors.success} />
              <Text style={styles.balanceItemLabel}>Total Earned</Text>
              <Text style={styles.balanceItemAmount}>
                ${wallet?.totalEarnings.toLocaleString() || '0'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Download size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
            
            <Link href="/payment-methods" asChild>
              <TouchableOpacity style={StyleSheet.flatten([styles.actionButton, styles.secondaryButton])} testID="wallet-add-bank">
                <CreditCard size={20} color={theme.colors.primary} />
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Add Bank
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {allTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                {transaction.type === 'earning' ? (
                  <ArrowDownRight size={20} color={theme.colors.success} />
                ) : (
                  <ArrowUpRight size={20} color={theme.colors.danger} />
                )}
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {transaction.date.toLocaleDateString()}
                </Text>
              </View>
              
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'earning'
                    ? styles.amountPositive
                    : styles.amountNegative,
                ]}
              >
                {transaction.type === 'earning' ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
              </Text>
              
              {(transaction as any).isLoad && (
                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(transaction.id, transaction.description)}
                  style={styles.deleteButton}
                  testID={`delete-transaction-${transaction.id}`}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Loads Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>$18.5k</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>8,450</Text>
              <Text style={styles.statLabel}>Miles Driven</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>$2.19</Text>
              <Text style={styles.statLabel}>Avg Per Mile</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Remove Load from History"
        message={`Are you sure you want to remove "${transactionToDelete?.description}" from your wallet history? This will clean up your earnings view but won't affect the shipper's records.`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="#ef4444"
        onConfirm={confirmDeleteTransaction}
        onCancel={cancelDeleteTransaction}
        testID="delete-transaction-modal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  balanceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.8,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.lg,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.white,
    opacity: 0.8,
  },
  balanceItemAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.white,
    marginRight: 0,
  },
  secondaryButtonText: {
    color: theme.colors.white,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  transactionAmount: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    marginRight: theme.spacing.sm,
  },
  amountPositive: {
    color: theme.colors.success,
  },
  amountNegative: {
    color: theme.colors.danger,
  },
  pmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  pmBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    marginLeft: 6,
  },
  statsContainer: {
    padding: theme.spacing.md,
  },
  statsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  deleteButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#fef2f2',
  },
});