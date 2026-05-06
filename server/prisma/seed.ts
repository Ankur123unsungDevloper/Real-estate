import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import fs from "fs";
import path from "path";

// ----------------------------------------------------------------
// Prisma v7 requires a driver adapter — new PrismaClient() alone
// no longer works. You must pass an adapter instance.
// ----------------------------------------------------------------
const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ----------------------------------------------------------------
// Helper Types
// ----------------------------------------------------------------

interface LocationData {
  id: number;
  country: string;
  city: string;
  state: string;
  address: string;
  postalCode: string;
  coordinates: string;
}

interface PrismaModel {
  deleteMany: () => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
}

// ----------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function getModel(modelNameCamel: string): PrismaModel | undefined {
  const candidate = prisma[modelNameCamel as keyof typeof prisma];
  if (candidate === null || candidate === undefined || typeof candidate !== "object") {
    return undefined;
  }
  const obj = candidate as Record<string, unknown>;
  if (
    typeof obj["deleteMany"] !== "function" ||
    typeof obj["findMany"] !== "function" ||
    typeof obj["create"] !== "function"
  ) {
    return undefined;
  }
  return candidate as unknown as PrismaModel;
}

// ----------------------------------------------------------------
// Database Operations
// ----------------------------------------------------------------

async function insertLocationData(locations: LocationData[]): Promise<void> {
  for (const location of locations) {
    const { id, country, city, state, address, postalCode, coordinates } = location;
    try {
      await prisma.$executeRaw`
        INSERT INTO "Location" ("id", "country", "city", "state", "address", "postalCode", "coordinates") 
        VALUES (${id}, ${country}, ${city}, ${state}, ${address}, ${postalCode}, ST_GeomFromText(${coordinates}, 4326));
      `;
      console.log(`Inserted location for ${city}`);
    } catch (error) {
      console.error(`Error inserting location for ${city}:`, error);
    }
  }
}

async function resetSequence(modelName: string): Promise<void> {
  const pascalName = toPascalCase(modelName);
  const camelName = toCamelCase(modelName);
  const quotedModelName = `"${pascalName}"`;

  const model = getModel(camelName);
  if (model === undefined) return;

  const maxIdResult = (await model.findMany({
    select: { id: true },
    orderBy: { id: "desc" },
    take: 1,
  })) as { id: number }[];

  const topRecord = maxIdResult[0];
  if (topRecord === undefined) return;

  const nextId = topRecord.id + 1;

  await prisma.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('${quotedModelName}', 'id'), coalesce(max(id)+1, ${nextId}), false) FROM ${quotedModelName};
  `);

  console.log(`Reset sequence for ${modelName} to ${nextId}`);
}

async function deleteAllData(orderedFileNames: string[]): Promise<void> {
  const modelNames = orderedFileNames.map((fileName) =>
    toPascalCase(path.basename(fileName, path.extname(fileName)))
  );

  for (const modelName of modelNames.reverse()) {
    const model = getModel(toCamelCase(modelName));
    if (model === undefined) {
      console.error(`Model ${modelName} not found in Prisma client`);
      continue;
    }
    try {
      await model.deleteMany();
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

// ----------------------------------------------------------------
// Main Seed Function
// ----------------------------------------------------------------

async function main(): Promise<void> {
  const dataDirectory = path.join(__dirname, "seedData");

  const orderedFileNames = [
    "location.json",    // No dependencies
    "manager.json",     // No dependencies
    "property.json",    // Depends on location and manager
    "tenant.json",      // No dependencies
    "lease.json",       // Depends on property and tenant
    "application.json", // Depends on property and tenant
    "payment.json",     // Depends on lease
  ];

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    ) as Record<string, unknown>[];

    const modelName = toPascalCase(
      path.basename(fileName, path.extname(fileName))
    );
    const modelNameCamel = toCamelCase(modelName);

    if (modelName === "Location") {
      await insertLocationData(jsonData as unknown as LocationData[]);
    } else {
      const model = getModel(modelNameCamel);
      if (model === undefined) {
        console.error(`Model ${modelName} not found, skipping seed.`);
        continue;
      }
      try {
        for (const item of jsonData) {
          await model.create({ data: item });
        }
        console.log(`Seeded ${modelName} with data from ${fileName}`);
      } catch (error) {
        console.error(`Error seeding data for ${modelName}:`, error);
      }
    }

    await resetSequence(modelName);
    await sleep(1000);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());