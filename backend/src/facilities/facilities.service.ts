import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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
  Court,
  CourtDocument,
  Customer,
  CustomerDocument,
  CustomerStatus,
  Booking,
  BookingDocument,
  BookingStatus,
  Discount,
  DiscountDocument,
  BookingRule,
  BookingRuleDocument,
  AuditLog,
  AuditLogDocument,
} from '../schemas';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { UpdateCourtLimitDto } from './dto/update-court-limit.dto';
import { UpdateAdminCredentialsDto } from './dto/update-admin-credentials.dto';
import { UpdateFacilityStatusDto } from './dto/update-facility-status.dto';
import { PLAN_BASE_FEES } from '../config/billing.config';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Court.name) private courtModel: Model<CourtDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Discount.name) private discountModel: Model<DiscountDocument>,
    @InjectModel(BookingRule.name) private bookingRuleModel: Model<BookingRuleDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
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
        tempPassword,
      },
    };
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid facility ID');
    }
    const facilityId = new Types.ObjectId(id);

    const facility = await this.facilityModel.findById(facilityId).exec();
    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    const courts = await this.courtModel.find({ facilityId }).exec();
    const users = await this.userModel
      .find({ facilityId }, 'name email role status createdAt')
      .exec();
    const subscription = await this.subscriptionModel.findOne({ facilityId }).exec();
    const latestInvoice = await this.invoiceModel
      .findOne({ facilityId })
      .sort({ periodMonth: -1 })
      .exec();
    const bookingRules = await this.bookingRuleModel.find({ facilityId }).exec();
    const discounts = await this.discountModel.find({ facilityId }).exec();
    const auditLogs = await this.auditLogModel.find({ facilityId }).sort({ createdAt: -1 }).limit(10).exec();

    // Group Users by Role (view-only requirement)
    const usersByRole = {
      facility_admin: users.filter((u) => u.role === UserRole.FACILITY_ADMIN),
      manager: users.filter((u) => u.role === UserRole.MANAGER),
      staff: users.filter((u) => u.role === UserRole.STAFF),
      coach: users.filter((u) => u.role === UserRole.COACH),
    };

    // Bookings breakdown by payment type (count AND revenue PKR — view-only requirement)
    const paymentBreakdownRaw = await this.bookingModel
      .aggregate([
        { $match: { facilityId } },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            revenue: { $sum: '$amountPaid' },
          },
        },
      ])
      .exec();

    const paymentBreakdown = {
      fully_paid: { count: 0, revenue: 0 },
      partially_paid: { count: 0, revenue: 0 },
      unpaid: { count: 0, revenue: 0 },
    };

    paymentBreakdownRaw.forEach((item) => {
      if (item._id && paymentBreakdown.hasOwnProperty(item._id)) {
        paymentBreakdown[item._id as keyof typeof paymentBreakdown] = {
          count: item.count,
          revenue: item.revenue,
        };
      }
    });

    // Per-facility aggregated stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const rev30dResult = await this.bookingModel
      .aggregate([
        { $match: { facilityId, startTime: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' }, totalBookings: { $sum: 1 } } },
      ])
      .exec();

    const totalRevResult = await this.bookingModel
      .aggregate([
        { $match: { facilityId } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ])
      .exec();

    const totalBookings = await this.bookingModel.countDocuments({ facilityId }).exec();
    const cancelledBookings = await this.bookingModel
      .countDocuments({ facilityId, status: BookingStatus.CANCELLED })
      .exec();
    const activeCustomers = await this.customerModel
      .countDocuments({ facilityId, status: CustomerStatus.ACTIVE })
      .exec();

    const sourceResult = await this.bookingModel
      .aggregate([
        { $match: { facilityId } },
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            revenue: { $sum: '$amountPaid' },
          },
        },
      ])
      .exec();

    const sourceBreakdown = {
      web: { count: 0, revenue: 0 },
      portal: { count: 0, revenue: 0 },
      bot: { count: 0, revenue: 0 },
    };
    sourceResult.forEach((item) => {
      if (item._id && sourceBreakdown.hasOwnProperty(item._id)) {
        sourceBreakdown[item._id as keyof typeof sourceBreakdown] = {
          count: item.count,
          revenue: item.revenue || 0,
        };
      }
    });

    return {
      facility,
      courts,
      usersByRole,
      subscription,
      latestInvoice,
      bookingRules,
      discounts,
      auditLogs,
      paymentBreakdown,
      stats: {
        revenue30Days: rev30dResult.length > 0 ? rev30dResult[0].total : 0,
        bookings30Days: rev30dResult.length > 0 ? rev30dResult[0].totalBookings : 0,
        totalRevenueAllTime: totalRevResult.length > 0 ? totalRevResult[0].total : 0,
        totalBookings,
        cancelledBookings,
        cancellationRate:
          totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
        activeCustomers,
        sourceBreakdown,
      },
    };
  }

  private async validateCourtLimit(facilityId: Types.ObjectId, newLimit: number): Promise<number> {
    const activeCourtsCount = await this.courtModel.countDocuments({ facilityId }).exec();
    if (newLimit < activeCourtsCount) {
      throw new BadRequestException(
        `Cannot set court limit to ${newLimit} because facility currently has ${activeCourtsCount} active courts configured`,
      );
    }
    return activeCourtsCount;
  }

  // General Facility Edit (Spec Section 4.3): Name, City, Court Limit
  async updateFacility(id: string, dto: UpdateFacilityDto, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid facility ID');
    const facilityId = new Types.ObjectId(id);

    const facility = await this.facilityModel.findById(facilityId).exec();
    if (!facility) throw new NotFoundException('Facility not found');

    if (dto.courtLimit !== undefined) {
      await this.validateCourtLimit(facilityId, dto.courtLimit);
      facility.courtLimit = dto.courtLimit;
    }

    if (dto.name) facility.name = dto.name;
    if (dto.city) facility.city = dto.city;

    await facility.save();

    await this.auditLogModel.create({
      facilityId,
      performedBy: superAdminEmail,
      action: 'FACILITY_INFO_UPDATE',
      details: `Updated facility details (Name: "${facility.name}", City: "${facility.city}", Court Limit: ${facility.courtLimit})`,
    });

    return facility;
  }

  // Control Action 1: Court Limit Change with Validation
  async updateCourtLimit(id: string, dto: UpdateCourtLimitDto, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid facility ID');
    const facilityId = new Types.ObjectId(id);

    const facility = await this.facilityModel.findById(facilityId).exec();
    if (!facility) throw new NotFoundException('Facility not found');

    await this.validateCourtLimit(facilityId, dto.courtLimit);

    const previousLimit = facility.courtLimit;
    facility.courtLimit = dto.courtLimit;
    await facility.save();

    await this.auditLogModel.create({
      facilityId,
      performedBy: superAdminEmail,
      action: 'COURT_LIMIT_CHANGE',
      details: `Updated court limit from ${previousLimit} to ${dto.courtLimit}`,
    });

    return facility;
  }

  // Control Action 2: Facility Admin Credentials Reset with Audit Log
  async updateAdminCredentials(id: string, dto: UpdateAdminCredentialsDto, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid facility ID');
    const facilityId = new Types.ObjectId(id);

    const facility = await this.facilityModel.findById(facilityId).exec();
    if (!facility) throw new NotFoundException('Facility not found');

    const adminUser = await this.userModel.findOne({ facilityId, role: UserRole.FACILITY_ADMIN }).exec();
    if (!adminUser) throw new NotFoundException('Facility Admin user not found');

    const cleanEmail = dto.email.toLowerCase().trim();
    if (cleanEmail !== adminUser.email) {
      const existingUser = await this.userModel.findOne({ email: cleanEmail }).exec();
      if (existingUser) {
        throw new ConflictException('A user with this email address already exists');
      }
      adminUser.email = cleanEmail;
    }

    let passwordChanged = false;
    if (dto.password && dto.password.trim().length > 0) {
      adminUser.password = await bcrypt.hash(dto.password.trim(), 10);
      passwordChanged = true;
    }

    await adminUser.save();

    await this.auditLogModel.create({
      facilityId,
      performedBy: superAdminEmail,
      action: 'ADMIN_CREDENTIALS_UPDATE',
      details: `Updated Admin credentials for ${adminUser.name} (${cleanEmail}). ${passwordChanged ? 'Password reset successfully.' : 'Email updated.'}`,
    });

    return {
      message: 'Admin credentials updated successfully',
      admin: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
      },
    };
  }

  // Control Action 3: Suspend / Reactivate Facility Status
  async updateStatus(id: string, dto: UpdateFacilityStatusDto, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid facility ID');
    const facilityId = new Types.ObjectId(id);

    const facility = await this.facilityModel.findById(facilityId).exec();
    if (!facility) throw new NotFoundException('Facility not found');

    const previousStatus = facility.status;
    facility.status = dto.status;
    await facility.save();

    await this.auditLogModel.create({
      facilityId,
      performedBy: superAdminEmail,
      action: 'STATUS_CHANGE',
      details: `Updated facility status from ${previousStatus.toUpperCase()} to ${dto.status.toUpperCase()}`,
    });

    return facility;
  }

  async findBookings(
    id: string,
    query: { page?: number; limit?: number; paymentStatus?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid facility ID');
    }
    const facilityId = new Types.ObjectId(id);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { facilityId };
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    const total = await this.bookingModel.countDocuments(filter).exec();
    const bookings = await this.bookingModel
      .find(filter)
      .populate('courtId', 'name sport')
      .populate('customerId', 'name phone email')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findCustomers(id: string, query: { page?: number; limit?: number; search?: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid facility ID');
    }
    const facilityId = new Types.ObjectId(id);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { facilityId };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const total = await this.customerModel.countDocuments(filter).exec();
    const customers = await this.customerModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data: customers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    subscriptionStatus?: string;
    search?: string;
    sortBy?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

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
      {
        $lookup: {
          from: 'courts',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'courts',
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'facilityId',
          pipeline: [{ $match: { status: 'active' } }],
          as: 'customers',
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'subscription',
        },
      },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'facilityId',
          as: 'bookings',
        },
      },
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

    if (query.subscriptionStatus) {
      pipeline.push({
        $match: { subscriptionStatus: query.subscriptionStatus },
      });
    }

    let sortStage: any = { name: 1 };
    if (query.sortBy === 'lifetimeBookings_desc' || query.sortBy === 'lifetimeBookings') {
      sortStage = { lifetimeBookings: -1, name: 1 };
    } else if (query.sortBy === 'lastBookingDate_desc' || query.sortBy === 'lastBookingDate') {
      sortStage = { lastBookingDate: -1, name: 1 };
    } else if (query.sortBy === 'revenue_desc' || query.sortBy === 'totalRevenue') {
      sortStage = { totalRevenue: -1, name: 1 };
    } else if (query.sortBy === 'name_asc' || query.sortBy === 'name') {
      sortStage = { name: 1 };
    }

    pipeline.push({ $sort: sortStage });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.facilityModel.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

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
