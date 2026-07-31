import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Facility, Customer, Booking, BookingRule, Discount } from '../schemas';

describe('DashboardService — Booking-Rule Adoption Aggregation', () => {
  let service: DashboardService;
  let mockFacilityModel: any;
  let mockCustomerModel: any;
  let mockBookingModel: any;
  let mockBookingRuleModel: any;
  let mockDiscountModel: any;

  beforeEach(async () => {
    mockFacilityModel = {
      countDocuments: jest.fn(),
    };
    mockCustomerModel = {
      countDocuments: jest.fn(),
    };
    mockBookingModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };
    mockBookingRuleModel = {
      countDocuments: jest.fn(),
    };
    mockDiscountModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Facility.name), useValue: mockFacilityModel },
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(BookingRule.name), useValue: mockBookingRuleModel },
        { provide: getModelToken(Discount.name), useValue: mockDiscountModel },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getStats', () => {
    it('should calculate correct rule adoption percentages across active facilities', async () => {
      // Setup mock returns
      mockFacilityModel.countDocuments.mockImplementation((query?: any) => {
        if (!query || Object.keys(query).length === 0) return { exec: jest.fn().mockResolvedValue(10) };
        if (query.status === 'active') return { exec: jest.fn().mockResolvedValue(8) };
        return { exec: jest.fn().mockResolvedValue(1) };
      });

      mockCustomerModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(350) });

      mockBookingModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(500) });
      mockBookingModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockDiscountModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      // Mock rule adoption counts
      mockBookingRuleModel.countDocuments.mockImplementation((query: any) => {
        if (query.key === 'cash_only') return { exec: jest.fn().mockResolvedValue(5) };
        if (query.key === 'advance_payment_required') return { exec: jest.fn().mockResolvedValue(10) };
        return { exec: jest.fn().mockResolvedValue(0) };
      });

      const stats = await service.getStats();

      // Total facilities = 10
      // cash_only: 5 / 10 = 50%
      // advance_payment_required: 10 / 10 = 100%
      const cashRule = stats.ruleAdoption.find((r) => r.key === 'cash_only');
      const advanceRule = stats.ruleAdoption.find((r) => r.key === 'advance_payment_required');

      expect(cashRule?.percentage).toBe(50);
      expect(advanceRule?.percentage).toBe(100);
    });

    it('should handle zero facilities edge case safely without division-by-zero errors', async () => {
      mockFacilityModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      mockCustomerModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      mockBookingModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
      mockBookingModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockDiscountModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockBookingRuleModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      const stats = await service.getStats();

      expect(stats.kpis.totalFacilities).toBe(0);
      stats.ruleAdoption.forEach((rule) => {
        expect(rule.percentage).toBe(0);
      });
    });
  });
});
