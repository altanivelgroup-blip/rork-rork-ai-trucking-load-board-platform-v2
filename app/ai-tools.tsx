import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Sparkles, Bot, Mic, FileText, BarChart3, Clock, BrainCircuit, MessageSquareMore, Wand2, Database } from 'lucide-react-native';

 type Stat = { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string; footnote?: string };
 type Benefit = { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; desc: string };

 export default function AIToolsScreen() {
   const router = useRouter();
   const stats: Stat[] = useMemo(
     () => [
       { icon: Clock, label: 'Ops Time Saved', value: '25–45%', footnote: 'drafting posts, docs, follow-ups' },
       { icon: BarChart3, label: 'Faster Tender → Book', value: '1.8–2.6x', footnote: 'respond quicker with AI assist' },
       { icon: Database, label: 'Manual Entry Reduced', value: '60%+', footnote: 'auto extract from BOL/COI/RC' },
       { icon: BrainCircuit, label: 'Forecast Accuracy', value: '+10–18%', footnote: 'lane trends & seasonality' },
     ],
     [],
   );

   const benefits: Benefit[] = useMemo(
     () => [
       { icon: Sparkles, title: 'Listing Assistant', desc: 'Turn rough details into polished posts with clear requirements, lane notes, and compliance flags.' },
       { icon: Bot, title: 'Matchmaker', desc: 'Recommends best-fit carriers by lane history, equipment, and on-time performance.' },
       { icon: Mic, title: 'Voice-to-Post', desc: 'Speak a load or update and we generate structured fields and messages automatically.' },
       { icon: FileText, title: 'Smart Docs', desc: 'Extracts key fields from BOL/COI, detects mismatches, and suggests corrections.' },
       { icon: MessageSquareMore, title: 'Reply Drafts', desc: 'One-tap responses for common carrier questions, rate counters, and appointment changes.' },
       { icon: Wand2, title: 'Workflow Automations', desc: 'Triggers alerts, status moves, and check calls based on context—no manual steps.' },
     ],
     [],
   );

   return (
     <View style={styles.container} testID="ai-tools-container">
       <Stack.Screen options={{ title: 'AI-Powered Tools' }} />
       <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
         <View style={styles.hero}>
           <Text style={styles.title}>Work Smarter With AI</Text>
           <Text style={styles.subtitle}>Built for trucking operations—cut busywork, move faster on tenders, and make better lane decisions.</Text>
         </View>

         <View style={styles.kpiGrid}>
           {stats.map((s) => (
             <View key={s.label} style={styles.kpiCard} testID="ai-kpi">
               <View style={styles.kpiIconWrap}>
                 <s.icon size={18} color={theme.colors.secondary} />
               </View>
               <Text style={styles.kpiValue}>{s.value}</Text>
               <Text style={styles.kpiLabel}>{s.label}</Text>
               {s.footnote ? <Text style={styles.kpiFootnote}>{s.footnote}</Text> : null}
             </View>
           ))}
         </View>

         <View style={styles.section}>
           <Text style={styles.sectionTitle}>What You Get</Text>
           {benefits.map((b) => (
             <View key={b.title} style={styles.benefitRow} testID="ai-benefit">
               <View style={styles.benefitIcon}>
                 <b.icon size={18} color={theme.colors.secondary} />
               </View>
               <View style={styles.benefitTextWrap}>
                 <Text style={styles.benefitTitle}>{b.title}</Text>
                 <Text style={styles.benefitDesc}>{b.desc}</Text>
               </View>
             </View>
           ))}
         </View>

         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Why It Matters In Trucking</Text>
           <Text style={styles.body}>
             Rates move hourly and ops is nonstop. AI closes the gap: faster listings mean earlier carrier interest, auto-extracted documents avoid rekeying errors, and trend guidance helps you price confidently for seasonality. Teams ship more with less manual overhead and fewer misses.
           </Text>
         </View>

         <TouchableOpacity
           style={styles.cta}
           activeOpacity={0.9}
           onPress={() => {
             try {
               console.log('ai-tools.cta', Platform.OS);
               router.push('/increase-revenue');
             } catch (e) {
               console.error('ai-tools.navigate.error', e);
             }
           }}
           testID="cta-enable-ai"
         >
           <Text style={styles.ctaText}>Enable AI Tools</Text>
         </TouchableOpacity>
       </ScrollView>
     </View>
   );
 }

 const styles = StyleSheet.create({
   container: {
     flex: 1,
     backgroundColor: theme.colors.lightGray,
   },
   scroll: {
     padding: theme.spacing.lg,
     paddingBottom: theme.spacing.xl,
   },
   hero: {
     marginBottom: theme.spacing.lg,
     alignItems: 'center',
   },
   title: {
     fontSize: 26,
     color: theme.colors.dark,
     fontWeight: '800' as const,
     textAlign: 'center' as const,
   },
   subtitle: {
     marginTop: 6,
     color: theme.colors.gray,
     fontSize: theme.fontSize.md,
     textAlign: 'center' as const,
   },
   kpiGrid: {
     flexDirection: 'row' as const,
     flexWrap: 'wrap' as const,
     gap: 12 as unknown as number,
   },
   kpiCard: {
     flexBasis: '48%',
     backgroundColor: theme.colors.white,
     borderRadius: theme.borderRadius.lg,
     padding: theme.spacing.md,
     borderWidth: 1,
     borderColor: theme.colors.border,
   },
   kpiIconWrap: {
     width: 28,
     height: 28,
     borderRadius: 14,
     backgroundColor: '#EFF6FF',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 6,
   },
   kpiValue: {
     fontSize: 22,
     fontWeight: '800' as const,
     color: theme.colors.dark,
   },
   kpiLabel: {
     color: theme.colors.gray,
     marginTop: 2,
   },
   kpiFootnote: {
     color: theme.colors.gray,
     fontSize: theme.fontSize.xs,
     marginTop: 2,
   },
   section: {
     marginTop: theme.spacing.lg,
     backgroundColor: theme.colors.white,
     borderRadius: theme.borderRadius.xl,
     padding: theme.spacing.lg,
     borderWidth: 1,
     borderColor: theme.colors.border,
   },
   sectionTitle: {
     fontSize: theme.fontSize.lg,
     fontWeight: '800' as const,
     color: theme.colors.dark,
     marginBottom: theme.spacing.md,
   },
   benefitRow: {
     flexDirection: 'row' as const,
     alignItems: 'flex-start' as const,
     paddingVertical: 8,
   },
   benefitIcon: {
     width: 28,
     alignItems: 'center' as const,
     marginRight: theme.spacing.md,
   },
   benefitTextWrap: {
     flex: 1,
   },
   benefitTitle: {
     fontWeight: '700' as const,
     color: theme.colors.dark,
     fontSize: theme.fontSize.md,
   },
   benefitDesc: {
     color: theme.colors.gray,
     marginTop: 2,
     fontSize: theme.fontSize.sm,
   },
   body: {
     color: theme.colors.dark,
     lineHeight: 20,
   },
   cta: {
     marginTop: theme.spacing.lg,
     backgroundColor: theme.colors.secondary,
     paddingVertical: 16,
     alignItems: 'center' as const,
     borderRadius: theme.borderRadius.lg,
   },
   ctaText: {
     color: theme.colors.white,
     fontWeight: '800' as const,
     fontSize: theme.fontSize.md,
   },
 });