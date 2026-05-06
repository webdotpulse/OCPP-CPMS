import { ChargePointSimulator, SimulatorConfig } from "./ChargePointSimulator.js";

class SimulatorManager {
  private simulators: Map<string, ChargePointSimulator> = new Map();

  public async spawn(config: SimulatorConfig): Promise<boolean> {
    if (this.simulators.has(config.chargerId)) {
      return false; // Already exists
    }

    const sim = new ChargePointSimulator(config);
    this.simulators.set(config.chargerId, sim);

    await sim.connect();
    return true;
  }

  public async kill(chargerId: string): Promise<boolean> {
    const sim = this.simulators.get(chargerId);
    if (!sim) return false;

    await sim.disconnect();
    this.simulators.delete(chargerId);
    return true;
  }

  public getSimulator(chargerId: string): ChargePointSimulator | undefined {
    return this.simulators.get(chargerId);
  }

  public getList() {
    const list: any[] = [];
    this.simulators.forEach((sim, id) => {
      list.push({
        chargerId: id,
        protocol: sim.config.protocol,
        type: sim.config.type,
        maxPowerKw: sim.config.maxPowerKw,
        chargeProfile: sim.config.chargeProfile,
        state: sim.state,
        currentTransactionId: sim.currentTransactionId,
        energyConsumedWh: sim.energyConsumedWh
      });
    });
    return list;
  }

  public async killAll() {
    for (const [id, sim] of this.simulators.entries()) {
      await sim.disconnect();
    }
    this.simulators.clear();
  }
}

export const simulatorManager = new SimulatorManager();
