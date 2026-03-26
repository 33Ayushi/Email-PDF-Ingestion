
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.emailIngestionConfig.count();
    console.log(`Successfully connected to DB! Row count: ${count}`);
  } catch (err) {
    console.error(`DB connection failed: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
