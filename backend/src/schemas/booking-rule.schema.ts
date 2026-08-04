import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingRuleDocument = BookingRule & Document;

@Schema({ timestamps: true })
export class BookingRule {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  key: string; // e.g. 'cash_only', 'advance_payment_required', 'cancellation_window_hours', 'min_slot_duration'

  @Prop({ required: true, trim: true })
  value: string;

  @Prop({ default: true })
  isEnabled: boolean;
}

export const BookingRuleSchema = SchemaFactory.createForClass(BookingRule);

// Ensure unique rule key per facility
BookingRuleSchema.index({ facilityId: 1, key: 1 }, { unique: true });
BookingRuleSchema.index({ key: 1, isEnabled: 1 });
