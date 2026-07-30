import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  FacilityStatus,
  UserRole,
  UserStatus,
  CustomerStatus,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentStatus,
  BookingStatus,
  BookingSource,
  DiscountType,
} from './schemas';
import { PLAN_BASE_FEES, BILLING_RATES } from './config/billing.config';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrkt-admin';

const facilityConfigs = [
  { name: 'Apex Sports Complex', city: 'Multan', courts: 4, plan: 'starter', status: FacilityStatus.ACTIVE },
  { name: 'Elite Padel Arena', city: 'Karachi', courts: 6, plan: 'pro', status: FacilityStatus.ACTIVE },
  { name: 'Futsal Mania Gulberg', city: 'Lahore', courts: 3, plan: 'starter', status: FacilityStatus.ACTIVE },
  { name: 'Legends Sports Club', city: 'Islamabad', courts: 8, plan: 'enterprise', status: FacilityStatus.ACTIVE },
  { name: 'Metro Badminton Hub', city: 'Rawalpindi', courts: 5, plan: 'pro', status: FacilityStatus.ACTIVE },
  { name: 'Padel Prime DHA', city: 'Karachi', courts: 4, plan: 'pro', status: FacilityStatus.ACTIVE },
  { name: 'Smash Tennis Center', city: 'Peshawar', courts: 6, plan: 'starter', status: FacilityStatus.ACTIVE },
  { name: 'Urban Futsal Park', city: 'Faisalabad', courts: 2, plan: 'starter', status: FacilityStatus.INACTIVE },
  { name: 'Velocity Turf & Courts', city: 'Sialkot', courts: 4, plan: 'pro', status: FacilityStatus.ACTIVE },
  { name: 'Zone Arena Johar', city: 'Karachi', courts: 5, plan: 'starter', status: FacilityStatus.SUSPENDED },
];

const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];

async function seed() {
  console.log('Connecting to MongoDB...');
  const conn = await mongoose.connect(MONGO_URI);
  const db = conn.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  console.log('Clearing existing collections...');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }

  console.log('Seeding Super Admin...');
  const hashedSuperAdminPassword = await bcrypt.hash('password123', 10);
  await db.collection('users').insertOne({
    name: 'Super Admin',
    email: 'admin@hrkt.io',
    password: hashedSuperAdminPassword,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date(),
  });

  console.log('Seeding Facilities, Courts, Users, Rules, Discounts, Subscriptions & Invoices...');

  const now = new Date();

  for (let idx = 0; idx < facilityConfigs.length; idx++) {
    const cfg = facilityConfigs[idx];

    // 1. Create Facility
    const facRes = await db.collection('facilities').insertOne({
      name: cfg.name,
      city: cfg.city,
      courtLimit: cfg.courts + 2,
      status: cfg.status,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date(),
    });
    const facilityId = facRes.insertedId;

    // 2. Create Courts for Facility
    const courtIds: mongoose.Types.ObjectId[] = [];
    const sports = ['Futsal', 'Padel', 'Tennis', 'Badminton'];
    const numCourts = cfg.courts;

    for (let c = 1; c <= numCourts; c++) {
      const sport = sports[(c + idx) % sports.length];
      const courtRes = await db.collection('courts').insertOne({
        facilityId,
        name: `Court ${c} (${sport})`,
        sport,
        hourlyRate: 2500 + c * 500,
        isActive: true,
        createdAt: new Date('2026-01-15T00:00:00Z'),
        updatedAt: new Date(),
      });
      courtIds.push(courtRes.insertedId as any);
    }

    // 3. Create Facility Admin User
    const adminEmail = `admin@${cfg.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const hashedAdminPassword = await bcrypt.hash('password123', 10);
    await db.collection('users').insertOne({
      facilityId,
      name: `${cfg.name} Admin`,
      email: adminEmail,
      password: hashedAdminPassword,
      role: UserRole.FACILITY_ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-15T00:00:00Z'),
      updatedAt: new Date(),
    });

    // 4. Create Booking Rules for Facility
    const rules = [
      { key: 'cash_only', value: 'true', isEnabled: idx % 2 === 0 },
      { key: 'advance_payment_required', value: '50%', isEnabled: true },
      { key: 'cancellation_window_hours', value: '24', isEnabled: true },
      { key: 'min_slot_duration', value: '60', isEnabled: true },
    ];
    for (const r of rules) {
      await db.collection('bookingrules').insertOne({
        facilityId,
        key: r.key,
        value: r.value,
        isEnabled: r.isEnabled,
        createdAt: new Date('2026-01-15T00:00:00Z'),
        updatedAt: new Date(),
      });
    }

    // 5. Create Discounts for Facility
    const discounts = [
      { name: 'Early Bird 15%', type: DiscountType.PERCENTAGE, value: 15, isActive: true, timesUsed: 25 + idx * 5 },
      { name: 'Flat Off 500 PKR', type: DiscountType.FIXED, value: 500, isActive: true, timesUsed: 10 + idx * 2 },
      { name: 'SUMMER2026 Promo', type: DiscountType.PROMO_CODE, value: 20, isActive: idx % 3 !== 0, timesUsed: 15 + idx * 3 },
    ];
    for (const d of discounts) {
      await db.collection('discounts').insertOne({
        facilityId,
        name: d.name,
        type: d.type,
        value: d.value,
        isActive: d.isActive,
        timesUsed: d.timesUsed,
        createdAt: new Date('2026-01-15T00:00:00Z'),
        updatedAt: new Date(),
      });
    }

    // 6. Create Subscription for Facility
    const subStatus = cfg.status === FacilityStatus.SUSPENDED ? SubscriptionStatus.PAST_DUE : SubscriptionStatus.ACTIVE;
    const monthlyBaseFee = PLAN_BASE_FEES[cfg.plan] || PLAN_BASE_FEES['pro'];

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

    // 7. Create Customers for Facility
    const customerIds: mongoose.Types.ObjectId[] = [];
    for (let cust = 1; cust <= 35; cust++) {
      const customerDaysAgo = Math.floor(Math.random() * 160);
      const custCreatedAt = new Date(now.getTime() - customerDaysAgo * 24 * 60 * 60 * 1000);

      const custRes = await db.collection('customers').insertOne({
        facilityId,
        name: `Customer ${idx + 1}-${cust}`,
        phone: `+92-300-${1000000 + idx * 1000 + cust}`,
        email: `cust${idx + 1}_${cust}@gmail.com`,
        status: CustomerStatus.ACTIVE,
        createdAt: custCreatedAt,
        updatedAt: new Date(),
      });
      customerIds.push(custRes.insertedId as any);
    }

    // 8. Create Bookings & track monthly count per month
    const monthlyBookingCounts: Record<string, number> = {
      '2026-02': 0,
      '2026-03': 0,
      '2026-04': 0,
      '2026-05': 0,
      '2026-06': 0,
      '2026-07': 0,
    };

    if (cfg.name === 'Urban Futsal Park') {
      console.log(`Skipping bookings for "${cfg.name}" to satisfy "never taken a booking" edge case testing.`);
    } else {
      const totalBookingsToSeed = 45 + (idx * 13) % 85;

      for (let b = 0; b < totalBookingsToSeed; b++) {
        const courtId = courtIds[b % courtIds.length];
        const customerId = customerIds[b % customerIds.length];

        const randomDaysAgo = Math.floor(Math.random() * 175);
        const bookingDate = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
        const randomHour = 8 + Math.floor(Math.random() * 14);
        const randomMinute = Math.random() < 0.5 ? 0 : 30;
        bookingDate.setHours(randomHour, randomMinute, 0, 0);

        const startTime = bookingDate;
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        // Record month for invoice total calculation
        const mKey = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyBookingCounts.hasOwnProperty(mKey)) {
          monthlyBookingCounts[mKey]++;
        }

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

    // 9. Create Historical Invoices (6 months) with EXACT formula: Base Fee + Court Usage + Booking Usage
    for (const m of months) {
      const isPast = m < '2026-07';
      const invStatus = isPast ? InvoiceStatus.PAID : cfg.status === FacilityStatus.SUSPENDED ? InvoiceStatus.OVERDUE : InvoiceStatus.DUE;
      const bCount = monthlyBookingCounts[m] || 0;
      const amountDue = monthlyBaseFee + numCourts * BILLING_RATES.PER_COURT_FEE + bCount * BILLING_RATES.PER_BOOKING_FEE;

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
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
