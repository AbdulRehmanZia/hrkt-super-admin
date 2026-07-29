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
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build match stage for filters
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

    // Only add $match if there are filters
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      // Lookup courts count for each facility
      {
        $lookup: {
          from: 'courts',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'courts',
        },
      },
      // Lookup active customers count
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
      // Lookup total revenue from bookings (sum of amountPaid)
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'bookings',
        },
      },
      // Shape the output — all counting happens in the DB, not in JS
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
          totalBookings: { $size: '$bookings' },
        },
      },
      // Sort by name
      { $sort: { name: 1 } },
    );

    // Get total count before pagination (for frontend pagination controls)
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.facilityModel.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Apply pagination
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
