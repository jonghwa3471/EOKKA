/**
 * Payment System Schema
 *
 * This file defines the database schema for payment records and sets up
 * Supabase Row Level Security (RLS) policies to control data access.
 * The schema is designed to work with payment processors like Toss Payments
 * (as indicated by the imports in package.json).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

import { makeIdentityColumn, timestamps } from "~/core/db/helpers.server";

/**
 * Payments Table
 *
 * Stores payment transaction records with details from the payment processor.
 * Links to Supabase auth.users table via user_id foreign key.
 *
 * Includes Row Level Security (RLS) policy to ensure users can only
 * view their own payment records.
 */
export const payments = pgTable(
  "payments",
  {
    // Auto-incrementing primary key for payment records
    ...makeIdentityColumn("payment_id"),
    // Payment processor's unique identifier for the transaction
    payment_key: text().notNull(),
    // Unique identifier for the order in your system
    order_id: text().notNull(),
    // Human-readable name for the order
    order_name: text().notNull(),
    // Total amount of the payment transaction
    total_amount: doublePrecision().notNull(),
    // Custom metadata about the payment (product details, etc.)
    metadata: jsonb().notNull(),
    // Complete raw response from the payment processor
    raw_data: jsonb().notNull(),
    // URL to the payment receipt provided by the processor
    receipt_url: text().notNull(),
    // Current status of the payment (e.g., "approved", "failed")
    status: text().notNull(),
    // Foreign key to the user who made the payment
    // Using CASCADE ensures payment records are deleted when user is deleted
    user_id: uuid().references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    // When the payment was approved by the processor
    approved_at: timestamp().notNull(),
    // When the payment was initially requested
    requested_at: timestamp().notNull(),
    // Adds created_at and updated_at timestamp columns
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_payment_key_unique").on(table.payment_key),
    uniqueIndex("payments_order_id_unique").on(table.order_id),
    // RLS Policy: Users can only view their own payment records
    pgPolicy("select-payment-policy", {
      for: "select",
      to: authenticatedRole,
      as: "permissive",
      using: sql`${authUid} = ${table.user_id}`,
    }),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    subscription_id: uuid().primaryKey().defaultRandom(),
    user_id: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    customer_key: text().notNull(),
    billing_key_ciphertext: text().notNull(),
    billing_key_iv: text().notNull(),
    billing_key_tag: text().notNull(),
    status: text().notNull().default("active"),
    cancel_at_period_end: boolean().notNull().default(false),
    current_period_end: timestamp({ withTimezone: true }).notNull(),
    last_charged_at: timestamp({ withTimezone: true }),
    card_company: text(),
    card_number: text(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("subscriptions_user_unique").on(table.user_id),
    uniqueIndex("subscriptions_customer_key_unique").on(table.customer_key),
    pgPolicy("select-own-subscription", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.user_id}`,
    }),
  ],
).enableRLS();
