import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Facility,
  FacilitySchema,
  Court,
  CourtSchema,
  User,
  UserSchema,
  Customer,
  CustomerSchema,
  Booking,
  BookingSchema,
  BookingRule,
  BookingRuleSchema,
  Discount,
  DiscountSchema,
  Subscription,
  SubscriptionSchema,
  Invoice,
  InvoiceSchema,
  AuditLog,
  AuditLogSchema,
} from './index';

const featureSchemas = MongooseModule.forFeature([
  { name: Facility.name, schema: FacilitySchema },
  { name: Court.name, schema: CourtSchema },
  { name: User.name, schema: UserSchema },
  { name: Customer.name, schema: CustomerSchema },
  { name: Booking.name, schema: BookingSchema },
  { name: BookingRule.name, schema: BookingRuleSchema },
  { name: Discount.name, schema: DiscountSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: Invoice.name, schema: InvoiceSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
]);

@Module({
  imports: [featureSchemas],
  exports: [featureSchemas],
})
export class DatabaseSchemasModule {}
