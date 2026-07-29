import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  PAID = 'paid',
  DUE = 'due',
  OVERDUE = 'overdue',
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  periodMonth: string; // YYYY-MM e.g. "2026-07"

  @Prop({ required: true, min: 0 })
  amountDue: number;

  @Prop({ required: true, min: 0, default: 0 })
  amountPaid: number;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.DUE,
  })
  status: InvoiceStatus;

  @Prop({ default: null })
  lastReminderSentAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Compound index for unique invoice per facility and period
InvoiceSchema.index({ facilityId: 1, periodMonth: 1 }, { unique: true });
