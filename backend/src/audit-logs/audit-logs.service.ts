import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async findAll(query: { page?: number; limit?: number; search?: string; action?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $lookup: {
          from: 'facilities',
          localField: 'facilityId',
          foreignField: '_id',
          as: 'facility',
        },
      },
      {
        $unwind: {
          path: '$facility',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const matchStage: any = {};
    if (query.action) {
      matchStage.action = query.action;
    }

    if (query.search) {
      matchStage.$or = [
        { 'facility.name': { $regex: query.search, $options: 'i' } },
        { performedBy: { $regex: query.search, $options: 'i' } },
        { details: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.auditLogModel.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $skip: skip }, { $limit: limit });

    const data = await this.auditLogModel.aggregate(pipeline).exec();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
