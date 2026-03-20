import { create } from 'zustand';

export interface Feature {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  demo: string[];
  benefits: string[];
}

export interface StackItem {
  feature: Feature;
  addedAt: Date;
}

interface CartState {
  items: StackItem[];
  addItem: (feature: Feature) => void;
  removeItem: (featureId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  hasItem: (featureId: string) => boolean;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (feature) => {
    const state = get();
    if (!state.hasItem(feature.id)) {
      set({
        items: [...state.items, { feature, addedAt: new Date() }]
      });
    }
  },
  
  removeItem: (featureId) => {
    set((state) => ({
      items: state.items.filter((item) => item.feature.id !== featureId)
    }));
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.feature.price, 0);
  },
  
  hasItem: (featureId) => {
    return get().items.some((item) => item.feature.id === featureId);
  }
}));
