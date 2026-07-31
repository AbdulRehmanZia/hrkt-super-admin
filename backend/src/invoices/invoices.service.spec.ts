import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { Invoice, Facility, Subscription, Court, Booking, AuditLog, User } from '../schemas';
import { BookingStatus } from '../schemas/booking.schema';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('InvoicesService — Billing Calculator Formula', () => {
  let service: InvoicesService;
  let mockInvoiceModel: any;
  let mockFacilityModel: any;
  let mockSubscriptionModel: any;
  let mockCourtModel: any;
  let mockBookingModel: any;
  let mockAuditLogModel: any;
  let mockUserModel: any;

  const mockFacilityId = new Types.ObjectId();
  const mockInvoiceId = new Types.ObjectId();

  beforeEach(async () => {
    mockInvoiceModel = {
      findById: jest.fn(),
      find: jest.fn(),
      exec: jest.fn(),
    };
    mockFacilityModel = {
      findById: jest.fn(),
    };
    mockSubscriptionModel = {
      findOne: jest.fn(),
    };
    mockCourtModel = {
      countDocuments: jest.fn(),
    };
    mockBookingModel = {
      countDocuments: jest.fn(),
    };
    mockAuditLogModel = {
      create: jest.fn(),
    };
    mockUserModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Facility.name), useValue: mockFacilityModel },
        { provide: getModelToken(Subscription.name), useValue: mockSubscriptionModel },
        { provide: getModelToken(Court.name), useValue: mockCourtModel },
        { provide: getModelToken(Booking.name), useValue: mockBookingModel },
        { provide: getModelToken(AuditLog.name), useValue: mockAuditLogModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('getBreakdown', () => {
    it('should correctly calculate billing formula: base_fee + (courts * 1500) + (completed_bookings * 50)', async () => {
      const mockInvoice: any = {
        _id: mockInvoiceId,
        facilityId: { _id: mockFacilityId, name: 'Padel Prime', city: 'Karachi', status: 'active', courtLimit: 6 },
        periodMonth: '2026-07',
        amountDue: 35000,
        status: 'unpaid',
      };
      mockInvoice.toObject = () => mockInvoice;

      mockInvoiceModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockInvoice),
        }),
      });

      mockFacilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockFacilityId, name: 'Padel Prime', city: 'Karachi' }),
      });

      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: 'pro', monthlyBaseFee: 15000 }),
      });

      mockCourtModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(4), // 4 courts * 1500 = 6000
      });

      mockBookingModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(100), // 100 completed bookings * 20 = 2000
      });

      const breakdown = await service.getBreakdown(mockInvoiceId.toString());

      // Expected: 15000 (base) + 6000 (courts) + 2000 (bookings) = 23000
      expect(breakdown.itemized.monthlyBaseFee.amount).toBe(15000);
      expect(breakdown.itemized.courtUsage.amount).toBe(6000);
      expect(breakdown.itemized.bookingUsage.bookingsCount).toBe(100);
      expect(breakdown.itemized.bookingUsage.amount).toBe(2000);
      expect(breakdown.itemized.totalCalculated).toBe(23000);
    });

    it('should filter per-booking count strictly by completed status and handle 0-bookings edge case', async () => {
      const mockInvoice: any = {
        _id: mockInvoiceId,
        facilityId: { _id: mockFacilityId, name: 'Urban Futsal Park', city: 'Faisalabad', status: 'inactive', courtLimit: 4 },
        periodMonth: '2026-07',
        amountDue: 15000,
        status: 'unpaid',
      };
      mockInvoice.toObject = () => mockInvoice;

      mockInvoiceModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockInvoice),
        }),
      });

      mockFacilityModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockFacilityId, name: 'Urban Futsal Park' }),
      });

      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plan: 'starter', monthlyBaseFee: 10000 }),
      });

      mockCourtModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2), // 2 courts * 1500 = 3000
      });

      // 0 completed bookings
      mockBookingModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const breakdown = await service.getBreakdown(mockInvoiceId.toString());

      // Verify countDocuments was called with status: COMPLETED
      expect(mockBookingModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.COMPLETED }),
      );

      // Expected: 10000 + 3000 + 0 = 13000
      expect(breakdown.itemized.bookingUsage.bookingsCount).toBe(0);
      expect(breakdown.itemized.bookingUsage.amount).toBe(0);
      expect(breakdown.itemized.totalCalculated).toBe(13000);
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      mockInvoiceModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.getBreakdown(new Types.ObjectId().toString())).rejects.toThrow(NotFoundException);
    });
  });
});
