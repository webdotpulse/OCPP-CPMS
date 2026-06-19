import { loadManagementService } from "../services/LoadManagementService.js";
import { prisma } from "../config/database.js";

async function runBenchmark() {
  console.log("Seeding data for benchmark...");

  // Create a company
  const company = await prisma.company.create({
    data: {
      name: "Benchmark Company " + Date.now(),
    }
  });

  // Create a user
  const user = await prisma.user.create({
    data: {
      email: `benchmark_${Date.now()}@example.com`,
      password: "password123",
      name: "Bench Mark",
      companyId: company.id
    }
  });

  // Create groups
  const groups = [];
  for (let i = 0; i < 50; i++) {
    const g = await prisma.chargeGroup.create({
      data: {
        name: `Bench Group ${Date.now()}-${i}`,
        maxPower: 100,
        maxAmperage: 200,
      }
    });
    groups.push(g);
  }

  // Create a station
  const station = await prisma.chargingStation.create({
    data: {
      station_name: `Bench Station ${Date.now()}`,
      owner_id: user.id,
      latitude: 0,
      longitude: 0,
      street_name: "Bench Street",
      city: "Bench City",
      postal_code: "12345"
    }
  });

  // Create chargers and transactions
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    // Put transactions in 20 groups
    if (i < 20) {
      for (let j = 0; j < 5; j++) {
        const charger = await prisma.charger.create({
          data: {
            name: `Bench Charger ${group.id}-${j}-${Date.now()}`,
            model: "Bench Model",
            manufacturer: "Bench Mfg",
            serial_number: `BENCH-${group.id}-${j}-${Date.now()}`,
            power_capacity: 22,
            owner_id: user.id,
            charging_station_id: station.id,
            chargeGroupId: group.id,
            firmware_version: "1.0.0",
            service_contacts: "support@example.com"
          }
        });

        await prisma.transaction.create({
          data: {
            transactionId: `tx-${group.id}-${j}-${Date.now()}`,
            connectorName: "1",
            charger_id: charger.charger_id,
            status: "charging",
            current: 16,
            currentPower: 11000,
          }
        });
      }
    }
  }

  console.log("Data seeded. Running benchmark...");
  (loadManagementService as any).isEngineRunning = true; // Hack to make it run once if we bypassed the interval

  // Warm up
  await (loadManagementService as any).runSmartChargingLoop();

  const start = performance.now();

  // Run the loop manually
  for (let i = 0; i < 10; i++) {
    await (loadManagementService as any).runSmartChargingLoop();
  }

  const end = performance.now();
  console.log(`\n========================================`);
  console.log(`Benchmark completed in ${(end - start).toFixed(2)} ms`);
  console.log(`========================================\n`);

  process.exit(0);
}

runBenchmark().catch(console.error);
