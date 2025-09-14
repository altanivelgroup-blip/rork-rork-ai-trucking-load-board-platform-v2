import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '@/backend/trpc/create-context';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/utils/firebase';

const NotificationSettingsSchema = z.object({
  channels: z.object({
    push: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
  }),
  categories: z.object({
    loadUpdates: z.boolean(),
    payments: z.boolean(),
    system: z.boolean(),
  }),
});

type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

const defaultSettings: NotificationSettings = {
  channels: {
    push: true,
    email: true,
    sms: false,
  },
  categories: {
    loadUpdates: true,
    payments: true,
    system: true,
  },
};

export const notificationsRouter = createTRPCRouter({
  getSettings: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        console.log('[Notifications] Getting settings for user:', input.userId);
        
        if (!input.userId || input.userId.trim() === '') {
          console.log('[Notifications] Invalid userId, returning defaults');
          return {
            success: true,
            settings: defaultSettings,
          };
        }
        
        if (!db) {
          console.warn('[Notifications] Firebase not initialized, returning defaults');
          return {
            success: true,
            settings: defaultSettings,
          };
        }
        
        const userDoc = doc(db, 'notificationSettings', input.userId);
        const docSnap = await getDoc(userDoc);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('[Notifications] Found existing settings:', data);
          
          const validatedSettings = {
            channels: {
              push: data.channels?.push ?? defaultSettings.channels.push,
              email: data.channels?.email ?? defaultSettings.channels.email,
              sms: data.channels?.sms ?? defaultSettings.channels.sms,
            },
            categories: {
              loadUpdates: data.categories?.loadUpdates ?? defaultSettings.categories.loadUpdates,
              payments: data.categories?.payments ?? defaultSettings.categories.payments,
              system: data.categories?.system ?? defaultSettings.categories.system,
            },
          };
          
          return {
            success: true,
            settings: validatedSettings,
          };
        } else {
          console.log('[Notifications] No settings found, returning defaults');
          return {
            success: true,
            settings: defaultSettings,
          };
        }
      } catch (error: any) {
        console.error('[Notifications] Error getting settings:', error);
        return {
          success: true,
          error: error.message,
          settings: defaultSettings,
        };
      }
    }),

  updateSettings: publicProcedure
    .input(z.object({
      userId: z.string(),
      settings: NotificationSettingsSchema,
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Notifications] Updating settings for user:', input.userId, input.settings);
        
        const userDoc = doc(db, 'notificationSettings', input.userId);
        await setDoc(userDoc, {
          ...input.settings,
          updatedAt: serverTimestamp(),
          userId: input.userId,
        }, { merge: true });
        
        console.log('[Notifications] ✅ Settings updated successfully');
        return {
          success: true,
          message: 'Notification settings updated successfully',
        };
      } catch (error: any) {
        console.error('[Notifications] Error updating settings:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  updateChannel: publicProcedure
    .input(z.object({
      userId: z.string(),
      channel: z.enum(['push', 'email', 'sms']),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Notifications] Updating channel:', input.channel, 'to', input.enabled, 'for user:', input.userId);
        
        const userDoc = doc(db, 'notificationSettings', input.userId);
        const docSnap = await getDoc(userDoc);
        
        let currentSettings = defaultSettings;
        if (docSnap.exists()) {
          currentSettings = docSnap.data() as NotificationSettings;
        }
        
        const updatedSettings = {
          ...currentSettings,
          channels: {
            ...currentSettings.channels,
            [input.channel]: input.enabled,
          },
        };
        
        await setDoc(userDoc, {
          ...updatedSettings,
          updatedAt: serverTimestamp(),
          userId: input.userId,
        }, { merge: true });
        
        console.log('[Notifications] ✅ Channel updated successfully');
        return {
          success: true,
          message: `${input.channel} notifications ${input.enabled ? 'enabled' : 'disabled'}`,
          settings: updatedSettings,
        };
      } catch (error: any) {
        console.error('[Notifications] Error updating channel:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  updateCategory: publicProcedure
    .input(z.object({
      userId: z.string(),
      category: z.enum(['loadUpdates', 'payments', 'system']),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Notifications] Updating category:', input.category, 'to', input.enabled, 'for user:', input.userId);
        
        const userDoc = doc(db, 'notificationSettings', input.userId);
        const docSnap = await getDoc(userDoc);
        
        let currentSettings = defaultSettings;
        if (docSnap.exists()) {
          currentSettings = docSnap.data() as NotificationSettings;
        }
        
        const updatedSettings = {
          ...currentSettings,
          categories: {
            ...currentSettings.categories,
            [input.category]: input.enabled,
          },
        };
        
        await setDoc(userDoc, {
          ...updatedSettings,
          updatedAt: serverTimestamp(),
          userId: input.userId,
        }, { merge: true });
        
        console.log('[Notifications] ✅ Category updated successfully');
        return {
          success: true,
          message: `${input.category} notifications ${input.enabled ? 'enabled' : 'disabled'}`,
          settings: updatedSettings,
        };
      } catch (error: any) {
        console.error('[Notifications] Error updating category:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }),
});