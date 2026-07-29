import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

export enum PaymentStatus {
  FULLY_PAID = 'fully_paid',
  PARTIALLY_PAID = 'partially_paid',
  UNPAID = 'unpaid',
}

export enum BookingSource {
  WEB = 'web',
  PORTAL = 'portal',
  BOT = 'bot',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Court', required: true, index: true })
  courtId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: Object.values(BookingSource),
    required: true,
  })
  source: BookingSource;

  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Compound index for querying facility bookings chronologically
BookingSchema.index({ facilityId: 1, startTime: -1 });
