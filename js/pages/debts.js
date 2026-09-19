/** EAGLE — صفحة المديونات */
Pages.debts = {
  async render(container) {
    const debts = await Debts.list();
    const outstanding = await Debts.totalOutstanding();
    const sourceIcon = { sale: '🛒', maintenance: '🔧', manual: '✍️' };
    const sourceLabel = { sale: 'مبيعات', maintenance: 'صيانة', manual: 'إدخال يدوي' };
    const statusBadge = { unpaid: ['badge--out', 'غير مسدد'], partial: ['badge--low', 'مسدد جزئيًا'], paid: ['badge--ok', 'تم السداد'] };

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2 class="page-head__title">المديونات</h2>
          <p class="page-head__sub">${debts.length} مديونية — إجمالي المتبقي: <strong style="color:var(--danger)">${Fmt.currency(outstanding)}</strong></p>
        </div>
        <button class="btn btn--primary" data-action="add">+ إضافة مديونية</button>
      </div>

      <div class="filter-bar">
        <input type="text" class="search-box" placeholder="🔍 بحث باسم العميل أو الكود أو الهاتف..." data-role="search" />
      </div>

      ${debts.length === 0 ? `
        <div class="empty-state"><p>لا توجد مديونيات مسجلة حتى الآن.</p></div>
      ` : `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>الشخص</th><th>الهاتف</th><th>المصدر</th><th>تاريخ التسجيل</th><th>الأصل</th><th>المدفوع</th><th>المتبقي</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>
            ${debts.map((d) => `
              <tr data-id="${d.id}">
                <td class="table__strong"><a href="javascript:void(0)" data-action="person" data-person="${Fmt.escapeHtml(d.personName)}" style="color:inherit;text-decoration:underline;">${Fmt.escapeHtml(d.personName)}</a></td>
                <td class="mono">${Fmt.escapeHtml(d.phone || '—')}</td>
                <td>${sourceIcon[d.source]} ${Fmt.escapeHtml(d.sourceLabel)}</td>
                <td class="mono">${Fmt.date(d.date)}</td>
                <td class="mono">${Fmt.currency(d.originalAmount)}</td>
                <td class="mono">${Fmt.currency(d.paidAmount)}</td>
                <td class="mono" style="color:${d.remainingAmount > 0 ? 'var(--danger)' : 'var(--success)'}">${Fmt.currency(d.remainingAmount)}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="view" title="عرض">👁</button>
                  ${d.remainingAmount > 0 ? `<button class="icon-btn" data-action="pay" title="تسجيل سداد" style="color:var(--success)">💰</button>` : ''}
                  ${d.paidAmount === 0 ? `<button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;

    container.querySelectorAll('[data-action="add"]').forEach((b) => b.onclick = () => openManualForm());
    container.querySelectorAll('[data-action="person"]').forEach((b) => {
      b.onclick = () => openPersonRecord(b.dataset.person);
    });

    // معالج البحث
    const searchBox = container.querySelector('[data-role="search"]');
    if (searchBox) {
      searchBox.oninput = async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          Pages.debts.render(container);
          return;
        }
        
        const results = await Search.searchDebts(query);
        const tbody = container.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = results.length === 0 
            ? `<tr><td colspan="8" class="text-center">لا توجد نتائج</td></tr>`
            : results.map((d) => `
              <tr data-id="${d.id}">
                <td class="table__strong"><a href="javascript:void(0)" data-action="person" data-person="${Fmt.escapeHtml(d.personName)}" style="color:inherit;text-decoration:underline;">${Fmt.escapeHtml(d.personName)}</a></td>
                <td class="mono">${Fmt.escapeHtml(d.phone || '—')}</td>
                <td>${sourceIcon[d.source]} ${Fmt.escapeHtml(d.sourceLabel)}</td>
                <td class="mono">${Fmt.date(d.date)}</td>
                <td class="mono">${Fmt.currency(d.originalAmount)}</td>
                <td class="mono">${Fmt.currency(d.paidAmount)}</td>
                <td class="mono" style="color:${d.remainingAmount > 0 ? 'var(--danger)' : 'var(--success)'}">${Fmt.currency(d.remainingAmount)}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="view" title="عرض">👁</button>
                  ${d.remainingAmount > 0 ? `<button class="icon-btn" data-action="pay" title="تسجيل سداد" style="color:var(--success)">💰</button>` : ''}
                  ${d.paidAmount === 0 ? `<button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>` : ''}
                </td>
              </tr>
            `).join('');
          
          // إعادة ربط الأحداث للنتائج الجديدة
          tbody.querySelectorAll('[data-action="person"]').forEach((b) => {
            b.onclick = () => openPersonRecord(b.dataset.person);
          });
          tbody.querySelectorAll('[data-action="view"]').forEach((b) => {
            b.onclick = () => openView(results.find((d) => d.id === b.closest('tr').dataset.id));
          });
          tbody.querySelectorAll('[data-action="pay"]').forEach((b) => {
            b.onclick = () => openPayDialog(results.find((d) => d.id === b.closest('tr').dataset.id));
          });
          tbody.querySelectorAll('[data-action="delete"]').forEach((b) => {
            b.onclick = async () => {
              const d = results.find((x) => x.id === b.closest('tr').dataset.id);
              const ok = await UI.confirm({ title: 'حذف مديونية', message: `حذف مديونية "${d.personName}"؟`, danger: true, confirmLabel: 'حذف' });
              if (!ok) return;
              try { await Debts.remove(d.id); UI.toast('تم الحذف'); Pages.debts.render(container); }
              catch (err) { UI.toast(err.message || String(err), 'error'); }
            };
          });
        }
      };
    }
    
    container.querySelectorAll('[data-action="view"]').forEach((b) => {
      b.onclick = () => openView(debts.find((d) => d.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="pay"]').forEach((b) => {
      b.onclick = () => openPayDialog(debts.find((d) => d.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => {
      b.onclick = async () => {
        const d = debts.find((x) => x.id === b.closest('tr').dataset.id);
        const ok = await UI.confirm({ title: 'حذف مديونية', message: `حذف مديونية "${d.personName}"؟`, danger: true, confirmLabel: 'حذف' });
        if (!ok) return;
        try { await Debts.remove(d.id); UI.toast('تم الحذف'); Router.resolve(); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    async function openPersonRecord(personName) {
      const record = await Debts.byPerson(personName);
      UI.openModal({
        title: `سجل الشخص — ${record.personName}`,
        size: 'modal--lg',
        bodyHtml: `
          <p class="modal__text" style="margin-bottom:16px">إجمالي المديونية الحالية: <strong class="mono">${Fmt.currency(record.totalOutstanding)}</strong></p>
          <table class="table table--compact">
            <thead><tr><th>التاريخ</th><th>المصدر</th><th>البيان</th><th>الأصل</th><th>المتبقي</th><th>الحالة</th></tr></thead>
            <tbody>
              ${record.debts.map((d) => `
                <tr>
                  <td class="mono">${Fmt.date(d.date)}</td>
                  <td>${sourceIcon[d.source]}</td>
                  <td>${Fmt.escapeHtml(d.sourceLabel)}</td>
                  <td class="mono">${Fmt.currency(d.originalAmount)}</td>
                  <td class="mono">${Fmt.currency(d.remainingAmount)}</td>
                  <td><span class="badge ${statusBadge[d.status][0]}">${statusBadge[d.status][1]}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        `,
      });
    }

    function openManualForm() {
      DebtForm.open({ onSaved: () => Router.resolve() });
    }

    function openPayDialog(debt) {
      const { close, bodyEl } = UI.openModal({
        title: `تسجيل سداد — ${debt.personName}`,
        size: 'modal--sm',
        bodyHtml: `
          <form data-form>
            <p class="modal__text" style="margin-bottom:14px">المتبقي حاليًا: <strong class="mono">${Fmt.currency(debt.remainingAmount)}</strong></p>
            <div class="field"><label>المبلغ المدفوع الآن <span class="req">*</span></label>
              <input type="number" step="0.01" min="0.01" max="${debt.remainingAmount}" name="amount" autofocus /></div>
            <div class="field"><label>تاريخ السداد</label><input type="date" name="date" value="${Fmt.todayIso()}" /></div>
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">تأكيد السداد</button>
            </div>
          </form>`,
      });
      const form = bodyEl.querySelector('[data-form]');
      bodyEl.querySelector('[data-cancel]').onclick = close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const errorEl = form.querySelector('[data-error]');
        errorEl.hidden = true;
        try {
          const result = await Debts.recordPayment(debt.id, fd.get('amount'), fd.get('date'));
          close();
          if (result === null) {
            UI.toast('تم السداد الكامل — تم حذف المديونية من السجل');
          } else {
            UI.toast('تم تسجيل السداد بنجاح');
          }
          Router.resolve();
        } catch (err) {
          errorEl.textContent = err.message || String(err);
          errorEl.hidden = false;
        }
      };
    }

    function openView(debt) {
      UI.openModal({
        title: `مديونية — ${debt.personName}`,
        bodyHtml: `
          <div class="kv-grid">
            <div><span class="kv-grid__label">الهاتف</span><span class="mono">${Fmt.escapeHtml(debt.phone || '—')}</span></div>
            <div><span class="kv-grid__label">المصدر</span><span>${sourceIcon[debt.source]} ${Fmt.escapeHtml(sourceLabel[debt.source])}</span></div>
            <div><span class="kv-grid__label">تفاصيل العملية</span><span>${Fmt.escapeHtml(debt.sourceLabel)}</span></div>
            <div><span class="kv-grid__label">تاريخ التسجيل</span><span class="mono">${Fmt.date(debt.date)}</span></div>
            <div><span class="kv-grid__label">الدين الأصلي</span><span class="mono">${Fmt.currency(debt.originalAmount)}</span></div>
            <div><span class="kv-grid__label">المدفوع</span><span class="mono">${Fmt.currency(debt.paidAmount)}</span></div>
            <div><span class="kv-grid__label">المتبقي</span><span class="mono">${Fmt.currency(debt.remainingAmount)}</span></div>
            <div><span class="kv-grid__label">الحالة</span><span class="badge ${statusBadge[debt.status][0]}">${statusBadge[debt.status][1]}</span></div>
          </div>
          ${debt.payments && debt.payments.length ? `
            <h4 class="product-view__subhead">سجل السداد</h4>
            <table class="table table--compact">
              <thead><tr><th>التاريخ</th><th>المبلغ</th></tr></thead>
              <tbody>${debt.payments.map((p) => `<tr><td>${Fmt.date(p.date)}</td><td class="mono">${Fmt.currency(p.amount)}</td></tr>`).join('')}</tbody>
            </table>
          ` : ''}
          ${debt.notes ? `<p class="product-view__notes">${Fmt.escapeHtml(debt.notes)}</p>` : ''}
        `,
      });
    }
  },
};
