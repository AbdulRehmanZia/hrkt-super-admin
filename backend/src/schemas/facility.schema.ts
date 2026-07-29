import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacilityDocument = Facility & Document;

export enum FacilityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class Facility {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({
    type: String,
    enum: Object.values(FacilityStatus),
    default: FacilityStatus.ACTIVE,
  })
  status: FacilityStatus;

  @Prop({ required: true, default: 4, min: 1 })
  courtLimit: number;
}

export const FacilitySchema = SchemaFactory.createForClass(Facility);
