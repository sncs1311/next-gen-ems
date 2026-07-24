const prisma = require('../../lib/prisma');

const ANOMALY_DEVIATION_THRESHOLD = 0.20; // FR-FM-004 default — should move to SystemConfig once SA module exists

// FR-FM-002 — Fuel Tank Capacity Validation
async function validateTankCapacity(assetId, quantity) {
  const engineSpec = await prisma.engineSpecification.findUnique({ where: { assetId } });
  if (!engineSpec) {
    throw Object.assign(new Error('Asset has no engine specification on record'), { status: 422 });
  }
  if (quantity > Number(engineSpec.fuelTankCapacityLiters)) {
    throw Object.assign(
      new Error(`Quantity exceeds tank capacity of ${engineSpec.fuelTankCapacityLiters} L`),
      { status: 422 }
    );
  }
  return engineSpec;
}

// FR-FM-001 (partial) — meter reading must not go backwards for the same asset
async function validateMeterProgression(assetId, reading, meterField) {
  const lastLog = await prisma.fuelLog.findFirst({
    where: { assetId, [meterField]: { not: null } },
    orderBy: { loggedAt: 'desc' },
  });
  if (lastLog && lastLog[meterField] != null && reading < Number(lastLog[meterField])) {
    throw Object.assign(
      new Error(`Meter reading (${reading}) is less than the previous reading (${lastLog[meterField]})`),
      { status: 422 }
    );
  }
  return lastLog;
}

// FR-FM-003 — Fuel Efficiency Auto-Calculation
function calculateEfficiency(currentReading, previousReading, quantity, unit) {
  if (previousReading == null || quantity <= 0) return null;
  const delta = currentReading - previousReading;
  if (delta <= 0) return null;
  // km/L for vehicles (meter_reading_km), L/hour for equipment (meter_reading_hours)
  return unit === 'km' ? delta / quantity : quantity / delta;
}

// FR-FM-004 — Fuel Anomaly Detection: rolling 30-day average, flags >20% deviation
async function detectAnomaly(fuelLog) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentLogs = await prisma.fuelLog.findMany({
    where: {
      assetId: fuelLog.assetId,
      loggedAt: { gte: thirtyDaysAgo },
      calculatedEfficiency: { not: null },
      id: { not: fuelLog.id },
    },
    select: { calculatedEfficiency: true },
  });

  if (recentLogs.length < 3 || fuelLog.calculatedEfficiency == null) return null; // not enough history yet

  const avg =
    recentLogs.reduce((sum, l) => sum + Number(l.calculatedEfficiency), 0) / recentLogs.length;
  const deviation = Math.abs(Number(fuelLog.calculatedEfficiency) - avg) / avg;

  await prisma.fuelLog.update({ where: { id: fuelLog.id }, data: { rollingAvgEfficiency: avg } });

  if (deviation <= ANOMALY_DEVIATION_THRESHOLD) return null;

  return prisma.fuelAnomaly.create({
    data: {
      fuelLogId: fuelLog.id,
      assetId: fuelLog.assetId,
      anomalyType: Number(fuelLog.calculatedEfficiency) < avg ? 'Overconsumption' : 'Underconsumption',
      expectedMin: avg * (1 - ANOMALY_DEVIATION_THRESHOLD),
      expectedMax: avg * (1 + ANOMALY_DEVIATION_THRESHOLD),
      actualValue: fuelLog.calculatedEfficiency,
      deviationPercent: deviation * 100,
      alertGenerated: true,
    },
  });
}

// FR-FM-001 — Fuel Log Entry. Orchestrates capacity validation, meter progression,
// efficiency calc, and anomaly detection in one transaction (service-layer business
// rule enforcement per SRS 4.3 layer structure).
async function createFuelLog(data, userId) {
  await validateTankCapacity(data.assetId, data.quantityLiters);
  const meterField = data.meterReadingKm != null ? 'meterReadingKm' : 'meterReadingHours';
  const readingValue = data.meterReadingKm ?? data.meterReadingHours;
  const previousLog = readingValue != null
    ? await validateMeterProgression(data.assetId, readingValue, meterField)
    : null;

  const efficiency =
    readingValue != null
      ? calculateEfficiency(
          readingValue,
          previousLog ? Number(previousLog[meterField]) : null,
          data.quantityLiters,
          meterField === 'meterReadingKm' ? 'km' : 'hours'
        )
      : null;

  const fuelLog = await prisma.fuelLog.create({
    data: {
      assetId: data.assetId,
      driverId: data.driverId,
      projectId: data.projectId,
      tankId: data.tankId ?? null,
      loggedAt: data.loggedAt ?? new Date(),
      fuelType: data.fuelType,
      quantityLiters: data.quantityLiters,
      meterReadingKm: data.meterReadingKm ?? null,
      meterReadingHours: data.meterReadingHours ?? null,
      fuelSource: data.fuelSource,
      voucherReference: data.voucherReference ?? null,
      unitPrice: data.unitPrice ?? null,
      totalCost: data.unitPrice ? data.unitPrice * data.quantityLiters : null,
      currency: data.currency ?? null,
      calculatedEfficiency: efficiency,
      enteredBy: userId,
    },
  });

  const anomaly = await detectAnomaly(fuelLog);

  // If drawn from a site tank, decrement the running balance (feeds FR-FM-006 reconciliation).
  if (data.tankId) {
    await prisma.siteFuelTank.update({
      where: { id: data.tankId },
      data: { currentBalanceLiters: { decrement: data.quantityLiters } },
    });
  }

  return { fuelLog, anomaly };
}

// FR-FM-005 — Site Fuel Tank Management: bulk deliveries increase the running balance
async function recordTankDelivery(data, userId) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.siteFuelDelivery.create({
      data: {
        tankId: data.tankId,
        vendorId: data.vendorId,
        deliveryDate: data.deliveryDate,
        quantityLiters: data.quantityLiters,
        unitPrice: data.unitPrice,
        totalCost: data.unitPrice * data.quantityLiters,
        currency: data.currency,
        deliveryNoteNumber: data.deliveryNoteNumber ?? null,
        poReference: data.poReference ?? null,
        receivedBy: userId,
        notes: data.notes ?? null,
      },
    });
    await tx.siteFuelTank.update({
      where: { id: data.tankId },
      data: { currentBalanceLiters: { increment: data.quantityLiters } },
    });
    return delivery;
  });
}

// FR-FM-006 — Fuel Reconciliation Report (per tank, per period)
async function getFuelReconciliation(tankId, periodStart, periodEnd) {
  const tank = await prisma.siteFuelTank.findUnique({ where: { id: tankId } });
  if (!tank) throw Object.assign(new Error('Tank not found'), { status: 404 });

  const [deliveries, dispensed] = await Promise.all([
    prisma.siteFuelDelivery.aggregate({
      where: { tankId, deliveryDate: { gte: periodStart, lte: periodEnd } },
      _sum: { quantityLiters: true, totalCost: true },
    }),
    prisma.fuelLog.aggregate({
      where: { tankId, loggedAt: { gte: periodStart, lte: periodEnd } },
      _sum: { quantityLiters: true },
    }),
  ]);

  const delivered = Number(deliveries._sum.quantityLiters ?? 0);
  const dispensedTotal = Number(dispensed._sum.quantityLiters ?? 0);
  const unaccountedLiters = delivered - dispensedTotal;
  const avgUnitCost = delivered > 0 ? Number(deliveries._sum.totalCost ?? 0) / delivered : 0;

  return {
    tank,
    periodStart,
    periodEnd,
    deliveredLiters: delivered,
    dispensedLiters: dispensedTotal,
    unaccountedLiters,
    unaccountedValue: unaccountedLiters * avgUnitCost,
  };
}

async function getFuelHistoryForAsset(assetId, filters = {}) {
  const { page = 1, pageSize = 50 } = filters;
  return prisma.fuelLog.findMany({
    where: { assetId },
    orderBy: { loggedAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

module.exports = {
  createFuelLog,
  recordTankDelivery,
  getFuelReconciliation,
  getFuelHistoryForAsset,
  validateTankCapacity,
  calculateEfficiency,
};
