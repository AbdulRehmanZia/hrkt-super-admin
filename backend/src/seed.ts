import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  FacilityStatus,
  UserRole,
  UserStatus,
  CustomerStatus,
  PaymentStatus,
  BookingSource,
  BookingStatus,
  DiscountType,
  SubscriptionStatus,
  InvoiceStatus,
} from './schemas';
import { PLAN_BASE_FEES, BILLING_RATES } from './config/billing.config';

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hrkt-admin';
  const conn = await mongoose.connect(mongoUri);
  const db = (conn.connection as any).db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  console.log('Clearing existing collections...');
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Seed Super Admin User
  console.log('Seeding Super Admin...');
  await db.collection('users').insertOne({
    facilityId: null,
    name: 'Super Admin',
    email: 'admin@hrkt.io',
    password: hashedPassword,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 2. Facilities Data Definition (Realistic distribution across Starter, Pro, Enterprise)
  const facilityConfigs = [
    { name: 'Smash Padel Club', city: 'Lahore', status: FacilityStatus.ACTIVE, courtLimit: 6, plan: 'pro' },
    { name: 'Futsal Arena Central', city: 'Karachi', status: FacilityStatus.ACTIVE, courtLimit: 4, plan: 'starter' },
    { name: 'Tennis Hub Capital', city: 'Islamabad', status: FacilityStatus.ACTIVE, courtLimit: 8, plan: 'enterprise' },
    { name: 'Padel Prime West', city: 'Rawalpindi', status: FacilityStatus.ACTIVE, courtLimit: 5, plan: 'pro' },
    { name: 'Apex Sports Complex', city: 'Multan', status: FacilityStatus.ACTIVE, courtLimit: 4, plan: 'starter' },
    { name: 'Velocity Padel Court', city: 'Faisalabad', status: FacilityStatus.SUSPENDED, courtLimit: 3, plan: 'starter' },
    { name: 'Legends Cricket Net', city: 'Peshawar', status: FacilityStatus.ACTIVE, courtLimit: 5, plan: 'pro' },
    { name: 'Urban Futsal Park', city: 'Sialkot', status: FacilityStatus.INACTIVE, courtLimit: 4, plan: 'starter' },
    { name: 'Metro Padel Arena', city: 'Gujranwala', status: FacilityStatus.ACTIVE, courtLimit: 6, plan: 'pro' },
    { name: 'Elite Sports Club', city: 'Quetta', status: FacilityStatus.ACTIVE, courtLimit: 4, plan: 'starter' },
  ];

  console.log('Seeding Facilities, Courts, Users, Rules, Discounts, Subscriptions & Invoices...');

  const now = new Date();
  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];

  for (let idx = 0; idx < facilityConfigs.length; idx++) {
    const cfg = facilityConfigs[idx];

    // Create Facility
    const facilityRes = await db.collection('facilities').insertOne({
      name: cfg.name,
      city: cfg.city,
      status: cfg.status,
      courtLimit: cfg.courtLimit,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date(),
    });
    const facilityId = facilityRes.insertedId;

    // Create Facility Admin User
    const adminEmail = `admin@${cfg.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    await db.collection('users').insertOne({
      facilityId,
      name: `${cfg.name} Admin`,
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.FACILITY_ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date(),
    });

    // Create Courts (e.g. 3 to 6 courts per facility)
    const numCourts = Math.min(cfg.courtLimit, (idx % 3) + 3);
    const courtIds: mongoose.Types.ObjectId[] = [];

    for (let c = 1; c <= numCourts; c++) {
      const sport = idx % 2 === 0 ? 'Padel' : idx % 3 === 0 ? 'Futsal' : 'Tennis';
      const courtRes = await db.collection('courts').insertOne({
        facilityId,
        name: `Court ${c}`,
        sport,
        hourlyRate: 2500 + c * 500,
        isActive: true,
        createdAt: new Date('2026-01-16T00:00:00Z'),
        updatedAt: new Date(),
      });
      courtIds.push(courtRes.insertedId as any);
    }

    // Create Booking Rules for Facility
    await db.collection('bookingrules').insertMany([
      { facilityId, key: 'cash_only', value: idx % 2 === 0 ? 'true' : 'false', isEnabled: true, createdAt: new Date() },
      { facilityId, key: 'advance_payment_required', value: idx % 3 === 0 ? 'true' : 'false', isEnabled: true, createdAt: new Date() },
      { facilityId, key: 'cancellation_window_hours', value: '24', isEnabled: true, createdAt: new Date() },
      { facilityId, key: 'min_slot_duration', value: '60', isEnabled: true, createdAt: new Date() },
    ]);

    // Create Discounts for Facility
    await db.collection('discounts').insertMany([
      { facilityId, name: 'Weekend Special', type: DiscountType.PERCENTAGE, value: 15, isActive: true, timesUsed: 42, createdAt: new Date() },
      { facilityId, name: 'Flat Morning Off', type: DiscountType.FIXED, value: 500, isActive: true, timesUsed: 18, createdAt: new Date() },
      { facilityId, name: 'PROMO2026', type: DiscountType.PROMO_CODE, value: 20, isActive: idx % 2 === 0, timesUsed: 25, createdAt: new Date() },
    ]);

    // Create Subscription
    const monthlyBaseFee = PLAN_BASE_FEES[cfg.plan] || PLAN_BASE_FEES['pro'];
    const subStatus = cfg.status === FacilityStatus.SUSPENDED ? SubscriptionStatus.PAST_DUE : SubscriptionStatus.ACTIVE;
    await db.collection('subscriptions').insertOne({
      facilityId,
      plan: cfg.plan,
      status: subStatus,
      monthlyBaseFee,
      startedAt: new Date('2026-01-15T00:00:00Z'),
      renewsAt: new Date('2026-08-15T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create Historical Invoices (6 months)
    for (const m of months) {
      const isPast = m < '2026-07';
      const invStatus = isPast ? InvoiceStatus.PAID : cfg.status === FacilityStatus.SUSPENDED ? InvoiceStatus.OVERDUE : InvoiceStatus.DUE;
      const amountDue = monthlyBaseFee + numCourts * BILLING_RATES.PER_COURT_FEE;
      await db.collection('invoices').insertOne({
        facilityId,
        periodMonth: m,
        amountDue,
        amountPaid: invStatus === InvoiceStatus.PAID ? amountDue : 0,
        dueDate: new Date(`${m}-28T00:00:00Z`),
        status: invStatus,
        lastReminderSentAt: invStatus === InvoiceStatus.OVERDUE ? new Date('2026-07-25T10:00:00Z') : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create Customers for Facility (~35 customers per facility = 350 total)
    const customerIds: mongoose.Types.ObjectId[] = [];
    for (let cust = 1; cust <= 35; cust++) {
      const custRes = await db.collection('customers').insertOne({
        facilityId,
        name: `Customer ${idx + 1}-${cust}`,
        phone: `+92-300-${1000000 + idx * 1000 + cust}`,
        email: `cust${idx + 1}_${cust}@gmail.com`,
        status: CustomerStatus.ACTIVE,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        updatedAt: new Date(),
      });
      customerIds.push(custRes.insertedId as any);
    }

    // Create Bookings spread over the last 6 months (~85 bookings per facility = 850 total)
    // Avoid seeding bookings for never-booked facility (e.g. facility index 7 - Urban Futsal Park) to test edge case requirement!
    if (cfg.name === 'Urban Futsal Park') {
      console.log(`Skipping bookings for "${cfg.name}" to satisfy "never taken a booking" edge case testing.`);
      continue;
    }

    // Dynamic booking count per facility for realistic data variation across the platform
    // Small facilities get ~45-60 bookings, large facilities get ~90-130 bookings
    const totalBookingsToSeed = 45 + (idx * 13) % 85;

    for (let b = 0; b < totalBookingsToSeed; b++) {
      const courtId = courtIds[b % courtIds.length];
      const customerId = customerIds[b % customerIds.length];

      // Random date between Feb 1, 2026 and July 28, 2026
      const randomDaysAgo = Math.floor(Math.random() * 175);
      const startTime = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hr booking

      // Vary rates: 2500 - 4500 PKR depending on court and index
      const totalAmount = 2500 + ((b + idx) % 5) * 500;
      const paymentStatus =
        (b + idx) % 6 === 0
          ? PaymentStatus.UNPAID
          : (b + idx) % 8 === 0
          ? PaymentStatus.PARTIALLY_PAID
          : PaymentStatus.FULLY_PAID;

      const amountPaid =
        paymentStatus === PaymentStatus.FULLY_PAID
          ? totalAmount
          : paymentStatus === PaymentStatus.PARTIALLY_PAID
          ? Math.round(totalAmount / 2)
          : 0;

      const randVal = Math.random();
      const source =
        randVal < 0.46
          ? BookingSource.WEB
          : randVal < 0.82
          ? BookingSource.PORTAL
          : BookingSource.BOT;

      const status =
        (b + idx) % 9 === 0
          ? BookingStatus.CANCELLED
          : randomDaysAgo > 1
          ? BookingStatus.COMPLETED
          : BookingStatus.CONFIRMED;

      await db.collection('bookings').insertOne({
        facilityId,
        courtId,
        customerId,
        startTime,
        endTime,
        totalAmount,
        amountPaid,
        paymentStatus,
        source,
        status,
        createdAt: startTime,
        updatedAt: startTime,
      });
    }
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
