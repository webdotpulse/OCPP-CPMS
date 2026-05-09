import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';

interface ActiveSession {
  transactionId: number;
  chargerName: string;
  connectorName: string;
  startTime: string;
  energyConsumed: number;
  currentPower: number;
  status: string;
}

interface ChargerStatus {
  charger_id: number;
  name: string;
  status: string;
  last_heartbeat: string;
  connectors: number;
  active_sessions: number;
}

interface TelemetryState {
  socket: Socket | null;
  isConnected: boolean;
  setSocket: (socket: Socket | null) => void;
  setIsConnected: (isConnected: boolean) => void;

  sessions: ActiveSession[];
  isSessionsLoading: boolean;
  fetchSessions: () => Promise<void>;

  chargers: ChargerStatus[];
  isChargersLoading: boolean;
  fetchChargers: () => Promise<void>;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  socket: null,
  isConnected: false,
  setSocket: (socket) => set({ socket }),
  setIsConnected: (isConnected) => set({ isConnected }),

  sessions: [],
  isSessionsLoading: true,
  fetchSessions: async () => {
    try {
      const response = await api.get('/dashboard/live-sessions');
      set({ sessions: response.data, isSessionsLoading: false });
    } catch (error) {
      logger.error('Failed to fetch live sessions', error);
      set({ isSessionsLoading: false });
    }
  },

  chargers: [],
  isChargersLoading: true,
  fetchChargers: async () => {
    try {
      const response = await api.get('/dashboard/chargers-status');
      set({ chargers: response.data, isChargersLoading: false });
    } catch (error) {
      logger.error('Failed to fetch charger status grid', error);
      set({ isChargersLoading: false });
    }
  },
}));
