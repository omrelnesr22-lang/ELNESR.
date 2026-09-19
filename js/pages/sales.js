/** EAGLE — صفحة المبيعات */
Pages.sales = {
  async render(container) {
    const [sales, products] = await Promise.all([Sales.list(), Products.list()]);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2 class="page-head__title">المبيعات</h2>
          <p class="page-head__sub">${sales.length} عملية بيع</p>
        </div>
        <button class="btn btn--primary" data-action="add" ${products.length === 0 ? 'disabled title="أضف صنف واحد على الأقل أولًا"' : ''}>+ عملية بيع جديدة</button>
      </div>

      ${products.length === 0 ? `<div class="empty-state"><p>محتاج تضيف صنف واحد على الأقل قبل تسجيل أي بيع.</p></div>` :
        sales.length === 0 ? `
        <div class="empty-state"><p>لا توجد عمليات بيع مسجلة بعد.</p><button class="btn btn--primary" data-action="add">تسجيل أول عملية بيع</button></div>
      ` : `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>عدد الأصناف</th><th>الإجمالي</th><th>الربح</th><th>الحالة</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>
            ${sales.map((s) => `
              <tr data-id="${s.id}">
                <td class="mono table__strong">${Fmt.escapeHtml(s.number)}</td>
                <td>${Fmt.date(s.date)}</td>
                <td>${Fmt.escapeHtml(s.personName || '—')}</td>
                <td class="mono">${s.items.length}</td>
                <td class="mono">${Fmt.currency(s.totalValue)}</td>
                <td class="mono" style="color:var(--success)">${Fmt.currency(s.totalProfit)}</td>
                <td>${s.amountPaid >= s.totalValue ? '<span class="badge badge--ok">مدفوع بالكامل</span>' : '<span class="badge badge--out">فيه مديونية</span>'}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="view" title="عرض">👁</button>
                  <button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;

    container.querySelectorAll('[data-action="add"]').forEach((b) => { if (!b.disabled) b.onclick = () => openForm(); });
    container.querySelectorAll('[data-action="view"]').forEach((b) => {
      b.onclick = () => openView(sales.find((s) => s.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => {
      b.onclick = async () => {
        const s = sales.find((x) => x.id === b.closest('tr').dataset.id);
        const ok = await UI.confirm({
          title: 'حذف عملية بيع',
          message: `حذف عملية بيع رقم "${s.number}"؟\n\nسيتم إرجاع الكميات المباعة إلى المخزون، وحذف أي مديونية مرتبطة.`,
          danger: true,
          confirmLabel: 'حذف',
        });
        if (!ok) return;
        try { await Sales.remove(s.id); UI.toast('تم حذف عملية البيع وإرجاع الكميات'); Router.resolve(); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    function openForm() {
      SaleForm.open({ onSaved: () => Router.resolve() });
    }

    function openView(sale) {
      const debtAmount = sale.totalValue - sale.amountPaid;
      UI.openModal({
        title: `عملية بيع ${sale.number}`,
        size: 'modal--lg',
        bodyHtml: `
          <div class="kv-grid" style="margin-bottom:16px">
            <div><span class="kv-grid__label">التاريخ</span><span class="mono">${Fmt.date(sale.date)}</span></div>
            <div><span class="kv-grid__label">العميل</span><span>${Fmt.escapeHtml(sale.personName || '—')}</span></div>
            <div><span class="kv-grid__label">إجمالي الربح</span><span class="mono" style="color:var(--success)">${Fmt.currency(sale.totalProfit)}</span></div>
            <div><span class="kv-grid__label">المدفوع</span><span class="mono">${Fmt.currency(sale.amountPaid)}</span></div>
            ${debtAmount > 0 ? `<div><span class="kv-grid__label">مديونية متبقية</span><span class="mono" style="color:var(--danger)">${Fmt.currency(debtAmount)} — راجع قسم المديونات</span></div>` : ''}
          </div>
          <table class="table">
            <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر البيع</th><th>الإجمالي</th><th>الربح</th></tr></thead>
            <tbody>
              ${sale.items.map((it) => `
                <tr>
                  <td>${Fmt.escapeHtml(it.productNameAr)}</td>
                  <td class="mono">${Fmt.number(it.quantity)}</td>
                  <td class="mono">${Fmt.currency(it.salePrice)}</td>
                  <td class="mono">${Fmt.currency(it.lineValue)}</td>
                  <td class="mono">${Fmt.currency(it.lineProfit)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="ob-total" style="margin-top:12px"><span>الإجمالي</span><span class="mono">${Fmt.currency(sale.totalValue)}</span></div>
          ${sale.notes ? `<p class="product-view__notes">${Fmt.escapeHtml(sale.notes)}</p>` : ''}
        `,
      });
    }
  },
};
