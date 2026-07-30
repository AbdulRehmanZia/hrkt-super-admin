import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Facility', required: true, index: true })
  facilityId: Types.ObjectId;

  @Prop({ required: true })
  performedBy: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  details: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
