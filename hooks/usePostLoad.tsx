import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';
import { Load, VehicleType } from '@/types';
import { useLoads } from '@/hooks/useLoads';

export type RateKind = 'flat' | 'per-mile' | 'hourly';

interface PostLoadDraft {
  title: string;
  description: string;
  vehicleType: VehicleType | null;
  pickup: string;
  delivery: string;
  weight: string;
  dimensions: string;
  pickupDate: Date | null;
  deliveryDate: Date | null;
  rateAmount: string;
  rateKind: RateKind;
  requirements: string;
  contact: string;
  attachments: { uri: string; name?: string; type?: string }[];
}

interface PostLoadState {
  draft: PostLoadDraft;
  setField: <K extends keyof PostLoadDraft>(key: K, value: PostLoadDraft[K]) => void;
  reset: () => void;
  canSubmit: boolean;
  submit: () => Promise<Load | null>;
}

const initialDraft: PostLoadDraft = {
  title: '',
  description: '',
  vehicleType: null,
  pickup: '',
  delivery: '',
  weight: '',
  dimensions: '',
  pickupDate: null,
  deliveryDate: null,
  rateAmount: '',
  rateKind: 'flat',
  requirements: '',
  contact: '',
  attachments: [],
};

export const [PostLoadProvider, usePostLoad] = createContextHook<PostLoadState>(() => {
  const { addLoad } = useLoads();
  const [draft, setDraft] = useState<PostLoadDraft>(initialDraft);
  const setField = useCallback(<K extends keyof PostLoadDraft>(key: K, value: PostLoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canSubmit = useMemo(() => {
    return (
      draft.title.trim().length > 0 &&
      draft.description.trim().length > 0 &&
      !!draft.vehicleType &&
      draft.pickup.trim().length > 0 &&
      draft.delivery.trim().length > 0 &&
      !!draft.pickupDate &&
      !!draft.deliveryDate &&
      draft.rateAmount.trim().length > 0 &&
      draft.contact.trim().length > 0 &&
      (draft.attachments?.length ?? 0) >= 5
    );
  }, [draft]);

  const reset = useCallback(() => setDraft(initialDraft), []);

  const submit = useCallback(async (): Promise<Load | null> => {
    try {
      if (!canSubmit || !draft.vehicleType || !draft.pickupDate || !draft.deliveryDate) return null;
      const now = Date.now();
      const rateNum = Number(draft.rateAmount.replace(/[^0-9.]/g, '')) || 0;
      const weightNum = Number(draft.weight.replace(/[^0-9.]/g, '')) || 0;

      const load: Load = {
        id: String(now),
        shipperId: 'current-shipper',
        shipperName: 'You',
        origin: {
          address: '',
          city: draft.pickup,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        destination: {
          address: '',
          city: draft.delivery,
          state: '',
          zipCode: '',
          lat: 0,
          lng: 0,
        },
        distance: 0,
        weight: weightNum,
        vehicleType: draft.vehicleType,
        rate: rateNum,
        ratePerMile: 0,
        pickupDate: draft.pickupDate,
        deliveryDate: draft.deliveryDate,
        status: 'available',
        description: draft.description,
        special_requirements: draft.requirements ? [draft.requirements] : undefined,
        isBackhaul: false,
      };

      console.log('[PostLoad] submit creating load', load);
      await addLoad(load);
      return load;
    } catch (e) {
      console.log('[PostLoad] submit error', e);
      throw e;
    }
  }, [addLoad, canSubmit, draft]);

  return { draft, setField, reset, canSubmit, submit };
});