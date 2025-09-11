import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Truck, DollarSign, Package, Eye, Edit, Trash2, BarChart3, Clock, Target, AlertTriangle, MapPin, Upload, Copy, ChevronDown, ChevronRight, RefreshCw, Undo2, Crown } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { getFirebase } from '@/utils/firebase';
import { doc, getDocFromServer, onSnapshot, collection, query, orderBy, limit, getDocs, setDoc, addDoc, serverTimestamp, where, writeBatch, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Clipboard from 'expo-clipboard';
import { TextInput, Switch } from 'react-native';



interface LoadRowProps {
  id: string;
  title: string;
  originCity: string;
  destinationCity: string;
  rate: number;
  status: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

interface UserInfo {
  lastLoginAt?: { seconds: number; nanoseconds: number } | null;
  authLastSignInTime?: string | null;
  authCreationTime?: string | null;
  isAnonymous?: boolean;
  device?: string;
  membership?: {
    plan?: 'free' | 'pro' | 'enterprise';
    status?: 'active' | 'inactive' | 'canceled';
    expiresAt?: Timestamp | null;
    provider?: string;
    lastTxnId?: string;
    startedAt?: Timestamp;
  };
}

interface LoginHistoryItem {
  createdAt: { seconds: number; nanoseconds: number };
  device?: string;
  provider?: string;
}

function LoginHistoryDropdown() {
  const { userId } = useAuth();
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    setFirebaseUser(auth.currentUser);
  }, []);

  useEffect(() => {
    async function fetchLoginHistory() {
      const uid = userId || firebaseUser?.uid;
      if (!uid || !expanded) return;

      setLoading(true);
      setError(null);
      
      try {
        const { db } = getFirebase();
        const loginsRef = collection(db, 'users', uid, 'logins');
        const q = query(loginsRef, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        
        const history: LoginHistoryItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.createdAt) {
            history.push(data as LoginHistoryItem);
          }
        });
        
        setLoginHistory(history);
      } catch (err) {
        console.warn('[LoginHistoryDropdown] Failed to fetch login history:', err);
        setError('Couldn\'t load login history.');
      } finally {
        setLoading(false);
      }
    }

    fetchLoginHistory();
  }, [userId, firebaseUser?.uid, expanded]);

  const formatLoginTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const uid = userId || firebaseUser?.uid;
  if (!uid) return null;

  return (
    <View style={styles.loginHistoryContainer}>
      <TouchableOpacity 
        style={styles.loginHistoryHeader}
        onPress={() => setExpanded(!expanded)}
        testID="login-history-toggle"
      >
        <Text style={styles.loginHistoryLabel}>Last 5 logins</Text>
        {expanded ? (
          <ChevronDown size={14} color={theme.colors.gray} />
        ) : (
          <ChevronRight size={14} color={theme.colors.gray} />
        )}
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.loginHistoryContent}>
          {loading ? (
            <Text style={styles.loginHistoryItem}>Loading...</Text>
          ) : error ? (
            <Text style={styles.loginHistoryError}>{error}</Text>
          ) : loginHistory.length === 0 ? (
            <Text style={styles.loginHistoryEmpty}>No login history yet.</Text>
          ) : (
            loginHistory.map((login, index) => (
              <Text key={`${login.createdAt.seconds}-${index}`} style={styles.loginHistoryItem}>
                {formatLoginTime(login.createdAt)} — {login.device || 'unknown'} — {login.provider || 'unknown'}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function MigrateLoadsOwnershipPanel() {
  const { userId } = useAuth();
  const [fromUIDs, setFromUIDs] = useState<string>('');
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<string>('');
  const [lastMigrationBatchId, setLastMigrationBatchId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const toUID = userId || getAuth().currentUser?.uid || '';

  const runMigration = async () => {
    if (!toUID) {
      showToast('No current user UID available');
      return;
    }

    const fromUIDsList = fromUIDs.split(',').map(uid => uid.trim()).filter(uid => uid.length > 0);
    if (fromUIDsList.length === 0) {
      showToast('Please enter at least one From UID');
      return;
    }

    setIsRunning(true);
    setResults('');
    
    try {
      const { db } = getFirebase();
      const migrationBatchId = `mig_${Date.now()}`;
      
      // Query loads where createdBy in fromUIDs and status != "deleted"
      const loadsRef = collection(db, 'loads');
      const q = query(
        loadsRef,
        where('createdBy', 'in', fromUIDsList.slice(0, 10)), // Firestore 'in' limit is 10
        where('status', '!=', 'deleted')
      );
      
      const snapshot = await getDocs(q);
      const totalLoads = snapshot.size;
      
      if (totalLoads > 5000) {
        setResults('❌ Too many results — add more specific From UIDs.');
        return;
      }
      
      if (dryRun) {
        setResults(`✅ Dry Run: Would update ${totalLoads} loads`);
        return;
      }
      
      // Real migration
      let updatedCount = 0;
      const batchSize = 300;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((docSnap) => {
          const data = docSnap.data();
          const docRef = doc(db, 'loads', docSnap.id);
          
          batch.update(docRef, {
            createdBy: toUID,
            migratedFrom: data.createdBy,
            migratedAt: serverTimestamp(),
            migrationBatchId: migrationBatchId
          });
        });
        
        await batch.commit();
        updatedCount += batchDocs.length;
        
        setResults(`Updated ${updatedCount} / ${totalLoads}`);
      }
      
      setLastMigrationBatchId(migrationBatchId);
      setResults(`✅ Migrated ${totalLoads} loads • Batch ${migrationBatchId}`);
      
    } catch (error: any) {
      console.warn('[MigrateLoads] Error:', error);
      setResults(`❌ Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const undoLastMigration = async () => {
    if (!lastMigrationBatchId) {
      showToast('No migration to undo');
      return;
    }

    setIsRunning(true);
    
    try {
      const { db } = getFirebase();
      
      // Query loads with the last migration batch ID
      const loadsRef = collection(db, 'loads');
      const q = query(loadsRef, where('migrationBatchId', '==', lastMigrationBatchId));
      
      const snapshot = await getDocs(q);
      // const totalLoads = snapshot.size;
      
      let revertedCount = 0;
      const batchSize = 300;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((docSnap) => {
          const data = docSnap.data();
          const docRef = doc(db, 'loads', docSnap.id);
          
          if (data.migratedFrom) {
            batch.update(docRef, {
              createdBy: data.migratedFrom,
              revertedAt: serverTimestamp(),
              revertedFromBatchId: lastMigrationBatchId
            });
          }
        });
        
        await batch.commit();
        revertedCount += batchDocs.length;
      }
      
      setResults(`↩️ Reverted ${revertedCount} loads`);
      setLastMigrationBatchId(null);
      
    } catch (error: any) {
      console.warn('[UndoMigration] Error:', error);
      setResults(`❌ Undo Error: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Hide panel when EXPO_PUBLIC_SHOW_DEV_TOOLS !== 'true'
  const showDevTools = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';
  if (!showDevTools) {
    return null;
  }

  return (
    <>
      <View style={styles.migrationPanel}>
        <Text style={styles.migrationTitle}>Migrate Loads Ownership</Text>
        
        <View style={styles.migrationField}>
          <Text style={styles.migrationLabel}>From UIDs (comma-separated):</Text>
          <TextInput
            style={styles.migrationInput}
            value={fromUIDs}
            onChangeText={setFromUIDs}
            placeholder="uid1, uid2, uid3..."
            multiline
            testID="from-uids-input"
          />
        </View>
        
        <View style={styles.migrationField}>
          <Text style={styles.migrationLabel}>To UID (current user):</Text>
          <Text style={styles.migrationReadonly}>{toUID || 'No user logged in'}</Text>
        </View>
        
        <View style={styles.migrationToggle}>
          <Text style={styles.migrationLabel}>Dry Run (no writes):</Text>
          <Switch
            value={dryRun}
            onValueChange={setDryRun}
            testID="dry-run-toggle"
          />
        </View>
        
        <View style={styles.migrationButtons}>
          <TouchableOpacity
            style={[styles.migrationButton, isRunning && styles.migrationButtonDisabled]}
            onPress={runMigration}
            disabled={isRunning}
            testID="run-migration-button"
          >
            {isRunning ? (
              <RefreshCw size={14} color={theme.colors.white} />
            ) : null}
            <Text style={styles.migrationButtonText}>
              {isRunning ? 'Running...' : 'Run Migration'}
            </Text>
          </TouchableOpacity>
          
          {lastMigrationBatchId && (
            <TouchableOpacity
              style={[styles.undoButton, isRunning && styles.migrationButtonDisabled]}
              onPress={undoLastMigration}
              disabled={isRunning}
              testID="undo-migration-button"
            >
              <Undo2 size={14} color={theme.colors.white} />
              <Text style={styles.undoButtonText}>Undo last migration</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {results ? (
          <View style={styles.migrationResults}>
            <Text style={styles.migrationResultsText}>{results}</Text>
          </View>
        ) : null}
      </View>
      
      {toastVisible && (
        <View style={styles.migrationToast}>
          <Text style={styles.migrationToastText}>{toastMessage}</Text>
        </View>
      )}
    </>
  );
}

function MembershipPill({ membership, onManage }: { membership?: UserInfo['membership']; onManage: () => void }) {
  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('[formatDate] Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const plan = (membership?.plan ?? 'free').toLowerCase();
  const status = (membership?.status ?? (plan === 'free' ? 'inactive' : 'inactive')).toLowerCase();
  const expiresAt = membership?.expiresAt ?? null;
  const provider = membership?.provider ?? null;

  const now = Date.now();
  const expiresMs = expiresAt?.toMillis?.() ?? null;
  const isActive = status === 'active' && !!expiresMs && expiresMs > now;
  const isExpiredPaid = (plan !== 'free') && !!expiresMs && expiresMs <= now;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  const subtext = isActive
    ? `Renews ${formatDate(expiresAt)}${provider ? ` • via ${provider}` : ''}`
    : isExpiredPaid
      ? `Expired ${formatDate(expiresAt)}${provider ? ` • via ${provider}` : ''}`
      : `Not active${provider ? ` • via ${provider}` : ''}`;

  // Determine pill variant
  const pillVariant = isActive ? 'active' : isExpiredPaid ? 'expired' : 'free';
  
  const pillStyle = pillVariant === 'active' 
    ? styles.membershipPillActive
    : pillVariant === 'expired'
      ? styles.membershipPillExpired
      : styles.membershipPillFree;

  const textStyle = pillVariant === 'active' 
    ? styles.membershipPillTextActive
    : pillVariant === 'expired'
      ? styles.membershipPillTextExpired
      : styles.membershipPillTextFree;

  // Icon and label based on variant
  const getIconAndLabel = () => {
    if (pillVariant === 'active') {
      return { icon: '✅', label: `${planLabel} • Active` };
    } else if (pillVariant === 'expired') {
      return { icon: '⏰', label: `${planLabel} • Expired` };
    } else {
      return { icon: null, label: 'Free' };
    }
  };

  const { icon, label } = getIconAndLabel();

  return (
    <View style={styles.membershipContainer}>
      <View style={[styles.membershipPill, pillStyle]}>
        {icon && <Text style={styles.membershipPillIcon}>{icon}</Text>}
        <Text style={[styles.membershipPillText, textStyle]}>
          {label}
        </Text>
      </View>
      
      <View style={styles.membershipSubtext}>
        <Text style={styles.membershipRenewal}>
          {subtext}
        </Text>
        <TouchableOpacity onPress={onManage} style={styles.manageLink}>
          <Text style={styles.manageLinkText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MembershipBanner({ membership }: { membership?: UserInfo['membership'] }) {
  const router = useRouter();
  const plan = membership?.plan || 'free';
  const status = membership?.status || 'inactive';
  const expiresAt = membership?.expiresAt;
  
  const isActive = status === 'active' && expiresAt && expiresAt.toMillis() > Date.now();
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  if (isActive || plan === 'free') {
    return null;
  }

  return (
    <View style={styles.membershipBanner}>
      <Text style={styles.membershipBannerText}>
        Your {planLabel} plan is not active. Tap Manage to renew.
      </Text>
      <TouchableOpacity 
        onPress={() => router.push('/shipper-membership')}
        style={styles.membershipBannerButton}
      >
        <Text style={styles.membershipBannerButtonText}>Manage</Text>
      </TouchableOpacity>
    </View>
  );
}

function MembershipDebugPanel({ membership, loading }: { membership?: UserInfo['membership']; loading: boolean }) {
  const showDevTools = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';
  
  if (!showDevTools) {
    return null;
  }

  const formatTimestamp = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'null';
    try {
      return timestamp.toDate().toISOString();
    } catch {
      return 'Invalid timestamp';
    }
  };

  // Compute UI state
  const plan = (membership?.plan ?? 'free').toLowerCase();
  const status = (membership?.status ?? (plan === 'free' ? 'inactive' : 'inactive')).toLowerCase();
  const expiresMs = membership?.expiresAt?.toMillis?.() ?? null;
  const isActive = status === 'active' && !!expiresMs && expiresMs > Date.now();
  const isExpiredPaid = (plan !== 'free') && !!expiresMs && expiresMs <= Date.now();
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugTitle}>Membership Debug (Dev Only)</Text>
      
      <View style={styles.debugSection}>
        <Text style={styles.debugSectionTitle}>Raw Firestore Values:</Text>
        <Text style={styles.debugText}>Loading: {loading ? 'true' : 'false'}</Text>
        <Text style={styles.debugText}>plan: {membership?.plan ?? 'undefined'}</Text>
        <Text style={styles.debugText}>status: {membership?.status ?? 'undefined'}</Text>
        <Text style={styles.debugText}>provider: {membership?.provider ?? 'undefined'}</Text>
        <Text style={styles.debugText}>lastTxnId: {membership?.lastTxnId ?? 'undefined'}</Text>
        <Text style={styles.debugText}>expiresAt: {formatTimestamp(membership?.expiresAt ?? null)}</Text>
        <Text style={styles.debugText}>startedAt: {formatTimestamp(membership?.startedAt ?? null)}</Text>
      </View>
      
      <View style={styles.debugSection}>
        <Text style={styles.debugSectionTitle}>Computed UI State:</Text>
        <Text style={styles.debugText}>plan (normalized): &ldquo;{plan}&rdquo;</Text>
        <Text style={styles.debugText}>status (normalized): &ldquo;{status}&rdquo;</Text>
        <Text style={styles.debugText}>planLabel: &ldquo;{planLabel}&rdquo;</Text>
        <Text style={styles.debugText}>expiresMs: {expiresMs ?? 'null'}</Text>
        <Text style={styles.debugText}>isActive: {isActive ? 'true' : 'false'}</Text>
        <Text style={styles.debugText}>isExpiredPaid: {isExpiredPaid ? 'true' : 'false'}</Text>
        <Text style={styles.debugText}>now: {Date.now()}</Text>
      </View>
    </View>
  );
}

function UpgradeButton() {
  const router = useRouter();
  const showPayments = process.env.EXPO_PUBLIC_ENABLE_PAYMENTS === 'true';
  
  if (!showPayments) {
    return null;
  }

  return (
    <TouchableOpacity 
      onPress={() => router.push('/upgrade')}
      style={styles.upgradeButton}
      testID="upgrade-button"
    >
      <Crown size={16} color={theme.colors.white} />
      <Text style={styles.upgradeButtonText}>Upgrade Membership</Text>
    </TouchableOpacity>
  );
}

function TestLoginWriteButton() {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleTestLoginWrite = async () => {
    try {
      const auth = getAuth();
      const u = auth.currentUser;
      
      if (!u) {
        showToast('No auth user.');
        return;
      }

      const { db } = getFirebase();
      const uid = u.uid;

      // Write to users/{uid}
      await setDoc(doc(db, 'users', uid), {
        lastLoginAt: serverTimestamp(),
        devPingAt: serverTimestamp(),
        email: u.email ?? null,
        isAnonymous: !!u.isAnonymous,
      }, { merge: true });

      // Write to users/{uid}/logins
      await addDoc(collection(db, 'users', uid, 'logins'), {
        createdAt: serverTimestamp(),
        device: Platform.OS,
        provider: u.providerData?.[0]?.providerId ?? (u.isAnonymous ? 'anonymous' : 'unknown'),
      });

      showToast('Login write: OK');
    } catch (err: any) {
      console.warn('[TestLoginWrite] Error:', err);
      const code = err?.code || 'unknown';
      showToast(`Login write FAILED: ${code}`);
    }
  };

  // Hide button when EXPO_PUBLIC_SHOW_DEV_TOOLS !== 'true'
  const showDevTools = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';
  if (!showDevTools) {
    return null;
  }

  return (
    <>
      <TouchableOpacity 
        onPress={handleTestLoginWrite}
        style={styles.testLoginButton}
        testID="test-login-write-button"
      >
        <Text style={styles.testLoginButtonText}>Test Login Write</Text>
      </TouchableOpacity>
      
      {toastVisible && (
        <View style={styles.testToast}>
          <Text style={styles.testToastText}>{toastMessage}</Text>
        </View>
      )}
    </>
  );
}

function UserInfoRow() {
  const { userId } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Get current Firebase user
    const auth = getAuth();
    setFirebaseUser(auth.currentUser);
  }, []);

  useEffect(() => {
    async function fetchUserInfo() {
      const uid = userId || firebaseUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const { db } = getFirebase();
        const userDocRef = doc(db, 'users', uid);
        
        // First fetch from server (fresh data)
        console.log('[UserInfoRow] Fetching fresh membership data from server...');
        const serverDoc = await getDocFromServer(userDocRef);
        
        if (serverDoc.exists()) {
          setUserInfo(serverDoc.data() as UserInfo);
          console.log('[UserInfoRow] Fresh membership data loaded:', serverDoc.data()?.membership);
        }
        
        // Then attach live listener for updates
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserInfo(doc.data() as UserInfo);
            console.log('[UserInfoRow] Live membership update:', doc.data()?.membership);
          }
        }, (error) => {
          console.warn('[UserInfoRow] Live listener error:', error);
        });
        
        return unsubscribe;
      } catch (error) {
        console.warn('[UserInfoRow] Failed to fetch user info:', error);
        // Fallback to default free membership
        setUserInfo({ membership: { plan: 'free', status: 'inactive' } });
      } finally {
        setLoading(false);
      }
    }

    const cleanup = fetchUserInfo();
    
    // Cleanup listener on unmount
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then((unsubscribe) => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        });
      }
    };
  }, [userId, firebaseUser?.uid]);

  const handleCopyUID = async () => {
    const uid = userId || firebaseUser?.uid;
    if (!uid) return;
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(uid);
      } else {
        await Clipboard.setStringAsync(uid);
      }
      
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2000);
    } catch (error) {
      console.warn('[UserInfoRow] Failed to copy UID:', error);
    }
  };

  const formatUID = (uid: string) => {
    if (uid.length <= 10) return uid;
    return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
  };

  const formatLastLogin = () => {
    if (userInfo?.lastLoginAt) {
      const date = new Date(userInfo.lastLoginAt.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    if (userInfo?.authLastSignInTime) {
      const date = new Date(userInfo.authLastSignInTime);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return 'Unknown';
  };

  const uid = userId || firebaseUser?.uid;
  if (!uid || loading) {
    return null;
  }

  const plan = userInfo?.membership?.plan ?? 'free';
  const status = userInfo?.membership?.status ?? 'inactive';
  const expiresAt = userInfo?.membership?.expiresAt ?? null;
  const now = Date.now();
  const expiresMs = expiresAt?.toMillis?.() ?? null;
  const isActive = status === 'active' && !!expiresMs && expiresMs > now;
  const isExpiredPaid = (plan !== 'free') && !!expiresMs && expiresMs <= now;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  const statusText = isActive ? 'Active' : isExpiredPaid ? 'Expired' : 'Inactive';

  return (
    <>
      <MembershipPill 
        membership={userInfo?.membership} 
        onManage={() => router.push('/shipper-membership')}
      />
      
      <MembershipBanner membership={userInfo?.membership} />
      
      <View style={styles.userInfoRow}>
        <Text style={styles.userInfoText}>
          Signed in: {formatUID(uid)} • Last login: {formatLastLogin()} • Plan: {planLabel} • Status: {statusText}
        </Text>
        <TouchableOpacity onPress={handleCopyUID} style={styles.copyButton} testID="copy-uid-button">
          <Copy size={12} color={theme.colors.gray} />
          <Text style={styles.copyButtonText}>Copy</Text>
        </TouchableOpacity>
      </View>
      
      <MembershipDebugPanel membership={userInfo?.membership} loading={loading} />
      
      {toastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>UID copied</Text>
        </View>
      )}
    </>
  );
}

function LoadRow({ id, title, originCity, destinationCity, rate, status, onView, onEdit, onDelete }: LoadRowProps) {
  const statusColor = status === 'OPEN' ? '#10b981' : status === 'in-transit' ? '#f59e0b' : '#6b7280';
  
  return (
    <View style={styles.loadRow} testID={`load-row-${id}`}>
      <View style={styles.loadInfo}>
        <Text style={styles.loadTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.loadRoute}>{originCity} → {destinationCity}</Text>
        <View style={styles.loadMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
          <Text style={styles.loadRate}>${rate}</Text>
        </View>
      </View>
      <View style={styles.loadActions}>
        <TouchableOpacity onPress={() => onView(id)} style={styles.actionBtn} testID={`view-${id}`}>
          <Eye size={16} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(id)} style={styles.actionBtn} testID={`edit-${id}`}>
          <Edit size={16} color={theme.colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(id)} style={styles.actionBtn} testID={`delete-${id}`}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ShipperDashboard() {
  const router = useRouter();
  const { loads } = useLoads();
  const { user, userId } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // Fetch membership data (server-fresh)
  useEffect(() => {
    async function fetchMembership() {
      const uid = userId || user?.id;
      if (!uid) {
        return;
      }

      try {
        const { db } = getFirebase();
        const userDocRef = doc(db, 'users', uid);
        
        // First fetch from server (fresh data)
        console.log('[ShipperDashboard] Fetching fresh membership data from server...');
        const serverDoc = await getDocFromServer(userDocRef);
        
        if (serverDoc.exists()) {
          setUserInfo(serverDoc.data() as UserInfo);
          console.log('[ShipperDashboard] Fresh membership data loaded:', serverDoc.data()?.membership);
        }
        
        // Then attach live listener for updates
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserInfo(doc.data() as UserInfo);
            console.log('[ShipperDashboard] Live membership update:', doc.data()?.membership);
          }
        }, (error) => {
          console.warn('[ShipperDashboard] Live listener error:', error);
        });
        
        return unsubscribe;
      } catch (error) {
        console.warn('[ShipperDashboard] Failed to fetch membership:', error);
        // Fallback to default free membership
        setUserInfo({ membership: { plan: 'free', status: 'inactive' } });
      }
    }

    const cleanup = fetchMembership();
    
    // Cleanup listener on unmount
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then((unsubscribe) => {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        });
      }
    };
  }, [userId, user?.id]);
  
  const shipperLoads = useMemo(() => {
    const uid = userId || user?.id || null;
    console.log('[ShipperDashboard] filter by uid:', uid, 'total loads:', loads.length);
    if (!uid) return [];
    
    // Filter loads by shipper ID or createdBy field
    const filtered = loads.filter(load => {
      const isOwner = load.shipperId === uid || 
                     (load as any).createdBy === uid ||
                     (load as any).userId === uid;
      if (isOwner) {
        console.log('[ShipperDashboard] Found owned load:', load.id, load.description || 'Untitled');
      }
      return isOwner;
    });
    
    console.log('[ShipperDashboard] Found', filtered.length, 'loads for user', uid);
    return filtered;
  }, [loads, user?.id, userId]);
  
  const stats = useMemo(() => {
    const totalLoads = shipperLoads.length;
    const activeLoads = shipperLoads.filter(l => l.status === 'available' || l.status === 'in-transit').length;
    const completedLoads = shipperLoads.filter(l => l.status === 'delivered').length;
    const totalRevenue = shipperLoads.reduce((sum, l) => sum + (l.rate || 0), 0);
    const avgRate = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    const completionRate = totalLoads > 0 ? (completedLoads / totalLoads) * 100 : 0;
    
    // Calculate trends (mock data for now - in real app would compare to previous period)
    const revenueGrowth = 12.5; // Mock 12.5% growth
    const loadGrowth = 8.3; // Mock 8.3% growth
    
    return { 
      totalLoads, 
      activeLoads, 
      completedLoads,
      totalRevenue, 
      avgRate, 
      completionRate,
      revenueGrowth,
      loadGrowth
    };
  }, [shipperLoads]);
  
  const analytics = useMemo(() => {
    // Performance metrics
    const avgTimeToBook = 2.3; // Mock average days to book
    const topRoutes = shipperLoads.reduce((acc, load) => {
      const route = `${load.origin?.city || 'Unknown'} → ${load.destination?.city || 'Unknown'}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedRoutes = Object.entries(topRoutes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    // Calculate real issues
    const issues = [
      // Loads with very low rates (below $1000)
      ...shipperLoads.filter(load => (load.rate || 0) < 1000).map(load => `Low rate: ${load.description || 'Untitled'} (${load.rate})`),
      // Loads that have been available for too long (mock: more than 7 days old)
      // Note: Using pickupDate as proxy for creation date since createdAt is not available
      ...shipperLoads.filter(load => {
        if (load.status !== 'available') return false;
        const pickupDate = load.pickupDate ? new Date(load.pickupDate) : new Date();
        const daysDiff = (Date.now() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 7;
      }).map(load => `Stale load: ${load.description || 'Untitled'} (${Math.floor((Date.now() - (load.pickupDate ? new Date(load.pickupDate).getTime() : Date.now())) / (1000 * 60 * 60 * 24))} days old)`),
      // Loads missing critical information
      ...shipperLoads.filter(load => 
        !load.origin?.city || !load.destination?.city || !load.rate || !load.description
      ).map(load => `Incomplete info: ${load.description || load.id}`)
    ];
    
    // Revenue by month (mock data)
    const monthlyRevenue = [
      { month: 'Jan', revenue: 45000 },
      { month: 'Feb', revenue: 52000 },
      { month: 'Mar', revenue: 48000 },
      { month: 'Apr', revenue: 61000 },
      { month: 'May', revenue: 58000 },
      { month: 'Jun', revenue: 67000 },
    ];
    
    return {
      avgTimeToBook,
      topRoutes: sortedRoutes,
      monthlyRevenue,
      issues
    };
  }, [shipperLoads]);
  
  const handleViewLoad = useCallback((loadId: string) => {
    console.log('Viewing load:', loadId);
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);
  
  const handleEditLoad = useCallback((loadId: string) => {
    console.log('Editing load:', loadId);
    // Navigate to edit load page
  }, []);
  
  const handleDeleteLoad = useCallback((loadId: string) => {
    console.log('Deleting load:', loadId);
    // Implement delete functionality
  }, []);
  
  const handlePostNewLoad = useCallback(() => {
    router.push('/post-load');
  }, [router]);
  
  // Compute membership status for gating features
  const plan = (userInfo?.membership?.plan ?? 'free').toLowerCase();
  const status = (userInfo?.membership?.status ?? 'inactive').toLowerCase();
  const expiresAt = userInfo?.membership?.expiresAt ?? null;
  const now = Date.now();
  const expiresMs = expiresAt?.toMillis?.() ?? null;
  const isActiveMembership = status === 'active' && !!expiresMs && expiresMs > now;
  
  const handleBulkUpload = useCallback(() => {
    // Check membership before allowing bulk upload
    if (!isActiveMembership || plan === 'free') {
      // Show tooltip or navigate to membership page
      router.push('/shipper-membership');
      return;
    }
    
    router.push('/csv-bulk-upload');
  }, [router, isActiveMembership, plan]);



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Shipper Dashboard</Text>
          <Text style={styles.subtitle}>Manage your loads and track performance</Text>
          
          {/* Membership pill - will be replaced by UserInfoRow component */}
          
          <UserInfoRow />
          <TestLoginWriteButton />
          <LoginHistoryDropdown />
          <MigrateLoadsOwnershipPanel />
          <UpgradeButton />
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Package size={20} color={theme.colors.primary} />
              <View style={[styles.trendBadge, { backgroundColor: stats.loadGrowth > 0 ? '#dcfce7' : '#fef2f2' }]}>
                <Text style={[styles.trendText, { color: stats.loadGrowth > 0 ? '#16a34a' : '#dc2626' }]}>+{stats.loadGrowth}%</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{stats.totalLoads}</Text>
            <Text style={styles.statLabel}>Total Loads</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Truck size={20} color="#10b981" />
              <View style={styles.statusIndicator}>
                <Text style={styles.statusIndicatorText}>{stats.activeLoads} active</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{stats.completedLoads}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <DollarSign size={20} color="#f59e0b" />
              <View style={[styles.trendBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.trendText, { color: '#16a34a' }]}>+{stats.revenueGrowth}%</Text>
              </View>
            </View>
            <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Target size={20} color="#8b5cf6" />
              <Text style={styles.completionRate}>{Math.round(stats.completionRate)}%</Text>
            </View>
            <Text style={styles.statValue}>${Math.round(stats.avgRate)}</Text>
            <Text style={styles.statLabel}>Avg Rate</Text>
          </View>
        </View>
        
        {/* Analytics Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          
          {/* Key Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Clock size={18} color={theme.colors.primary} />
              <Text style={styles.metricValue}>{analytics.avgTimeToBook} days</Text>
              <Text style={styles.metricLabel}>Avg Time to Book</Text>
            </View>
            <View style={styles.metricCard}>
              <BarChart3 size={18} color="#10b981" />
              <Text style={styles.metricValue}>{Math.round(stats.completionRate)}%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
            <TouchableOpacity 
              style={[styles.metricCard, analytics.issues.length > 0 && { borderColor: '#f59e0b', borderWidth: 1 }]}
              onPress={() => {
                if (analytics.issues.length > 0) {
                  console.log('Issues detected:', analytics.issues);
                  // Could navigate to issues detail page or show modal
                }
              }}
            >
              <AlertTriangle size={18} color={analytics.issues.length > 0 ? '#f59e0b' : '#6b7280'} />
              <Text style={[styles.metricValue, analytics.issues.length > 0 && { color: '#f59e0b' }]}>{analytics.issues.length}</Text>
              <Text style={styles.metricLabel}>Issues</Text>
            </TouchableOpacity>
          </View>
          
          {/* Revenue Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <Text style={styles.chartSubtitle}>Last 6 months</Text>
            </View>
            <View style={styles.chart}>
              {analytics.monthlyRevenue.map((item, index) => {
                const maxRevenue = Math.max(...analytics.monthlyRevenue.map(r => r.revenue));
                const height = (item.revenue / maxRevenue) * 80;
                return (
                  <View key={item.month} style={styles.chartBar}>
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <Text style={styles.barValue}>${(item.revenue / 1000).toFixed(0)}k</Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Top Routes */}
          <View style={styles.routesCard}>
            <View style={styles.routesHeader}>
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={styles.routesTitle}>Top Routes</Text>
            </View>
            {analytics.topRoutes.length > 0 ? (
              analytics.topRoutes.map(([route, count], index) => (
                <View key={route} style={styles.routeItem}>
                  <View style={styles.routeRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName} numberOfLines={1}>{route}</Text>
                    <Text style={styles.routeCount}>{count} loads</Text>
                  </View>
                  <View style={styles.routeBar}>
                    <View style={[styles.routeProgress, { width: `${(count / analytics.topRoutes[0][1]) * 100}%` }]} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noRoutesText}>No routes data available</Text>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Your Loads</Text>
              {(() => {
                if (isActiveMembership && plan === 'pro') {
                  return <Text style={styles.loadsBadge}>Pro: 50 loads/mo</Text>;
                }
                return <Text style={styles.loadsBadge}>Free: 3 loads/mo</Text>;
              })()} 
            </View>
            <View style={styles.actionButtons}>
              {(() => {
                const canUseBulkUpload = isActiveMembership && plan !== 'free';
                
                return (
                  <View style={styles.bulkUploadContainer}>
                    <TouchableOpacity 
                      onPress={handleBulkUpload} 
                      style={[styles.bulkBtn, !canUseBulkUpload && styles.bulkBtnDisabled]}
                      disabled={!canUseBulkUpload}
                    >
                      <Upload size={16} color={theme.colors.white} />
                      <Text style={styles.bulkBtnText}>Bulk Upload</Text>
                    </TouchableOpacity>
                    {!canUseBulkUpload && (
                      <Text style={styles.bulkUploadNote}>Bulk Upload is available on Pro or Enterprise</Text>
                    )}
                  </View>
                );
              })()} 
              <TouchableOpacity onPress={handlePostNewLoad} style={styles.postBtn}>
                <Text style={styles.postBtnText}>Post New Load</Text>
              </TouchableOpacity>
            </View>
            
            {/* Debug button - remove in production */}
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => router.push('/debug-bulk-upload')}
            >
              <Text style={styles.debugButtonText}>🔧 Debug Bulk Upload</Text>
            </TouchableOpacity>
          </View>
          
          {shipperLoads.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={theme.colors.gray} />
              <Text style={styles.emptyTitle}>No loads posted yet</Text>
              <Text style={styles.emptySubtitle}>Use the &ldquo;Post New Load&rdquo; button above to get started</Text>
            </View>
          ) : (
            <View style={styles.loadsList}>
              {shipperLoads.map((load) => (
                <LoadRow
                  key={load.id}
                  id={load.id}
                  title={load.description || 'Untitled Load'}
                  originCity={load.origin?.city || 'Unknown'}
                  destinationCity={load.destination?.city || 'Unknown'}
                  rate={load.rate || 0}
                  status={load.status}
                  onView={handleViewLoad}
                  onEdit={handleEditLoad}
                  onDelete={handleDeleteLoad}
                />
              ))}
            </View>
          )}
        </View>
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
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  bulkBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bulkBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  postBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  postBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  loadsList: {
    gap: theme.spacing.sm,
  },
  loadRow: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  loadInfo: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  loadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadRoute: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  loadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadRate: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionBtn: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusIndicator: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusIndicatorText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  completionRate: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '700',
  },
  analyticsSection: {
    marginBottom: theme.spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metricValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: 4,
  },
  metricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartHeader: {
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  chartSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: theme.spacing.sm,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    backgroundColor: theme.colors.primary,
    width: '80%',
    borderRadius: 2,
    marginBottom: theme.spacing.xs,
  },
  barLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  barValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    fontWeight: '600',
  },
  routesCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  routesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  routesTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  routeRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  rankText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  routeInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  routeName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  routeCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  routeBar: {
    width: 60,
    height: 4,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 2,
  },
  routeProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  noRoutesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  debugButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  userInfoText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: theme.colors.lightGray,
    gap: 2,
  },
  copyButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    top: 100,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    zIndex: 1000,
  },
  toastText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  loginHistoryContainer: {
    marginTop: theme.spacing.xs,
  },
  loginHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  loginHistoryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  loginHistoryContent: {
    paddingLeft: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  loginHistoryItem: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    paddingVertical: 2,
  },
  loginHistoryEmpty: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  loginHistoryError: {
    fontSize: theme.fontSize.xs,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  testLoginButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  testLoginButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  testToast: {
    position: 'absolute',
    top: 120,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    zIndex: 1001,
    maxWidth: '80%',
  },
  testToastText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  migrationPanel: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  migrationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  migrationField: {
    marginBottom: theme.spacing.sm,
  },
  migrationLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  migrationInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  migrationReadonly: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  migrationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  migrationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  migrationButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  migrationButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  migrationButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  undoButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  migrationResults: {
    backgroundColor: '#f9fafb',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 40,
  },
  migrationResultsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontFamily: 'monospace',
  },
  migrationToast: {
    position: 'absolute',
    top: 140,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    zIndex: 1002,
    maxWidth: '80%',
  },
  migrationToastText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  membershipContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  membershipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  membershipPillActive: {
    backgroundColor: '#059669', // emerald-600
  },
  membershipPillFree: {
    backgroundColor: '#f3f4f6', // gray-100
  },
  membershipPillExpired: {
    backgroundColor: '#fef3c7', // amber-100
  },
  membershipPillIcon: {
    fontSize: 12,
  },
  membershipPillText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  membershipPillTextActive: {
    color: theme.colors.white,
  },
  membershipPillTextFree: {
    color: '#6b7280',
  },
  membershipPillTextExpired: {
    color: '#92400e', // amber-800
  },
  membershipSubtext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membershipRenewal: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  manageLink: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  manageLinkText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  membershipBanner: {
    backgroundColor: '#fef3c7',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  membershipBannerText: {
    fontSize: theme.fontSize.sm,
    color: '#92400e',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  membershipBannerButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  membershipBannerButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadsBadge: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  bulkUploadContainer: {
    alignItems: 'center',
  },
  bulkBtnDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  bulkUploadNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 120,
  },
  pillGreen: {
    backgroundColor: '#10b981',
    color: theme.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  pillGray: {
    backgroundColor: '#6b7280',
    color: theme.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    overflow: 'hidden',
  },
  debugPanel: {
    backgroundColor: '#fef3c7',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  debugTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: theme.spacing.xs,
  },
  debugSection: {
    marginBottom: theme.spacing.xs,
  },
  debugSectionTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  debugText: {
    fontSize: theme.fontSize.xs,
    color: '#92400e',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});