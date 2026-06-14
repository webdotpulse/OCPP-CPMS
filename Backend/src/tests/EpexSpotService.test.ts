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
const importPromise = import('../services/EpexSpotService.js');

describe("EpexSpotService", () => {
  let EpexSpotService: any;
  let mockTimestamp: Date;

  beforeAll(async () => {
      const module = await importPromise;
      EpexSpotService = module.EpexSpotService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimestamp = new Date('2025-01-01T14:30:00Z'); // Note the 30 minutes to test normalization
  });

  describe("getPriceForTimestamp", () => {
    it("should return the exact spot price from Redis cache if available", async () => {
      // Setup
      mockRedisGet.mockResolvedValue("85.5"); // 85.5 EUR/MWh

      const targetTime = new Date('2025-01-01T14:00:00Z'); // Normalized to start of hour

      // Execute
      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      // Verify
      expect(mockRedisGet).toHaveBeenCalledWith(`epex_price:EnergyZero:BE:${targetTime.toISOString()}`);
      expect(price).toBe(85.5);
    });

    it("should fallback to the most recent price if exact hour is missing from Redis", async () => {
      // Setup
      mockRedisGet.mockResolvedValueOnce(null); // Exact hour misses
      mockPrismaFindUnique.mockResolvedValue(null); // DB exact hour miss
      mockPrismaFindFirst.mockResolvedValue({ pricePerMwh: 72.1 }); // Fallback hit

      // Execute
      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      // Verify
      expect(mockRedisGet).toHaveBeenCalledTimes(1);
      expect(price).toBe(72.1);
    });

    it("should return the exact spot price from the database and cache it", async () => {
      // Setup
      mockRedisGet.mockResolvedValue(null); // Cache completely misses
      const targetTime = new Date('2025-01-01T14:00:00Z');

      mockPrismaFindUnique.mockResolvedValue({
        timestamp: targetTime,
        pricePerMwh: 90.0
      });

      // Execute
      const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

      // Verify
      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: {
          timestamp_country_provider: {
            timestamp: targetTime,
            country: "BE",
            provider: "EnergyZero"
          }
        }
      });
      // Should cache the result
      expect(mockRedisSet).toHaveBeenCalledWith(
        `epex_price:EnergyZero:BE:${targetTime.toISOString()}`,
        "90",
        "EX",
        86400 // 24 hours TTL
      );
      expect(price).toBe(90.0);
    });

    it("should fallback to the database fallback if exact hour is missing from cache and DB", async () => {
       // Setup
       mockRedisGet.mockResolvedValue(null);
       mockPrismaFindUnique.mockResolvedValue(null); // Exact hour DB miss

       mockPrismaFindFirst.mockResolvedValue({
         pricePerMwh: 65.4
       });

       // Execute
       const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

       // Verify
       expect(mockPrismaFindFirst).toHaveBeenCalledWith({
         where: {
           country: "BE",
           provider: "EnergyZero",
         },
         orderBy: { timestamp: "desc" }
       });
       expect(price).toBe(65.4);
    });

    it("should return null if price is completely unavailable", async () => {
       // Setup
       mockRedisGet.mockResolvedValue(null);
       mockPrismaFindUnique.mockResolvedValue(null);
       mockPrismaFindFirst.mockResolvedValue(null);

       // Execute
       const price = await EpexSpotService.getPriceForTimestamp("BE", mockTimestamp);

       // Verify
       expect(price).toBeNull();
    });
  });
});
