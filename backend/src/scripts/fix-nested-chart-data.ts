/**
 * Script to fix deeply nested chart data
 * Run: npm run ts-node src/scripts/fix-nested-chart-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unwrapNestedData(data: any, maxDepth = 20): Promise<any> {
  let current = data;
  let depth = 0;

  // Unwrap nested data levels until we find planets or reach max depth
  while (current?.data && !current.planets && depth < maxDepth) {
    current = current.data;
    depth++;
  }

  return { unwrapped: current, depth };
}

async function fixNestedChartData() {
  console.log('🔧 Starting chart data unwrapping migration...\n');

  try {
    // Get all charts
    const charts = await prisma.chart.findMany();
    console.log(`📊 Found ${charts.length} charts to process\n`);

    let fixed = 0;
    let skipped = 0;

    for (const chart of charts) {
      const { unwrapped, depth } = await unwrapNestedData(chart.data);

      if (depth > 0) {
        console.log(
          `🔄 Chart ${chart.id.substring(0, 8)}... - Unwrapping from depth ${depth}`,
        );

        await prisma.chart.update({
          where: { id: chart.id },
          data: {
            data: unwrapped,
            updatedAt: new Date(),
          },
        });

        fixed++;
      } else {
        skipped++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Fixed: ${fixed} charts`);
    console.log(`   Skipped: ${skipped} charts (already correct)`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
fixNestedChartData()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
