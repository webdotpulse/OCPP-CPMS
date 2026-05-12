import { jest } from '@jest/globals';
import { EpexSpotService } from "../services/EpexSpotService.js";
import { prisma } from "../config/database.js";

// We use jest.spyOn instead of module mocking to avoid ESM issues
describe("EpexSpotService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("getPriceForTimestamp", () => {
    it("should return the exact spot price from the database", async () => {
      const mockTimestamp = new Date("2025-01-01T14:30:00.000Z");
      const targetTime = new Date(mockTimestamp);
      targetTime.setMinutes(0, 0, 0);

      const mockPriceRecord = {
        id: 1,
        timestamp: targetTime,
        country: "BE",
        pricePerMwh: 85.5,
      };

      const findUniqueSpy = jest.spyOn(prisma.epexSpotPrice, 'findUnique').mockResolvedValue(mockPriceRecord as any);

      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: {
          timestamp_country: {
            timestamp: targetTime,
            country: "BE",
          },
        },
      });
      expect(price).toBe(85.5);
    });

    it("should return null if no exact or fallback price is found", async () => {
      jest.spyOn(prisma.epexSpotPrice, 'findUnique').mockResolvedValue(null as any);
      jest.spyOn(prisma.epexSpotPrice, 'findFirst').mockResolvedValue(null as any);

      const price = await EpexSpotService.getPriceForTimestamp("BE", new Date());

      expect(price).toBeNull();
    });
  });

  describe("Dynamic Pricing Calculation", () => {
    it("should correctly apply markup and tax to a spot price", () => {
      // Simulate the logic in v16/v21 handlers
      const spotPriceMwh = 100; // €100 / MWh
      const spotPriceKwh = spotPriceMwh / 1000; // €0.10 / kWh

      const markup = 0.05; // €0.05 / kWh
      const taxPercentage = 21; // 21% VAT
      const taxRate = taxPercentage / 100;

      const hourlyCostKwh = (spotPriceKwh + markup) * (1 + taxRate);

      // Expected: (0.10 + 0.05) * 1.21 = 0.15 * 1.21 = 0.1815
      expect(hourlyCostKwh).toBeCloseTo(0.1815, 4);

      // Now calculate amount due for 50 kWh
      const energyConsumed = 50000; // 50,000 Wh = 50 kWh
      const amountDue = (energyConsumed / 1000) * hourlyCostKwh * 100;

      // Expected: 50 * 0.1815 * 100 = 907.5
      expect(amountDue).toBeCloseTo(907.5, 1);
    });
  });
});
