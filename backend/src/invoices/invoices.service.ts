import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
  Facility,
  FacilityDocument,
  Subscription,
  SubscriptionDocument,
  Court,
  CourtDocument,
  Booking,
  BookingDocument,
  AuditLog,
  AuditLogDocument,
  User,
  UserDocument,
  UserRole,
} from '../schemas';
import { PLAN_BASE_FEES, BILLING_RATES } from '../config/billing.config';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Facility.name) private facilityModel: Model<FacilityDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Court.name) private courtModel: Model<CourtDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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

    const matchStage: any = {};
    if (query.status) {
      matchStage.status = query.status;
    }

    const now = new Date();

    const pipeline: any[] = [
      {
        $lookup: {
          from: 'facilities',
          localField: 'facilityId',
          foreignField: '_id',
          as: 'facility',
        },
      },
      { $unwind: '$facility' },
      {
        $addFields: {
          status: {
            $cond: {
              if: { $gte: ['$amountPaid', '$amountDue'] },
              then: 'paid',
              else: {
                $cond: {
                  if: { $lt: ['$dueDate', now] },
                  then: 'overdue',
                  else: 'due',
                },
              },
            },
          },
        },
      },
    ];

    if (query.search) {
      pipeline.push({
        $match: {
          $or: [
            { 'facility.name': { $regex: query.search, $options: 'i' } },
            { 'facility.city': { $regex: query.search, $options: 'i' } },
            { periodMonth: { $regex: query.search, $options: 'i' } },
          ],
        },
      });
    }

    if (query.status) {
      pipeline.push({ $match: { status: query.status } });
    }

    pipeline.push({ $sort: { periodMonth: -1, createdAt: -1 } });

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.invoiceModel.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip }, { $limit: limit });

    const invoices = await this.invoiceModel.aggregate(pipeline).exec();

    // Summary totals for platform billing header dynamically computed
    const statsResult = await this.invoiceModel.aggregate([
      {
        $addFields: {
          computedStatus: {
            $cond: {
              if: { $gte: ['$amountPaid', '$amountDue'] },
              then: 'paid',
              else: {
                $cond: {
                  if: { $lt: ['$dueDate', now] },
                  then: 'overdue',
                  else: 'due',
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$computedStatus',
          count: { $sum: 1 },
          totalAmountDue: { $sum: '$amountDue' },
          totalAmountPaid: { $sum: '$amountPaid' },
        },
      },
    ]).exec();

    const summary = {
      totalOverdueRevenue: 0,
      totalPaidRevenue: 0,
      overdueCount: 0,
      dueCount: 0,
      paidCount: 0,
    };

    statsResult.forEach((item) => {
      if (item._id === InvoiceStatus.OVERDUE) {
        summary.totalOverdueRevenue += item.totalAmountDue - item.totalAmountPaid;
        summary.overdueCount = item.count;
      } else if (item._id === InvoiceStatus.PAID) {
        summary.totalPaidRevenue += item.totalAmountPaid;
        summary.paidCount = item.count;
      } else if (item._id === InvoiceStatus.DUE) {
        summary.dueCount = item.count;
      }
    });

    return {
      data: invoices,
      summary,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Itemized Payment Breakdown Formula Calculation (P1)
  async getBreakdown(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid invoice ID');
    }
    const invoiceId = new Types.ObjectId(id);

    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate('facilityId', 'name city status courtLimit')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const facilityId = (invoice.facilityId as any)?._id || invoice.facilityId;
    const facility = await this.facilityModel.findById(facilityId).exec();
    const facilityName = facility ? facility.name : 'Facility Venue';

    const subscription = await this.subscriptionModel.findOne({ facilityId }).exec();
    const courtCount = await this.courtModel.countDocuments({ facilityId }).exec();

    // Calculate bookings in periodMonth (e.g. '2026-07')
    const [yearStr, monthStr] = invoice.periodMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const monthlyBookingsCount = await this.bookingModel
      .countDocuments({
        facilityId,
        startTime: { $gte: startDate, $lt: endDate },
      })
      .exec();

    const plan = subscription ? subscription.plan : 'pro';
    const monthlyBaseFee = subscription
      ? subscription.monthlyBaseFee
      : PLAN_BASE_FEES[plan] || PLAN_BASE_FEES['pro'];

    const perCourtFee = BILLING_RATES.PER_COURT_FEE;
    const totalCourtFee = courtCount * perCourtFee;

    const perBookingFee = BILLING_RATES.PER_BOOKING_FEE;
    const totalBookingFee = monthlyBookingsCount * perBookingFee;

    const totalCalculated = monthlyBaseFee + totalCourtFee + totalBookingFee;

    return {
      facilityName,
      facility: facility
        ? {
            _id: facility._id,
            name: facility.name,
            city: facility.city,
            status: facility.status,
          }
        : null,
      invoice: {
        ...invoice.toObject(),
        facility: facility
          ? {
              _id: facility._id,
              name: facility.name,
              city: facility.city,
              status: facility.status,
            }
          : undefined,
      },
      subscriptionPlan: plan,
      itemized: {
        monthlyBaseFee: {
          plan,
          amount: monthlyBaseFee,
        },
        courtUsage: {
          courtCount,
          ratePerCourt: perCourtFee,
          amount: totalCourtFee,
        },
        bookingUsage: {
          bookingsCount: monthlyBookingsCount,
          ratePerBooking: perBookingFee,
          amount: totalBookingFee,
        },
        totalCalculated,
        invoiceAmountDue: invoice.amountDue,
      },
    };
  }

  // 24-Hour Reminder Cooldown Requirement (P1)
  async sendReminder(id: string, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid invoice ID');
    }
    const invoiceId = new Types.ObjectId(id);

    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate('facilityId', 'name')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const now = new Date();
    if (invoice.lastReminderSentAt) {
      const msDiff = now.getTime() - invoice.lastReminderSentAt.getTime();
      const hoursDiff = msDiff / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        const remainingHours = Math.ceil(24 - hoursDiff);
        throw new BadRequestException(
          `Reminder cooldown active. A payment reminder was already sent to this facility within the last 24 hours. Please wait ${remainingHours} more hour(s).`,
        );
      }
    }

    invoice.lastReminderSentAt = now;
    await invoice.save();

    const facilityObj = invoice.facilityId as any;
    const facilityAdmin = await this.userModel
      .findOne({ facilityId: facilityObj._id, role: UserRole.FACILITY_ADMIN })
      .exec();
    const adminEmail = facilityAdmin
      ? facilityAdmin.email
      : `admin@${facilityObj.name?.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    console.log(
      `[REMINDER SENT] Payment reminder for Invoice #${invoice._id.toString().slice(-6)} (Period: ${invoice.periodMonth}, Amount Due: PKR ${invoice.amountDue.toLocaleString()}) sent to facility "${facilityObj.name}" (${adminEmail}) by Super Admin "${superAdminEmail}" at ${now.toISOString()}`,
    );

    await this.auditLogModel.create({
      facilityId: invoice.facilityId._id,
      performedBy: superAdminEmail,
      action: 'PAYMENT_REMINDER_SENT',
      details: `Sent payment reminder for invoice #${invoice._id.toString().slice(-6)} (Period: ${invoice.periodMonth}, Due: ${invoice.dueDate.toLocaleDateString()})`,
    });

    return {
      message: 'Payment reminder sent successfully',
      lastReminderSentAt: invoice.lastReminderSentAt,
    };
  }

  // Mark Overdue Invoice as Paid (P1)
  async markAsPaid(id: string, superAdminEmail: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid invoice ID');
    }
    const invoiceId = new Types.ObjectId(id);

    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate('facilityId', 'name')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.amountPaid = invoice.amountDue;
    await invoice.save();

    await this.auditLogModel.create({
      facilityId: invoice.facilityId._id,
      performedBy: superAdminEmail,
      action: 'INVOICE_MARKED_PAID',
      details: `Marked invoice #${invoice._id.toString().slice(-6)} as PAID (Amount: PKR ${invoice.amountDue.toLocaleString()})`,
    });

    return invoice;
  }
}
