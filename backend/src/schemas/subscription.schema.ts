import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, unique: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  plan: string;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Prop({ required: true, min: 0 })
  monthlyBaseFee: number;

  @Prop({ required: true, default: Date.now })
  startedAt: Date;

  @Prop({ required: true })
  renewsAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
