import { api } from "./api";

export interface SimulatorConfig {
  chargerId: string;
  protocol: "ocpp1.6" | "ocpp2.1";
  type: "AC" | "DC";
  maxPowerKw: number;
  rfidTags?: string;
  chargeProfile?: "SetSpeed" | "DynamicSpeed" | "RealLife1" | "RealLife2" | "RealLifeDC1" | "RealLifeDC2";
}

export const simulatorApi = {
  getSimulators: async () => {
    const response = await api.get("/simulator");
    return response.data?.data || response.data;
  },

  spawnSimulator: async (config: SimulatorConfig) => {
    const response = await api.post("/simulator/spawn", config);
    return response.data;
  },

  spawnSimulatorGroup: async (count: number, config?: Partial<SimulatorConfig>) => {
    const response = await api.post("/simulator/spawn-group", { count, config });
    return response.data;
  },

  killSimulator: async (chargerId: string) => {
    const response = await api.delete(`/simulator/${chargerId}`);
    return response.data;
  },

  triggerAction: async (chargerId: string, action: string, params?: any) => {
    const response = await api.post(`/simulator/${chargerId}/action`, { action, params });
    return response.data;
  },
};
