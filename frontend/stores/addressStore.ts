import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  area: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  fullAddress?: string; // Store complete address string from map
}

interface AddressStore {
  addresses: Address[];
  selectedAddress: Address | null;
  isLocationModalOpen: boolean;
  addAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
  setSelectedAddress: (address: Address | null) => void;
  setIsLocationModalOpen: (isOpen: boolean) => void;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddress: null,
      isLocationModalOpen: false,

      addAddress: (address) => {
        set((state) => {
          const filtered = state.addresses.filter(
            (a) =>
              a.id !== address.id &&
              !(
                (a.fullAddress && address.fullAddress && a.fullAddress.trim().toLowerCase() === address.fullAddress.trim().toLowerCase()) ||
                (a.name && address.name && a.name.trim().toLowerCase() === address.name.trim().toLowerCase() && a.street === address.street && a.city === address.city)
              )
          );
          return {
            addresses: [address, ...filtered],
          };
        });
      },

      removeAddress: (id) => {
        set((state) => ({
          addresses: state.addresses.filter((a) => a.id !== id),
        }));
      },

      setSelectedAddress: (address) => {
        set({ selectedAddress: address });
        if (address) {
          localStorage.setItem('selectedAddress', JSON.stringify(address));
        }
      },

      setIsLocationModalOpen: (isOpen) => {
        set({ isLocationModalOpen: isOpen });
      },
    }),
    {
      name: 'address-storage',
    }
  )
);