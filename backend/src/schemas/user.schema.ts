import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  FACILITY_ADMIN = 'facility_admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  COACH = 'coach',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Facility', index: true, default: null })
  facilityId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    required: true,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);
