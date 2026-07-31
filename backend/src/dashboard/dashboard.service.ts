import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Facility,
  FacilityDocument,
  FacilityStatus,
  Booking,
  BookingDocument,
  Customer,
  CustomerDocument,
  CustomerStatus,
  BookingRule,
  BookingRuleDocument,
  Discount,
  DiscountDocument,
} from '../schemas';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(BookingRule.name) private bookingRuleModel: Model<BookingRuleDocument>,
    @InjectModel(Discount.name) private discountModel: Model<DiscountDocument>,
  ) {}

  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Facility Status Breakdown & Total Count
    const totalFacilities = await this.facilityModel.countDocuments().exec();
    const activeFacilities = await this.facilityModel.countDocuments({ status: FacilityStatus.ACTIVE }).exec();
    const inactiveFacilities = await this.facilityModel.countDocuments({ status: FacilityStatus.INACTIVE }).exec();
    const suspendedFacilities = await this.facilityModel.countDocuments({ status: FacilityStatus.SUSPENDED }).exec();

    // 2. Active Customers Total Count (across platform where status === ACTIVE)
    const totalActiveCustomers = await this.customerModel.countDocuments({ status: CustomerStatus.ACTIVE }).exec();

    // 3. Platform Revenue Aggregation (30 Days and Lifetime/6 Months)
    const rev30dResult = await this.bookingModel.aggregate([
      { $match: { startTime: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' }, totalBookings: { $sum: 1 } } },
    ]).exec();

    const revenue30Days = rev30dResult.length > 0 ? rev30dResult[0].total : 0;
    const bookings30Days = rev30dResult.length > 0 ? rev30dResult[0].totalBookings : 0;

    const totalBookings = await this.bookingModel.countDocuments().exec();

    const totalRevenueResult = await this.bookingModel.aggregate([
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]).exec();
    const totalRevenueAllTime = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    // 4. Booking Source Breakdown (WEB, PORTAL, BOT)
    const sourceBreakdownResult = await this.bookingModel.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]).exec();

    const sourceBreakdown = {
      web: 0,
      portal: 0,
      bot: 0,
    };
    sourceBreakdownResult.forEach((item) => {
      if (item._id && sourceBreakdown.hasOwnProperty(item._id)) {
        sourceBreakdown[item._id as keyof typeof sourceBreakdown] = item.count;
      }
    });

    // 5. Platform-wide Bookings Payment Status Breakdown (fully_paid, partially_paid, unpaid)
    const paymentBreakdownResult = await this.bookingModel.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          revenue: { $sum: '$amountPaid' },
        },
      },
    ]).exec();

    const paymentBreakdown = {
      fully_paid: { count: 0, revenue: 0 },
      partially_paid: { count: 0, revenue: 0 },
      unpaid: { count: 0, revenue: 0 },
    };
    paymentBreakdownResult.forEach((item) => {
      if (item._id && paymentBreakdown.hasOwnProperty(item._id)) {
        paymentBreakdown[item._id as keyof typeof paymentBreakdown] = {
          count: item.count,
          revenue: item.revenue || 0,
        };
      }
    });

    // 6. Month-over-Month Revenue Trend (Last 6 Months)
    const monthlyRevenueResult = await this.bookingModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
          },
          revenue: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]).exec();

    const revenueTrend = monthlyRevenueResult.map((item) => {
      const year = item._id.year;
      const month = String(item._id.month).padStart(2, '0');
      return {
        month: `${year}-${month}`,
        revenue: item.revenue,
        bookings: item.count,
      };
    });

    // 7. Booking-Rule Adoption Metric (CRITICAL SPEC METRIC)
    // Count of facilities that have each rule key enabled
    const ruleKeys = [
      'cash_only',
      'advance_payment_required',
      'cancellation_window_hours',
      'min_slot_duration',
    ];

    const ruleAdoptionPromises = ruleKeys.map(async (key) => {
      const enabledCount = await this.bookingRuleModel.countDocuments({
        key,
        isEnabled: true,
      }).exec();
      return {
        key,
        enabledCount,
        totalFacilities,
        percentage: totalFacilities > 0 ? Math.round((enabledCount / totalFacilities) * 100) : 0,
      };
    });

    const ruleAdoption = await Promise.all(ruleAdoptionPromises);

    // 8. Discount Type Adoption Metric
    const discountTypesResult = await this.discountModel.aggregate([
      {
        $group: {
          _id: '$type',
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalUsed: { $sum: '$timesUsed' },
        },
      },
    ]).exec();

    const discountAdoption = discountTypesResult.map((item) => ({
      type: item._id,
      activeCount: item.activeCount,
      totalTimesUsed: item.totalUsed,
    }));

    return {
      kpis: {
        totalFacilities,
        activeFacilities,
        inactiveFacilities,
        suspendedFacilities,
        totalActiveCustomers,
        revenue30Days,
        bookings30Days,
        totalBookings,
        totalRevenueAllTime,
      },
      sourceBreakdown,
      paymentBreakdown,
      revenueTrend,
      ruleAdoption,
      discountAdoption,
    };
  }
}
