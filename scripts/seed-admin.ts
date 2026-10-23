import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const admin = await db.user.upsert({
    where: { email: "admin@solarai.com" },
    update: {},
    create: {
      name: "SolarAI Admin",
      email: "admin@solarai.com",
      password: await hashPassword("admin123"),
      role: "admin",
    },
  });
  console.log("Admin:", admin.email, "id:", admin.id);

  const demo = await db.user.upsert({
    where: { email: "demo@solarai.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@solarai.com",
      password: await hashPassword("demo123"),
      role: "user",
    },
  });
  console.log("Demo:", demo.email);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
