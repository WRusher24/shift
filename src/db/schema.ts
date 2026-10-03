import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Workers — factory employees with a UNIQUE profile emoji             */
/* ------------------------------------------------------------------ */
export const workers = pgTable(
  "workers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // free text: Hebrew / Arabic / English
    employeeId: text("employee_id").notNull().unique(),
    emoji: text("emoji").notNull().unique(), // globally unique across workers
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workers_active_idx").on(t.active)],
);

/* ------------------------------------------------------------------ */
/* Products — SKUs with predefined pallet sizes + point multiplier     */
/* ------------------------------------------------------------------ */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // free text: Hebrew / Arabic / English
  size: text("size").notNull(), // bottle / gallon size label, e.g. '1L' or '1 ל"מ'
  unitsPerCarton: integer("units_per_carton").notNull().default(12),
  palletOptions: jsonb("pallet_options").$type<number[]>().notNull(),
  pointValue: doublePrecision("point_value").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Races — leaderboard competitions with reset semantics               */
/* ------------------------------------------------------------------ */
export const races = pgTable(
  "races",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    prize: text("prize"), // optional prize description
    minHours: doublePrecision("min_hours").notNull().default(30), // qualification threshold
    isActive: boolean("is_active").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("races_active_idx").on(t.isActive)],
);

/* ------------------------------------------------------------------ */
/* Batches — one active batch activity per filling line                */
/* ------------------------------------------------------------------ */
export const batches = pgTable(
  "batches",
  {
    id: serial("id").primaryKey(),
    line: text("line").notNull(), // 'A' | 'B'
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    raceId: integer("race_id").references(() => races.id), // race at creation time (may be null)
    status: text("status").notNull().default("active"), // active | paused | completed
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("batches_status_idx").on(t.status),
    index("batches_race_idx").on(t.raceId),
    index("batches_line_idx").on(t.line),
  ],
);

/* ------------------------------------------------------------------ */
/* Batch members — membership intervals (supports mid-batch changes)   */
/* ------------------------------------------------------------------ */
export const batchMembers = pgTable(
  "batch_members",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }), // null => currently active
  },
  (t) => [
    index("batch_members_batch_idx").on(t.batchId),
    index("batch_members_worker_idx").on(t.workerId),
  ],
);

/* ------------------------------------------------------------------ */
/* Pauses — downtime intervals with preset reasons                     */
/* ------------------------------------------------------------------ */
export const pauses = pgTable(
  "pauses",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(), // preset label (Hebrew) or free text
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("pauses_batch_idx").on(t.batchId)],
);

/* ------------------------------------------------------------------ */
/* Pallets — logged pallets: cartons × pointValue = total points       */
/* ------------------------------------------------------------------ */
export const pallets = pgTable(
  "pallets",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    cartons: integer("cartons").notNull(),
    points: doublePrecision("points").notNull(), // cartons × product multiplier at log time
    memberCount: integer("member_count").notNull(), // active team size at log time
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pallets_batch_idx").on(t.batchId)],
);

/* ------------------------------------------------------------------ */
/* Pallet shares — exact point attribution per worker per pallet       */
/* ------------------------------------------------------------------ */
export const palletShares = pgTable(
  "pallet_shares",
  {
    id: serial("id").primaryKey(),
    palletId: integer("pallet_id")
      .notNull()
      .references(() => pallets.id, { onDelete: "cascade" }),
    workerId: integer("worker_id")
      .notNull()
      .references(() => workers.id),
    points: doublePrecision("points").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pallet_shares_pallet_idx").on(t.palletId),
    index("pallet_shares_worker_idx").on(t.workerId),
  ],
);

/* Inferred row types */
export type Worker = typeof workers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Race = typeof races.$inferSelect;
export type Batch = typeof batches.$inferSelect;
export type BatchMember = typeof batchMembers.$inferSelect;
export type Pause = typeof pauses.$inferSelect;
export type Pallet = typeof pallets.$inferSelect;
export type PalletShare = typeof palletShares.$inferSelect;
