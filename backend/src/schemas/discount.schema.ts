import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DiscountDocument = Discount & Document;

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  PROMO_CODE = 'promo_code',
}

@Schema({ timestamps: true })
export class Discount {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    required: true,
  })
  type: DiscountType;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0, min: 0 })
  timesUsed: number;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);
