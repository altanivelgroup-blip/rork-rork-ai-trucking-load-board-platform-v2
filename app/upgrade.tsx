import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Crown, ExternalLink, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

interface MembershipData {
  plan: string;
  status: string;
  provider: string;
  expiresAt: Date;
  lastTxnId: string;
}

interface PaymentData {
  uid: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: any;
}

export default function UpgradeScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [returnUrl, setReturnUrl] = useState<string>('');
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  const paypalCheckoutUrl = process.env.EXPO_PUBLIC_PAYPAL_CHECKOUT_URL;
  const showPayments = process.env.EXPO_PUBLIC_ENABLE_PAYMENTS === 'true';

  useEffect(() => {
    const auth = getAuth();
    setFirebaseUser(auth.currentUser);
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('[Upgrade] Received deep link:', url);
    
    // Check if it's a payment success URL
    if (url.includes('myapp://pay/success')) {
      const urlObj = new URL(url);
      const tx = urlObj.searchParams.get('tx');
      const amount = urlObj.searchParams.get('amount');
      const currency = urlObj.searchParams.get('currency');
      
      if (tx) {
        handlePaymentSuccess(tx, parseFloat(amount || '9.99'), currency || 'USD');
      } else {
        showMessage('Payment not confirmed.', 'error');
      }
    }
  };

  useEffect(() => {
    // Handle deep link when component mounts
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          handleDeepLink(url);
        }
      } catch (error) {
        console.warn('[Upgrade] Failed to get initial URL:', error);
      }
    };

    // Handle deep link while app is running
    const handleURL = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    handleInitialURL();
    const subscription = Linking.addEventListener('url', handleURL);

    return () => {
      subscription?.remove();
    };
  }, []);



  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handlePayPalCheckout = async () => {
    if (!paypalCheckoutUrl) {
      showMessage('PayPal checkout URL not configured', 'error');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(paypalCheckoutUrl);
      if (supported) {
        await Linking.openURL(paypalCheckoutUrl);
      } else {
        showMessage('Cannot open PayPal checkout', 'error');
      }
    } catch (error) {
      console.warn('[Upgrade] Failed to open PayPal:', error);
      showMessage('Failed to open PayPal checkout', 'error');
    }
  };

  const handleAlreadyPaid = () => {
    if (Platform.OS === 'web' && returnUrl.trim()) {
      // On web, parse the manually entered URL
      handleDeepLink(returnUrl.trim());
    } else {
      // On mobile, this would be called when returning from PayPal
      showMessage('Please complete payment through PayPal first', 'info');
    }
  };

  const handlePaymentSuccess = async (txId: string, amount: number, currency: string) => {
    const uid = userId || firebaseUser?.uid;
    
    if (!uid) {
      showMessage('Sign in required.', 'error');
      return;
    }

    if (!txId?.trim()) {
      showMessage('Payment not confirmed.', 'error');
      return;
    }

    setLoading(true);
    
    try {
      if (dryRun) {
        showMessage('Simulation complete - membership would be activated', 'success');
        setLoading(false);
        return;
      }

      const { db } = getFirebase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

      // Update user membership
      const membershipData: Partial<MembershipData> = {
        plan: 'basic',
        status: 'active',
        provider: 'paypal',
        expiresAt,
        lastTxnId: txId
      };

      await setDoc(doc(db, 'users', uid), {
        membership: membershipData
      }, { merge: true });

      // Create payment record
      const paymentData: PaymentData = {
        uid,
        amount,
        currency,
        provider: 'paypal',
        status: 'captured',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'payments', txId), paymentData);

      const expiryDate = expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      showMessage(`✅ Membership active until ${expiryDate}`, 'success');
      
    } catch (error: any) {
      console.warn('[Upgrade] Payment processing error:', error);
      showMessage(`Failed to activate membership: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/shipper-dashboard');
  };

  if (!showPayments) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ title: 'Upgrade Membership' }} />
        <View style={styles.disabledContainer}>
          <Crown size={64} color={theme.colors.gray} />
          <Text style={styles.disabledTitle}>Payments Not Available</Text>
          <Text style={styles.disabledText}>
            Payment functionality is currently disabled. Please contact support for assistance.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={16} color={theme.colors.white} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Upgrade Membership' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Crown size={48} color={theme.colors.primary} />
          <Text style={styles.title}>Upgrade Membership</Text>
          <Text style={styles.subtitle}>Pay once to unlock 30 days of access.</Text>
        </View>

        {/* Dry Run Toggle */}
        <View style={styles.dryRunContainer}>
          <View style={styles.dryRunToggle}>
            <Text style={styles.dryRunLabel}>Dry Run (no writes)</Text>
            <Switch
              value={dryRun}
              onValueChange={setDryRun}
              testID="dry-run-toggle"
            />
          </View>
          {dryRun && (
            <Text style={styles.dryRunNote}>
              Dry run mode is ON. No actual charges or database writes will occur.
            </Text>
          )}
        </View>

        {/* PayPal Button */}
        <TouchableOpacity
          onPress={handlePayPalCheckout}
          style={[styles.paypalButton, loading && styles.buttonDisabled]}
          disabled={loading}
          testID="paypal-checkout-button"
        >
          <ExternalLink size={20} color={theme.colors.white} />
          <Text style={styles.paypalButtonText}>PayPal (Sandbox) – One-time Test</Text>
        </TouchableOpacity>

        {/* Already Paid Section */}
        <View style={styles.alreadyPaidSection}>
          <Text style={styles.alreadyPaidTitle}>Already completed payment?</Text>
          
          {Platform.OS === 'web' && (
            <View style={styles.urlInputContainer}>
              <Text style={styles.urlInputLabel}>Paste return URL for testing:</Text>
              <TextInput
                style={styles.urlInput}
                value={returnUrl}
                onChangeText={setReturnUrl}
                placeholder="myapp://pay/success?tx=...&amount=9.99&currency=USD"
                multiline
                testID="return-url-input"
              />
            </View>
          )}
          
          <TouchableOpacity
            onPress={handleAlreadyPaid}
            style={[styles.alreadyPaidButton, loading && styles.buttonDisabled]}
            disabled={loading}
            testID="already-paid-button"
          >
            <Text style={styles.alreadyPaidButtonText}>I already paid</Text>
          </TouchableOpacity>
        </View>

        {/* Message Display */}
        {message ? (
          <View style={[
            styles.messageContainer, 
            messageType === 'success' ? styles.messageSuccess : 
            messageType === 'error' ? styles.messageError : styles.messageInfo
          ]}>
            {messageType === 'success' && <CheckCircle size={20} color="#16a34a" />}
            {messageType === 'error' && <AlertCircle size={20} color="#dc2626" />}
            {messageType === 'info' && <AlertCircle size={20} color="#2563eb" />}
            <Text style={[
              styles.messageText, 
              messageType === 'success' ? styles.messageTextSuccess : 
              messageType === 'error' ? styles.messageTextError : styles.messageTextInfo
            ]}>
              {message}
            </Text>
          </View>
        ) : null}

        {/* Success Actions */}
        {message && messageType === 'success' && (
          <TouchableOpacity
            onPress={handleGoToDashboard}
            style={styles.dashboardButton}
            testID="go-to-dashboard-button"
          >
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What you get:</Text>
          <Text style={styles.infoItem}>• 30 days of premium access</Text>
          <Text style={styles.infoItem}>• Advanced load matching</Text>
          <Text style={styles.infoItem}>• Priority customer support</Text>
          <Text style={styles.infoItem}>• Enhanced analytics dashboard</Text>
          <Text style={styles.infoItem}>• Bulk load management tools</Text>
        </View>

        <Text style={styles.footerNote}>
          This is a sandbox environment for testing. No real charges will be made.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  dryRunContainer: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dryRunToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dryRunLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  dryRunNote: {
    fontSize: theme.fontSize.sm,
    color: '#f59e0b',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  paypalButton: {
    backgroundColor: '#0070ba',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  paypalButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  alreadyPaidSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  alreadyPaidTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  urlInputContainer: {
    marginBottom: theme.spacing.md,
  },
  urlInputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  alreadyPaidButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  alreadyPaidButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  messageSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1,
  },
  messageError: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  messageInfo: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  messageTextSuccess: {
    color: '#16a34a',
  },
  messageTextError: {
    color: '#dc2626',
  },
  messageTextInfo: {
    color: '#2563eb',
  },
  dashboardButton: {
    backgroundColor: '#16a34a',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dashboardButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  infoItem: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  footerNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  disabledTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xl,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});