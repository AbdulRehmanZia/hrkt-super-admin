import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Facility, FacilityDocument } from '../schemas';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    subscriptionStatus?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Step 1: Match on facility-level fields only (status + search)
    const matchStage: any = {};
    if (query.status) {
      matchStage.status = query.status;
    }
    if (query.search) {
      matchStage.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { city: { $regex: query.search, $options: 'i' } },
      ];
    }

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      // Lookup courts count
      {
        $lookup: {
          from: 'courts',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'courts',
        },
      },
      // Lookup active customers only
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'facilityId',
          pipeline: [{ $match: { status: 'active' } }],
          as: 'customers',
        },
      },
      // Lookup subscription
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'subscription',
        },
      },
      // Lookup bookings for revenue, total count, and last booking date
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'bookings',
        },
      },
      // Shape the output — all computation inside MongoDB, not JS
      {
        $project: {
          name: 1,
          city: 1,
          status: 1,
          courtLimit: 1,
          createdAt: 1,
          courtCount: { $size: '$courts' },
          activeCustomers: { $size: '$customers' },
          subscriptionStatus: {
            $ifNull: [{ $arrayElemAt: ['$subscription.status', 0] }, 'none'],
          },
          subscriptionPlan: {
            $ifNull: [{ $arrayElemAt: ['$subscription.plan', 0] }, 'none'],
          },
          totalRevenue: { $sum: '$bookings.amountPaid' },
          // lifetimeBookings = total count of all bookings (not just this month)
          lifetimeBookings: { $size: '$bookings' },
          // lastBookingDate = the most recent startTime across all bookings
          // $max returns null if array is empty — frontend shows "Never" for null
          lastBookingDate: { $max: '$bookings.startTime' },
        },
      },
    );

    // Step 2: If subscriptionStatus filter is set, apply it AFTER $lookup
    // (subscription is a joined field — can't filter on it before $lookup)
    if (query.subscriptionStatus) {
      pipeline.push({
        $match: { subscriptionStatus: query.subscriptionStatus },
      });
    }

    // Default sort: name ascending
    pipeline.push({ $sort: { name: 1 } });

    // Get total count before applying pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.facilityModel.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Apply pagination at the end
    pipeline.push({ $skip: skip }, { $limit: limit });

    const facilities = await this.facilityModel.aggregate(pipeline).exec();

    return {
      data: facilities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
