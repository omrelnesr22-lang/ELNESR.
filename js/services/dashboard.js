/**
 * EAGLE — تجميع بيانات لوحة التحكم
 * لوحة التحكم بقت مركّزة على "الوضع الحالي والعمليات اللي محتاجة متابعة" —
 * الإيرادات بتفاصيلها انتقلت بالكامل لقسم الإيرادات المستقل.
 */

const Dashboard = {
  async summary() {
    const [products, today, inProgressCount, debtsOutstanding, unpaidCount] = await Promise.all([
      DB.getAll('products'),
      Sales.totalsForDate(Fmt.todayIso()),
      Maintenance.inProgressCount(),
      Debts.totalOutstanding(),
      Debts.unpaidCount(),
    ]);
    return {
      productCount: products.length,
      todaySalesValue: today.totalValue,
      todaySalesCount: today.count,
      inProgressCount,
      debtsOutstanding,
      unpaidCount,
    };
  },

  async lowStockAlerts() {
    const products = await DB.getAll('products');
    return products.filter((p) => Products.isLowStock(p)).sort((a, b) => a.quantity - b.quantity);
  },

  /** أحدث المديونيات — للعرض المختصر في لوحة التحكم */
  async recentDebts(limit = 6) {
    const debts = await Debts.list(); // مرتبة بالفعل: الأحدث أولًا
    return debts.slice(0, limit);
  },

  async recentActivity(limit = 8) {
    return Audit.recent(limit);
  },
};
