/**
 * Centralized Billing & Subscription Configuration
 * 
 * Single source of truth for platform pricing:
 * - Monthly base fee per subscription plan (Starter, Pro, Enterprise)
 * - Usage-based fees (per active court, per completed booking)
 */

export const PLAN_BASE_FEES: Record<string, number> = {
  starter: 10000,   // PKR 10,000 / month
  pro: 15000,       // PKR 15,000 / month
  enterprise: 25000,// PKR 25,000 / month
};

export const BILLING_RATES = {
  PER_COURT_FEE: 1500,   // PKR 1,500 per court / month
  PER_BOOKING_FEE: 50,   // PKR 50 per completed booking
};
