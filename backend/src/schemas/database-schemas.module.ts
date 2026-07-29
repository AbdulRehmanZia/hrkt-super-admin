import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Facility,
  FacilitySchema,
  User,
  UserSchema,
  Court,
  CourtSchema,
  Customer,
  CustomerSchema,
  Booking,
  BookingSchema,
  Discount,
  DiscountSchema,
  BookingRule,
  BookingRuleSchema,
  Subscription,
  SubscriptionSchema,
  Invoice,
  InvoiceSchema,
} from './index';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Facility.name, schema: FacilitySchema },
      { name: User.name, schema: UserSchema },
      { name: Court.name, schema: CourtSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Discount.name, schema: DiscountSchema },
      { name: BookingRule.name, schema: BookingRuleSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseSchemasModule {}
