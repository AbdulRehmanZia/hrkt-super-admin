import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true, lowercase: true, default: null })
  email: string;

  @Prop({
    type: String,
    enum: Object.values(CustomerStatus),
    default: CustomerStatus.ACTIVE,
    index: true,
  })
  status: CustomerStatus;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
