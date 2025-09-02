import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { theme } from '@/constants/theme';
import { Activity, CheckCircle, Database, RefreshCcw, TrendingUp, Plus, ExternalLink, Play, Crown, Check, Zap, Shield, UserRound, Smartphone } from 'lucide-react-native';

type TabKey = 'overview' | 'sources' | 'jobs' | 'membership';

type StatCard = {
  id: string;
  label: string;
  value: string;
  icon: 'database' | 'activity' | 'trending' | 'success';
};

type JobStatus = 'RUNNING' | 'COMPLETED' | 'STOPPED';

type JobItem = {
  id: string;
  name: string;
  processed: number;
  total: number;
  status: JobStatus;
  createdAt: string;
};

type SourceStatus = 'Active' | 'Inactive';

type SourceItem = {
  id: string;
  name: string;
  url: string;
  totalLoads: number;
  successRate: number;
  avgResponseMs: number;
  status: SourceStatus;
  lastScrapedAt: string;
};

const fontWeight700 = '700' as const;
const fontWeight600 = '600' as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function IconSwitch({ name, color, size }: { name: StatCard['icon']; color: string; size: number }) {
  if (name === 'database') return <Database color={color} size={size} />;
  if (name === 'activity') return <Activity color={color} size={size} />;
  if (name === 'trending') return <TrendingUp color={color} size={size} />;
  return <CheckCircle color={color} size={size} />;
}

const ProgressBar = React.memo(function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <View style={styles.progressTrack} testID="progressTrack">
      <View style={[styles.progressBar, { width: `${pct}%` }]} testID="progressBar" />
    </View>
  );
});

function formatNow(): string {
  try {
    const d = new Date();
    const hours = d.getHours();
    const h12 = hours % 12 || 12;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    return `${h12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${suffix}`;
  } catch (e) {
    console.log('[Admin] formatNow error', e);
    return '—';
  }
}

function formatDateTime(d?: Date): string {
  try {
    const dd = d ?? new Date();
    return dd.toLocaleString();
  } catch (e) {
    console.log('[Admin] formatDateTime error', e);
    return '—';
  }
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('jobs');
  const [jobs, setJobs] = useState<JobItem[]>([
    { id: 'dat', name: 'DAT Load Board', processed: 32, total: 45, status: 'RUNNING', createdAt: formatDateTime() },
    { id: 'ts', name: 'Truckstop.com', processed: 78, total: 78, status: 'COMPLETED', createdAt: formatDateTime() },
  ]);

  const [sources, setSources] = useState<SourceItem[]>([
    { id: 'dat', name: 'DAT Load Board', url: 'https://www.dat.com/load-board', totalLoads: 2450, successRate: 95.2, avgResponseMs: 1200, status: 'Active', lastScrapedAt: '7:27:18 PM' },
    { id: 'truckstop', name: 'Truckstop.com', url: 'https://www.truckstop.com', totalLoads: 1890, successRate: 92.8, avgResponseMs: 1500, status: 'Active', lastScrapedAt: '7:29:18 PM' },
    { id: 'freightwaves', name: 'FreightWaves', url: 'https://www.freightwaves.com', totalLoads: 567, successRate: 78.5, avgResponseMs: 2200, status: 'Inactive', lastScrapedAt: '6:32:18 PM' },
  ]);

  const stats: StatCard[] = useMemo(() => [
    { id: 'sources', label: 'Total Sources', value: '12', icon: 'database' },
    { id: 'active', label: 'Active Sources', value: '8', icon: 'activity' },
    { id: 'today', label: 'Loads Today', value: '342', icon: 'trending' },
    { id: 'success', label: 'Success Rate', value: '92%', icon: 'success' },
  ], []);

  const onRefresh = useCallback(() => {
    console.log('[Admin] refresh tapped');
    setJobs((prev) => prev.map((j) => (j.status === 'RUNNING' ? { ...j, processed: Math.min(j.total, j.processed + 3) } : j)));
  }, []);

  const onStopJob = useCallback((id: string) => {
    console.log('[Admin] stop job', id);
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'STOPPED' } : j)));
  }, []);

  const renderBadge = useCallback((status: JobStatus) => {
    const label = status;
    const bg = status === 'COMPLETED' ? hexToRgba(theme.colors.success, 0.12) : status === 'RUNNING' ? hexToRgba(theme.colors.warning, 0.12) : hexToRgba(theme.colors.gray, 0.12);
    const color = status === 'COMPLETED' ? theme.colors.success : status === 'RUNNING' ? theme.colors.warning : theme.colors.gray;
    return (
      <View style={[styles.badge, { backgroundColor: bg }]} testID={`badge-${status}`}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  }, []);

  const renderSourceStatus = useCallback((status: SourceStatus) => {
    const isActive = status === 'Active';
    const bg = isActive ? hexToRgba(theme.colors.success, 0.12) : hexToRgba(theme.colors.gray, 0.12);
    const color = isActive ? theme.colors.success : theme.colors.gray;
    return (
      <View style={[styles.badge, { backgroundColor: bg }]} testID={`source-status-${status}`}>
        <Text style={[styles.badgeText, { color }]}>{status}</Text>
      </View>
    );
  }, []);

  const openScraper = useCallback(async (url: string) => {
    try {
      console.log('[Admin] open scraper', url);
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (e) {
      console.log('[Admin] open scraper error', e);
    }
  }, []);

  const scrapeNow = useCallback((id: string) => {
    console.log('[Admin] scrape now', id);
    setSources((prev) => prev.map((s) => s.id === id ? {
      ...s,
      totalLoads: s.totalLoads + Math.floor(10 + Math.random() * 40),
      successRate: Math.min(100, Math.max(50, Math.round((s.successRate + (Math.random() * 2 - 1)) * 10) / 10)),
      avgResponseMs: Math.max(400, Math.round(s.avgResponseMs + (Math.random() * 300 - 150))),
      lastScrapedAt: formatNow(),
    } : s));
  }, []);

  const toggleActive = useCallback((id: string) => {
    console.log('[Admin] toggle active', id);
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
  }, []);

  const addSource = useCallback(() => {
    console.log('[Admin] add source');
    const n: SourceItem = {
      id: `src_${Date.now()}`,
      name: 'New Source',
      url: 'https://example.com',
      totalLoads: 0,
      successRate: 0,
      avgResponseMs: 0,
      status: 'Inactive',
      lastScrapedAt: formatNow(),
    };
    setSources((prev) => [n, ...prev]);
  }, []);

  const SourcesTab = (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Load Board Sources</Text>
        <TouchableOpacity onPress={addSource} style={styles.addBtn} accessibilityRole="button" testID="add-source">
          <Plus color={theme.colors.white} size={18} />
        </TouchableOpacity>
      </View>

      {sources.map((src) => (
        <View key={src.id} style={styles.sourceCard} testID={`source-${src.id}`}>
          <View style={styles.sourceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceName}>{src.name}</Text>
              <TouchableOpacity onPress={() => openScraper(src.url)} accessibilityRole="link" testID={`source-url-${src.id}`}>
                <Text style={styles.sourceUrl}>{src.url}</Text>
              </TouchableOpacity>
            </View>
            {renderSourceStatus(src.status)}
          </View>

          <View style={styles.sourceMetricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{src.totalLoads}</Text>
              <Text style={styles.metricLabel}>Total Loads</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{`${src.successRate}%`}</Text>
              <Text style={styles.metricLabel}>Success Rate</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{`${src.avgResponseMs}ms`}</Text>
              <Text style={styles.metricLabel}>Avg Response</Text>
            </View>
          </View>

          <View style={styles.sourceFooter}>
            <Text style={styles.lastScraped}>Last scraped: {src.lastScrapedAt}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => openScraper(src.url)} style={styles.secondaryBtn} accessibilityRole="button" testID={`open-${src.id}`}>
                <ExternalLink color={theme.colors.dark} size={16} />
                <Text style={styles.secondaryBtnText}>Open Scraper</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => scrapeNow(src.id)} style={styles.primaryBtn} accessibilityRole="button" testID={`scrape-${src.id}`}>
                <Play color={theme.colors.white} size={16} />
                <Text style={styles.primaryBtnText}>Scrape Now</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleActive(src.id)} style={styles.toggleBtn} accessibilityRole="button" testID={`toggle-${src.id}`}>
                <Text style={styles.toggleBtnText}>{src.status === 'Active' ? 'Deactivate' : 'Activate'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </>
  );

  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro' | 'business'>('pro');

  const membershipTiers = useMemo(() => ([
    {
      id: 'basic' as const,
      title: 'Basic',
      subtitle: 'Perfect for getting started',
      price: '$5',
      period: '/month',
      popular: false,
      accent: '#E5E7EB',
      iconBg: '#EEF2FF',
      features: [
        '1 vehicle post per month (Private)',
        '3 vehicle posts per month (Business)',
        'Limited to local listings (250 miles)',
        'Basic AI prompt access',
        'Email notifications only',
        '7-day post expiration',
      ],
    },
    {
      id: 'pro' as const,
      title: 'Pro',
      subtitle: 'For business owners, dealerships & auctions',
      price: '$49',
      period: '/month',
      popular: true,
      accent: theme.colors.warning,
      iconBg: '#FFFBEB',
      features: [
        'Up to 50 vehicle posts per month',
        'National exposure with map tracking',
        'AI-enhanced listing assistant',
        'Dealer dashboard with analytics',
        'API access (read-only)',
        'Premium post badge & branding',
        'CRM export capabilities',
        'SMS/email/app notifications',
        'AI cost forecasting',
        'Priority customer support',
      ],
    },
    {
      id: 'business' as const,
      title: 'Business',
      subtitle: 'For fleets, brokers, and enterprises',
      price: '$99.99',
      period: '/month',
      popular: false,
      accent: '#E5E7EB',
      iconBg: '#F8FAFC',
      features: [
        'Unlimited vehicle posts',
        'Priority placement on searches',
        'Full API access (read/write)',
        'White-label options',
        'Up to 10 team users',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 priority support',
        'Fleet move planning',
        'Advanced analytics',
      ],
    },
  ]), []);

  const onSelectTier = useCallback((id: 'basic' | 'pro' | 'business') => {
    console.log('[Admin] membership.select', id);
    setSelectedTier(id);
  }, []);

  const FeatureRow = useCallback(({ text }: { text: string }) => (
    <View style={styles.mFeatureRow} testID="m-feature-row">
      <View style={styles.mCheckWrap}>
        <Check size={16} color={theme.colors.success} />
      </View>
      <Text style={styles.mFeatureText}>{text}</Text>
    </View>
  ), []);

  const TierCard = useCallback(({ tier }: { tier: {
    id: 'basic' | 'pro' | 'business';
    title: string; subtitle: string; price: string; period: string; popular?: boolean; accent: string; iconBg: string; features: string[];
  } }) => {
    const isSelected = selectedTier === tier.id;
    const borderColor = tier.popular ? theme.colors.warning : theme.colors.border;
    return (
      <View style={[styles.mCard, { borderColor }]} testID={`m-tier-${tier.id}`}>
        <View style={styles.mCardHeader}>
          <View style={[styles.mCardIconWrap, { backgroundColor: tier.iconBg }]}
            testID={`m-tier-icon-${tier.id}`}>
            {tier.id === 'business' ? (
              <Crown size={22} color={theme.colors.secondary} />
            ) : tier.id === 'pro' ? (
              <Zap size={22} color={theme.colors.warning} />
            ) : (
              <Crown size={22} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.mCardHeadings}>
            <Text style={styles.mCardTitle}>{tier.title}</Text>
            <Text style={styles.mCardSubtitle}>{tier.subtitle}</Text>
          </View>
          <View style={styles.mPriceWrap}>
            <Text style={styles.mPriceMain}>{tier.price}</Text>
            <Text style={styles.mPriceSub}>{tier.period}</Text>
          </View>
        </View>
        {tier.popular && (
          <View style={styles.mPopularBadge} testID="m-popular-badge">
            <Text style={styles.mPopularText}>Most Popular</Text>
          </View>
        )}
        <View style={styles.mFeaturesWrap}>
          {tier.features.map((f) => (
            <FeatureRow key={f} text={f} />
          ))}
        </View>
        <TouchableOpacity
          onPress={() => onSelectTier(tier.id)}
          style={[styles.mSelectBtn, isSelected && styles.mSelectBtnActive]}
          testID={`m-select-${tier.id}`}
          activeOpacity={0.9}
        >
          <Text style={[styles.mSelectText, isSelected && styles.mSelectTextActive]}>
            {isSelected ? 'Selected' : 'Choose Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [FeatureRow, onSelectTier, selectedTier]);

  const MembershipTab = (
    <View>
      <View style={styles.mHeaderWrap}>
        <Text style={styles.mPageTitle}>Choose Your Plan</Text>
        <Text style={styles.mPageSubtitle}>Unlock premium features and grow your business</Text>
      </View>
      {membershipTiers.map((t) => (
        <TierCard key={t.id} tier={t} />
      ))}
      <View style={styles.mWhyCard} testID="m-why-upgrade">
        <Text style={styles.mWhyTitle}>Why Upgrade?</Text>
        <View style={styles.mWhyRow}>
          <View style={styles.mWhyIcon}><TrendingUp size={20} color={theme.colors.secondary} /></View>
          <View style={styles.mWhyTextWrap}>
            <Text style={styles.mWhyHeading}>Increase Revenue</Text>
            <Text style={styles.mWhyDesc}>Priority access to high-paying loads and exclusive opportunities</Text>
          </View>
        </View>
        <View style={styles.mWhyRow}>
          <View style={styles.mWhyIcon}><Shield size={20} color={theme.colors.secondary} /></View>
          <View style={styles.mWhyTextWrap}>
            <Text style={styles.mWhyHeading}>Advanced Security</Text>
            <Text style={styles.mWhyDesc}>Enhanced fraud protection and secure payment processing</Text>
          </View>
        </View>
        <View style={styles.mWhyRow}>
          <View style={styles.mWhyIcon}><UserRound size={20} color={theme.colors.secondary} /></View>
          <View style={styles.mWhyTextWrap}>
            <Text style={styles.mWhyHeading}>Priority Support</Text>
            <Text style={styles.mWhyDesc}>24/7 customer support with dedicated account management</Text>
          </View>
        </View>
        <View style={styles.mWhyRow}>
          <View style={styles.mWhyIcon}><Smartphone size={20} color={theme.colors.secondary} /></View>
          <View style={styles.mWhyTextWrap}>
            <Text style={styles.mWhyHeading}>AI-Powered Tools</Text>
            <Text style={styles.mWhyDesc}>Advanced AI features for load matching and business optimization</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.mUpgradeBar} activeOpacity={0.9} onPress={() => console.log('[Admin] membership.upgrade', selectedTier)} testID="m-upgrade-now">
        <Text style={styles.mUpgradeText}>Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  );

  const Overview = (
    <ScrollView contentContainerStyle={styles.scroll} testID="adminOverviewScroll">
      <Text style={styles.h1}>Load Board Scraping Admin</Text>

      <View style={styles.tabsRow}>
        {(['overview','sources','jobs','membership'] as TabKey[]).map((key) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              accessibilityRole="button"
              testID={`tab-${key}`}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} accessibilityRole="button" testID="refreshBtn">
          <RefreshCcw color={theme.colors.secondary} size={20} />
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <>
          <View style={styles.grid}>
            {stats.map((s) => (
              <View key={s.id} style={styles.card} testID={`stat-${s.id}`}>
                <View style={styles.cardIconWrap}>
                  <IconSwitch name={s.icon} color={theme.colors.secondary} size={20} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Active Jobs</Text>
          {jobs.map((job) => {
            const pct = Math.round((job.processed / job.total) * 100);
            return (
              <View key={job.id} style={styles.jobCard} testID={`job-${job.id}`}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.name}</Text>
                  {renderBadge(job.status)}
                </View>
                <ProgressBar progress={pct} />
                <View style={styles.jobMetaRow}>
                  <Text style={styles.jobMetaText}>{`${job.processed}/${job.total} loads processed`}</Text>
                  <Text style={styles.jobPct}>{`${pct}%`}</Text>
                </View>
                {job.status === 'RUNNING' && (
                  <TouchableOpacity onPress={() => onStopJob(job.id)} style={styles.stopBtn} accessibilityRole="button" testID={`stop-${job.id}`}>
                    <Text style={styles.stopBtnText}>Stop</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}

      {activeTab === 'sources' && (
        <View testID="sourcesTab">
          {SourcesTab}
        </View>
      )}

      {activeTab === 'jobs' && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            <View />
          </View>
          {jobs.map((job) => (
            <View key={job.id} style={styles.jobListCard} testID={`recent-job-${job.id}`}>
              <View style={styles.jobListHeader}>
                <Text style={styles.jobListName}>{job.name}</Text>
                <Text style={styles.jobListTime}>{job.createdAt}</Text>
              </View>
              <View style={{ height: 6 }} />
              <Text style={styles.jobListMeta}>{`Status: ${job.status.toLowerCase()}`}</Text>
              <Text style={styles.jobListMeta}>{`Loads Found: ${job.total}`}</Text>
              <Text style={styles.jobListMeta}>{`Processed: ${job.processed}`}</Text>
            </View>
          ))}
        </>
      )}

      {activeTab === 'membership' && (
        <View testID="membershipTab">
          {MembershipTab}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="adminScreen">
      {Overview}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.lg },
  h1: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark, marginBottom: theme.spacing.md },
  tabsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  tabBtnActive: { backgroundColor: hexToRgba(theme.colors.secondary, 0.1), borderColor: theme.colors.secondary },
  tabText: { color: theme.colors.gray, fontWeight: fontWeight600 },
  tabTextActive: { color: theme.colors.secondary },
  refreshBtn: { padding: 10, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 as unknown as number },
  card: { flex: 1, minWidth: 140, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: hexToRgba(theme.colors.secondary, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: theme.fontSize.xl, fontWeight: fontWeight700, color: theme.colors.dark },
  statLabel: { color: theme.colors.gray, marginTop: 4 },

  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.lg, marginBottom: theme.spacing.md },

  jobCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  jobHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  jobTitle: { fontSize: theme.fontSize.md, fontWeight: fontWeight700, color: theme.colors.dark },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: theme.fontSize.sm, fontWeight: fontWeight600 },
  progressTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: 999 },
  progressBar: { height: 6, backgroundColor: theme.colors.secondary, borderRadius: 999 },
  jobMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  jobMetaText: { color: theme.colors.gray },
  jobPct: { color: theme.colors.dark, fontWeight: fontWeight600 },
  stopBtn: { marginTop: 10, backgroundColor: hexToRgba(theme.colors.danger, 0.15), paddingVertical: 10, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  stopBtnText: { color: theme.colors.danger, fontWeight: fontWeight700 },

  placeholder: { padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border },
  placeholderText: { color: theme.colors.gray },

  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },

  jobListCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  jobListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobListName: { fontSize: theme.fontSize.md, fontWeight: fontWeight700, color: theme.colors.dark },
  jobListTime: { color: theme.colors.gray },
  jobListMeta: { color: theme.colors.dark, marginTop: 4 },

  sourceCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sourceName: { fontSize: theme.fontSize.md, fontWeight: fontWeight700, color: theme.colors.dark },
  sourceUrl: { color: theme.colors.secondary, marginTop: 2, textDecorationLine: 'underline' },
  sourceMetricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metricBox: { flex: 1 },
  metricValue: { fontSize: theme.fontSize.lg, fontWeight: fontWeight700, color: theme.colors.dark },
  metricLabel: { color: theme.colors.gray, marginTop: 2 },
  sourceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  lastScraped: { color: theme.colors.gray },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: hexToRgba(theme.colors.dark, 0.05), borderRadius: theme.borderRadius.md, marginRight: 8 },
  secondaryBtnText: { marginLeft: 6, color: theme.colors.dark, fontWeight: fontWeight600 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.md, marginRight: 8 },
  primaryBtnText: { marginLeft: 6, color: theme.colors.white, fontWeight: fontWeight600 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.md },
  toggleBtnText: { color: theme.colors.dark, fontWeight: fontWeight600 },

  mHeaderWrap: { alignItems: 'center', marginBottom: theme.spacing.md },
  mPageTitle: { fontSize: 28, fontWeight: fontWeight700, color: theme.colors.dark },
  mPageSubtitle: { marginTop: 4, fontSize: theme.fontSize.md, color: theme.colors.gray },
  mCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  mCardHeader: { flexDirection: 'row', alignItems: 'center' },
  mCardIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  mCardHeadings: { flex: 1 },
  mCardTitle: { fontSize: theme.fontSize.lg, color: theme.colors.dark, fontWeight: fontWeight700 },
  mCardSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.gray, marginTop: 2 },
  mPriceWrap: { alignItems: 'flex-end' },
  mPriceMain: { fontSize: 34, fontWeight: fontWeight700, color: theme.colors.dark },
  mPriceSub: { fontSize: theme.fontSize.md, color: theme.colors.gray },
  mPopularBadge: { alignSelf: 'flex-end', backgroundColor: theme.colors.warning, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: theme.spacing.sm },
  mPopularText: { color: theme.colors.white, fontWeight: fontWeight700, fontSize: theme.fontSize.sm },
  mFeaturesWrap: { marginTop: theme.spacing.md },
  mFeatureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  mCheckWrap: { width: 20, alignItems: 'center', marginRight: theme.spacing.sm },
  mFeatureText: { flex: 1, fontSize: theme.fontSize.md, color: theme.colors.dark },
  mSelectBtn: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.primary, paddingVertical: 14, alignItems: 'center', borderRadius: theme.borderRadius.lg },
  mSelectBtnActive: { backgroundColor: '#E5E7EB' },
  mSelectText: { color: theme.colors.white, fontWeight: fontWeight700, fontSize: theme.fontSize.md },
  mSelectTextActive: { color: theme.colors.gray },
  mWhyCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, marginTop: theme.spacing.md },
  mWhyTitle: { fontSize: theme.fontSize.lg, color: theme.colors.dark, fontWeight: fontWeight700, marginBottom: theme.spacing.md },
  mWhyRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  mWhyIcon: { width: 24, alignItems: 'center', marginRight: theme.spacing.md },
  mWhyTextWrap: { flex: 1 },
  mWhyHeading: { fontWeight: fontWeight700, color: theme.colors.dark, fontSize: theme.fontSize.md },
  mWhyDesc: { color: theme.colors.gray, marginTop: 2, fontSize: theme.fontSize.sm },
  mUpgradeBar: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.secondary, paddingVertical: 16, alignItems: 'center', borderRadius: theme.borderRadius.lg },
  mUpgradeText: { color: theme.colors.white, fontWeight: fontWeight700, fontSize: theme.fontSize.md },
});
