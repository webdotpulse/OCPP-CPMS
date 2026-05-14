import { jest } from '@jest/globals';

// Create mocked instances FIRST, before importing the service that uses them
const mockRedisGet = jest.fn() as any;
const mockRedisSet = jest.fn() as any;
const mockPrismaFindUnique = jest.fn() as any;
const mockPrismaFindFirst = jest.fn() as any;

jest.unstable_mockModule('../config/redis.js', () => ({
  redisClient: {
    get: mockRedisGet,
    set: mockRedisSet,
  }
}));

jest.unstable_mockModule('../config/database.js', () => ({
  prisma: {
    epexSpotPrice: {
      findUnique: mockPrismaFindUnique,
      findFirst: mockPrismaFindFirst
    }
  }
}));

// Mock axios just to prevent actual HTTP calls if any other test accidentally triggers them
jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn()
  }
}));

// Now dynamically import the service so it gets the mocked versions
const { EpexSpotService } = await import('../services/EpexSpotService.js');

describe("EpexSpotService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPriceForTimestamp", () => {
    it("should return the exact spot price from Redis cache if available", async () => {
      const mockTimestamp = new Date("2025-01-01T14:30:00.000Z");
      const targetTime = new Date(mockTimestamp);
      targetTime.setMinutes(0, 0, 0);

      mockRedisGet.mockResolvedValue("85.5");

      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      expect(mockRedisGet).toHaveBeenCalledWith(`epex_price:BE:${targetTime.toISOString()}`);
      expect(price).toBe(85.5);
    });

    it("should return the exact spot price from the database and cache it", async () => {
      const mockTimestamp = new Date("2025-01-01T14:30:00.000Z");
      const targetTime = new Date(mockTimestamp);
      targetTime.setMinutes(0, 0, 0);

      const mockPriceRecord = {
        id: 1,
        timestamp: targetTime,
        country: "BE",
        pricePerMwh: 85.5,
      };

      mockRedisGet.mockResolvedValue(null);
      mockRedisSet.mockResolvedValue("OK");
      mockPrismaFindUnique.mockResolvedValue(mockPriceRecord);

      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: {
          timestamp_country: {
            timestamp: targetTime,
            country: "BE",
          },
        },
      });
      expect(mockRedisSet).toHaveBeenCalledWith(`epex_price:BE:${targetTime.toISOString()}`, "85.5", "EX", 86400);
      expect(price).toBe(85.5);
    });

    it("should return null if no exact or fallback price is found", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockPrismaFindUnique.mockResolvedValue(null);
      mockPrismaFindFirst.mockResolvedValue(null);

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
