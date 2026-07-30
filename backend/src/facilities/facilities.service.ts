import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';
import {
  Facility,
  FacilityDocument,
  FacilityStatus,
  User,
  UserDocument,
  UserRole,
  UserStatus,
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
} from '../schemas';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { PLAN_BASE_FEES } from '../config/billing.config';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async create(dto: CreateFacilityDto) {
    const cleanEmail = dto.adminEmail.toLowerCase().trim();
    const plan = dto.subscriptionPlan.toLowerCase().trim();
    const monthlyBaseFee = PLAN_BASE_FEES[plan] || PLAN_BASE_FEES['pro'];

    // Step 1: Check for email uniqueness collision before making changes
    const existingUser = await this.userModel.findOne({ email: cleanEmail }).exec();
    if (existingUser) {
      throw new ConflictException('A user with this email address already exists');
    }

    // Step 2: Create Facility document
    const facility = await this.facilityModel.create({
      name: dto.name.trim(),
      city: dto.city.trim(),
      courtLimit: dto.courtLimit,
      status: FacilityStatus.ACTIVE,
    });

    // Step 3: Generate a secure temporary password for the new admin user
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `HrktAdmin#${randomSuffix}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Step 4: Create first admin User associated with this facility
    const adminUser = await this.userModel.create({
      facilityId: facility._id,
      name: dto.adminName.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: UserRole.FACILITY_ADMIN,
      status: UserStatus.ACTIVE,
    });

    // Step 5: Auto-create initial 30-day Trial Subscription with selected plan fee
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await this.subscriptionModel.create({
      facilityId: facility._id,
      plan,
      status: SubscriptionStatus.TRIAL,
      monthlyBaseFee,
      startedAt: now,
      renewsAt: thirtyDaysLater,
    });

    // Step 6: Auto-create initial Invoice
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await this.invoiceModel.create({
      facilityId: facility._id,
      periodMonth: currentPeriod,
      amountDue: monthlyBaseFee,
      amountPaid: 0,
      dueDate: thirtyDaysLater,
      status: InvoiceStatus.DUE,
    });

    return {
      facility,
      admin: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        tempPassword, // Returned once so Super Admin can copy/share it
      },
    };
  }

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
          lifetimeBookings: { $size: '$bookings' },
          lastBookingDate: { $max: '$bookings.startTime' },
        },
      },
    );

    // Step 2: If subscriptionStatus filter is set, apply it AFTER $lookup
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
