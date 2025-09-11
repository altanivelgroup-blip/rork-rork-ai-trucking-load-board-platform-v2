import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, TrendingUp, Download, CreditCard, ArrowUpRight, ArrowDownRight, Trash2, Calendar, BarChart3, Fuel, Minus } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useWallet, Transaction } from '@/hooks/useWallet';
import ConfirmationModal from '@/components/ConfirmationModal';
import WithdrawalModal from '@/components/WithdrawalModal';

import { Link } from 'expo-router';

export default function WalletScreen() {
  const { user } = useAuth();
  const { deleteCompletedLoadWithToast } = useLoadsWithToast();
  const {
    balance,
    pendingEarnings,
    totalEarnings,
    totalWithdrawn,
    transactions,
    monthlyStats,
    isLoading,
    withdraw,
    calculatePlatformFee,
    getNetEarnings,
  } = useWallet();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; description: string } | null>(null);

  // Get current month stats
  const currentDate = new Date();
  const currentMonthStats = useMemo(() => {
    return monthlyStats.find(stats => 
      stats.year === currentDate.getFullYear() && 
      new Date(`${stats.month} 1, ${stats.year}`).getMonth() === currentDate.getMonth()
    ) || {
      totalLoads: 0,
      totalEarnings: 0,
      totalMiles: 0,
      avgPerMile: 0,
      totalFuelCost: 0,
      netProfit: 0,
      platformFees: 0,
    };
  }, [monthlyStats, currentDate]);

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

  const handleWithdraw = useCallback(async (amount: number, method: string) => {
    await withdraw(amount, method);
  }, [withdraw]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            ${balance.toLocaleString()}
          </Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.balanceItem}>
              <TrendingUp size={16} color={theme.colors.warning} />
              <Text style={styles.balanceItemLabel}>Pending</Text>
              <Text style={styles.balanceItemAmount}>
                ${pendingEarnings.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.balanceItem}>
              <DollarSign size={16} color={theme.colors.success} />
              <Text style={styles.balanceItemLabel}>Total Earned</Text>
              <Text style={styles.balanceItemAmount}>
                ${totalEarnings.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.balanceItem}>
              <Minus size={16} color={theme.colors.danger} />
              <Text style={styles.balanceItemLabel}>Withdrawn</Text>
              <Text style={styles.balanceItemAmount}>
                ${totalWithdrawn.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setWithdrawalModalVisible(true)}
              disabled={balance <= 0}
            >
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
          
          {transactions.slice(0, 10).map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                {transaction.type === 'earning' ? (
                  <ArrowDownRight size={20} color={theme.colors.success} />
                ) : transaction.type === 'withdrawal' ? (
                  <ArrowUpRight size={20} color={theme.colors.danger} />
                ) : (
                  <Minus size={20} color={theme.colors.warning} />
                )}
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionDate}>
                    {transaction.date.toLocaleDateString()}
                  </Text>
                  {transaction.type === 'earning' && transaction.feeAmount && (
                    <Text style={styles.feeText}>
                      Fee: ${transaction.feeAmount.toFixed(2)}
                    </Text>
                  )}
                  {transaction.status === 'pending' && (
                    <Text style={styles.pendingText}>Pending</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.amountContainer}>
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
                {transaction.type === 'earning' && transaction.netAmount && (
                  <Text style={styles.netAmount}>
                    Net: ${transaction.netAmount.toFixed(2)}
                  </Text>
                )}
              </View>
              
              {transaction.loadId && (
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
              <Text style={styles.statValue}>{currentMonthStats.totalLoads}</Text>
              <Text style={styles.statLabel}>Loads Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${currentMonthStats.totalEarnings > 1000 
                  ? `${(currentMonthStats.totalEarnings / 1000).toFixed(1)}k` 
                  : currentMonthStats.totalEarnings.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Gross Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{currentMonthStats.totalMiles.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Miles Driven</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${currentMonthStats.avgPerMile.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Avg Per Mile</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${currentMonthStats.netProfit > 1000 
                  ? `${(currentMonthStats.netProfit / 1000).toFixed(1)}k` 
                  : currentMonthStats.netProfit.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Net Profit</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${currentMonthStats.platformFees.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Platform Fees</Text>
            </View>
          </View>
        </View>
        
        {monthlyStats.length > 1 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Monthly History</Text>
            {monthlyStats.slice(1, 4).map((stats, index) => (
              <View key={`${stats.year}-${stats.month}`} style={styles.monthlyCard}>
                <View style={styles.monthlyHeader}>
                  <Text style={styles.monthlyTitle}>{stats.month} {stats.year}</Text>
                  <Text style={styles.monthlyEarnings}>${stats.netProfit.toLocaleString()}</Text>
                </View>
                <View style={styles.monthlyDetails}>
                  <Text style={styles.monthlyDetail}>{stats.totalLoads} loads • {stats.totalMiles.toLocaleString()} miles</Text>
                  <Text style={styles.monthlyDetail}>${stats.avgPerMile.toFixed(2)}/mile • ${stats.platformFees.toFixed(0)} fees</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <WithdrawalModal
        visible={withdrawalModalVisible}
        onClose={() => setWithdrawalModalVisible(false)}
        onWithdraw={handleWithdraw}
        availableBalance={balance}
      />
      
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  feeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
  },
  pendingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  netAmount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  monthlyCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  monthlyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  monthlyEarnings: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.success,
  },
  monthlyDetails: {
    gap: 4,
  },
  monthlyDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
});