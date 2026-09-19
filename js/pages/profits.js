/** EAGLE — صفحة الإيرادات: كل تفاصيل الإيرادات ومصادرها، منفصلة عن لوحة التحكم */
Pages.profits = {
  async render(container) {
    const [ledger, totals] = await Promise.all([Profits.ledger(), Profits.totals()]);
    const typeIcon = { sale: '🛒', maintenance: '🔧' };

    container.innerHTML = `
      <div class="page-head">
        <div><h2 class="page-head__title">📈 الإيرادات</h2><p class="page-head__sub">كل مصادر الإيرادات بالتفصيل</p></div>
      </div>

      <div class="hero-band">
        <div class="hero-stat">
          <span class="hero-stat__label">إجمالي الإيرادات</span>
          <span class="hero-stat__value">${Fmt.currency(totals.grandTotal)}</span>
        </div>
        <div class="hero-stat hero-stat--secondary">
          <span class="hero-stat__label">إيرادات البيع</span>
          <span class="hero-stat__value">${Fmt.currency(totals.salesProfit)}</span>
        </div>
        <div class="hero-stat hero-stat--secondary">
          <span class="hero-stat__label">إيرادات الصيانة</span>
          <span class="hero-stat__value">${Fmt.currency(totals.maintenanceRevenue)}</span>
        </div>
      </div>

      ${ledger.length === 0 ? `
        <div class="empty-state"><p>لا توجد إيرادات مسجلة بعد.</p></div>
      ` : `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>النوع</th><th>البيان</th><th>المرجع</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
          <tbody>
            ${ledger.map((r) => `
              <tr>
                <td>${typeIcon[r.type]} ${Fmt.escapeHtml(r.typeLabel)}</td>
                <td>${Fmt.escapeHtml(r.label)}</td>
                <td class="mono">${Fmt.escapeHtml(r.ref)}</td>
                <td class="mono">${Fmt.currency(r.amount)}</td>
                <td>${Fmt.date(r.date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;
  },
};
