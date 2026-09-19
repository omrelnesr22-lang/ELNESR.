/**
 * EAGLE — خدمة الإيرادات
 * سجل تفصيلي مُجمَّع من مصدرين: إيراد كل سطر بيع، وإيراد كل عملية صيانة
 * اتسلّمت. القيم دي مستقلة تمامًا عن أي مديونية أو سداد — الإيراد بيتسجل
 * وقت العملية نفسها بغض النظر عن حالة التحصيل.
 */

const Profits = {
  async ledger() {
    const [sales, jobs] = await Promise.all([Sales.list(), Maintenance.list()]);
    const rows = [];

    sales.forEach((s) => {
      (s.items || []).forEach((it) => {
        rows.push({
          type: 'sale', typeLabel: 'بيع', label: it.productNameAr, amount: it.lineProfit,
          date: s.date, ref: s.number,
        });
      });
    });

    jobs.forEach((j) => {
      const cases = j.cases && j.cases.length > 0 ? j.cases : [{ status: j.status, cost: j.cost, deliveryDate: j.deliveryDate, receiptDate: j.receiptDate }];
      cases.forEach((c, i) => {
        if (c.status === 'delivered') {
          rows.push({
            type: 'maintenance', typeLabel: 'صيانة', label: j.deviceName || 'بدون اسم', amount: Number(c.cost || 0),
            date: c.deliveryDate || c.receiptDate, ref: cases.length > 1 ? `${j.code}-${i + 1}` : j.code,
          });
        }
      });
    });

    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    return rows;
  },

  async totals() {
    const [salesProfit, maintenanceRevenue] = await Promise.all([Sales.totalProfit(), Maintenance.totalDeliveredRevenue()]);
    return { salesProfit, maintenanceRevenue, grandTotal: salesProfit + maintenanceRevenue };
  },
};
