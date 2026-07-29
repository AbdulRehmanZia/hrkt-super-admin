import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourtDocument = Court & Document;

@Schema({ timestamps: true })
export class Court {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  sport: string;

  @Prop({ required: true, min: 0 })
  hourlyRate: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CourtSchema = SchemaFactory.createForClass(Court);
