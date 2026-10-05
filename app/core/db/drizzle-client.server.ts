import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { validateEnvironmentConfiguration } from "~/core/lib/app-environment.server";

validateEnvironmentConfiguration();

const client = postgres(process.env.DATABASE_URL!, { prepare: false });

const db = drizzle({ client });

export default db;
