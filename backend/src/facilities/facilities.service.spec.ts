import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { FacilitiesService } from './facilities.service';
import { Facility, User, Subscription, Court, Customer, Booking, Discount, BookingRule, AuditLog, Invoice } from '../schemas';

describe('FacilitiesService — Directory Aggregation Pipeline', () => {
  let service: FacilitiesService;
  let mockFacilityModel: any;
  let mockUserModel: any;
  let mockSubscriptionModel: any;
  let mockCourtModel: any;
  let mockCustomerModel: any;
  let mockBookingModel: any;
  let mockDiscountModel: any;
  let mockBookingRuleModel: any;
  let mockAuditLogModel: any;
  let mockInvoiceModel: any;

  beforeEach(async () => {
    mockFacilityModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    };
    mockUserModel = { find: jest.fn() };
    mockSubscriptionModel = { findOne: jest.fn() };
    mockCourtModel = { find: jest.fn() };
    mockCustomerModel = { countDocuments: jest.fn() };
    mockBookingModel = { aggregate: jest.fn(), countDocuments: jest.fn() };
    mockDiscountModel = { find: jest.fn() };
    mockBookingRuleModel = { find: jest.fn() };
    mockAuditLogModel = { find: jest.fn() };
    mockInvoiceModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilitiesService,
        { provide: getModelToken(Facility.name), useValue: mockFacilityModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Subscription.name), useValue: mockSubscriptionModel },
        { provide: getModelToken(Court.name), useValue: mockCourtModel },
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(Discount.name), useValue: mockDiscountModel },
        { provide: getModelToken(BookingRule.name), useValue: mockBookingRuleModel },
        { provide: getModelToken(AuditLog.name), useValue: mockAuditLogModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
      ],
    }).compile();

    service = module.get<FacilitiesService>(FacilitiesService);
  });

  describe('findAll', () => {
    it('should aggregate lifetimeBookings, totalRevenue, and lastBookingDate correctly', async () => {
      const mockAggregatedData = [
        {
          _id: 'facility1',
          name: 'Padel Prime DHA',
          city: 'Karachi',
          status: 'active',
          courtCount: 4,
          courtLimit: 6,
          activeCustomers: 35,
          subscriptionStatus: 'active',
          subscriptionPlan: 'pro',
          totalRevenue: 300000,
          lifetimeBookings: 110,
          lastBookingDate: '2026-07-28T10:00:00.000Z',
        },
      ];

      mockFacilityModel.aggregate.mockImplementation((pipeline: any[]) => {
        // Check if count pipeline
        if (pipeline.some((stage) => stage.$count)) {
          return { exec: jest.fn().mockResolvedValue([{ total: 1 }]) };
        }
        return { exec: jest.fn().mockResolvedValue(mockAggregatedData) };
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].totalRevenue).toBe(300000);
      expect(result.data[0].lifetimeBookings).toBe(110);
      expect(result.data[0].lastBookingDate).toBe('2026-07-28T10:00:00.000Z');
      expect(result.meta.total).toBe(1);
    });

    it('should handle zero-bookings facility edge case cleanly with null lastBookingDate and 0 revenue', async () => {
      const mockZeroBookingData = [
        {
          _id: 'facility2',
          name: 'Urban Futsal Park',
          city: 'Faisalabad',
          status: 'inactive',
          courtCount: 2,
          courtLimit: 4,
          activeCustomers: 0,
          subscriptionStatus: 'active',
          subscriptionPlan: 'starter',
          totalRevenue: 0,
          lifetimeBookings: 0,
          lastBookingDate: null,
        },
      ];

      mockFacilityModel.aggregate.mockImplementation((pipeline: any[]) => {
        if (pipeline.some((stage) => stage.$count)) {
          return { exec: jest.fn().mockResolvedValue([{ total: 1 }]) };
        }
        return { exec: jest.fn().mockResolvedValue(mockZeroBookingData) };
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].lifetimeBookings).toBe(0);
      expect(result.data[0].totalRevenue).toBe(0);
      expect(result.data[0].lastBookingDate).toBeNull();
    });
  });
});
