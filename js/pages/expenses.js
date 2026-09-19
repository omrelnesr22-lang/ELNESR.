/** EAGLE — صفحة المصروفات */

Pages.expenses = {
  state: { month: Fmt.todayIso().substring(0, 7), expandedDay: null },

  async render(container) {
    const s = Pages.expenses.state;
    const monthlyData = await Expenses.getMonthlyExpenses(s.month);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2 class="page-head__title">المصروفات</h2>
          <p class="page-head__sub">إجمالي الشهر: <strong style="color:var(--danger)">${Fmt.currency(monthlyData.monthTotal)}</strong></p>
        </div>
        <button class="btn btn--primary" data-action="add">+ إضافة مصروف</button>
      </div>

      <div class="filter-bar">
        <input type="month" value="${s.month}" data-role="month" />
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px">
        <div class="panel">
          <div class="panel__head"><h3>المشتريات</h3></div>
          <div style="font-size:24px; font-weight:700; color:var(--gold)">${Fmt.currency(monthlyData.purchasesTotal)}</div>
          <span class="hint-note">${monthlyData.purchases.length} عملية شراء</span>
        </div>
        <div class="panel">
          <div class="panel__head"><h3>المصروفات العامة</h3></div>
          <div style="font-size:24px; font-weight:700; color:var(--danger)">${Fmt.currency(monthlyData.expensesTotal)}</div>
          <span class="hint-note">${monthlyData.expenses.length} مصروف</span>
        </div>
      </div>

      ${Object.keys(monthlyData.dailyBreakdown).length === 0 ? `
        <div class="empty-state"><p>لا توجد مصروفات أو مشتريات في هذا الشهر.</p></div>
      ` : `
      <div class="table-card">
        <div style="font-size:14px; line-height:1.8">
          ${Object.keys(monthlyData.dailyBreakdown).sort().map(day => {
            const dayData = monthlyData.dailyBreakdown[day];
            const isExpanded = s.expandedDay === day;
            return `
              <div style="border-bottom:1px solid var(--border-soft); padding:12px 0">
                <button type="button" class="btn btn--ghost btn--sm" data-action="toggle-day" data-day="${day}" style="width:100%; text-align:right; justify-content:space-between">
                  <span>${isExpanded ? '▼' : '▶'}</span>
                  <strong>${Fmt.date(day)}</strong>
                  <span class="mono">${Fmt.currency(dayData.dayTotal)}</span>
                </button>
                ${isExpanded ? `
                  <div style="padding:12px 20px; background:var(--surface-2)">
                    ${dayData.purchases.length > 0 ? `
                      <div style="margin-bottom:12px">
                        <strong style="color:var(--gold)">المشتريات</strong>
                        <div style="font-size:12px; margin-top:8px">
                          ${dayData.purchases.map(p => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0">
                              <span>${p.productName} (${p.quantity} وحدة × ${Fmt.currency(p.unitPrice)})</span>
                              <span style="display:flex; align-items:center; gap:8px">
                                <span class="mono">${Fmt.currency(p.totalAmount)}</span>
                                <button class="icon-btn icon-btn--danger" data-action="delete-purchase" data-id="${p.id}" title="حذف">🗑</button>
                              </span>
                            </div>
                          `).join('')}
                        </div>
                        <div style="border-top:1px solid var(--border); padding-top:4px; margin-top:8px; font-weight:600">
                          إجمالي المشتريات: ${Fmt.currency(dayData.purchasesTotal)}
                        </div>
                      </div>
                    ` : ''}
                    ${dayData.expenses.length > 0 ? `
                      <div>
                        <strong style="color:var(--danger)">المصروفات العامة</strong>
                        <div style="font-size:12px; margin-top:8px">
                          ${dayData.expenses.map(e => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0">
                              <span>${e.category} - ${e.description}</span>
                              <span style="display:flex; align-items:center; gap:8px">
                                <span class="mono">${Fmt.currency(e.amount)}</span>
                                <button class="icon-btn icon-btn--danger" data-action="delete-expense" data-id="${e.id}" title="حذف">🗑</button>
                              </span>
                            </div>
                          `).join('')}
                        </div>
                        <div style="border-top:1px solid var(--border); padding-top:4px; margin-top:8px; font-weight:600">
                          إجمالي المصروفات: ${Fmt.currency(dayData.expensesTotal)}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>`}
    `;

    container.querySelector('[data-role="month"]').onchange = (e) => {
      s.month = e.target.value;
      Pages.expenses.render(container);
    };

    container.querySelectorAll('[data-action="add"]').forEach(b => {
      b.onclick = () => ExpenseForm.open({ onSaved: () => Pages.expenses.render(container) });
    });

    container.querySelectorAll('[data-action="toggle-day"]').forEach(b => {
      b.onclick = () => {
        s.expandedDay = s.expandedDay === b.dataset.day ? null : b.dataset.day;
        Pages.expenses.render(container);
      };
    });

    container.querySelectorAll('[data-action="delete-purchase"]').forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const ok = await UI.confirm({
          title: 'حذف عملية شراء',
          message: 'حذف هذه العملية؟ سيتم إرجاع الكمية من المخزون (لو لسه متاحة).',
          danger: true, confirmLabel: 'حذف'
        });
        if (!ok) return;
        try { await Expenses.removePurchase(b.dataset.id); UI.toast('تم الحذف'); Pages.expenses.render(container); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    container.querySelectorAll('[data-action="delete-expense"]').forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const ok = await UI.confirm({ title: 'حذف مصروف', message: 'حذف هذا المصروف؟', danger: true, confirmLabel: 'حذف' });
        if (!ok) return;
        try { await Expenses.removeExpense(b.dataset.id); UI.toast('تم الحذف'); Pages.expenses.render(container); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });
  },
};
