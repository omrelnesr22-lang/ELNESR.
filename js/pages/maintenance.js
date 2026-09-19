/** EAGLE — صفحة الصيانة (عربون عند الاستلام + تسوية نهائية عند التسليم) */
Pages.maintenance = {
  state: { tab: 'in_progress' },

  async render(container) {
    const jobs = await Maintenance.list();
    const s = Pages.maintenance.state;

    const inProgressJobs = jobs.filter((j) => j.status === 'in_progress');
    const deliveredJobs = jobs.filter((j) => j.status === 'delivered');
    const rows = s.tab === 'delivered' ? deliveredJobs : inProgressJobs;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2 class="page-head__title">الصيانة</h2>
          <p class="page-head__sub">${jobs.length} عملية إجمالًا</p>
        </div>
        <button class="btn btn--primary" data-action="add">+ استلام جهاز للصيانة</button>
      </div>

      <div class="tabs">
        <button class="tabs__btn ${s.tab !== 'delivered' ? 'tabs__btn--active' : ''}" data-action="tab" data-tab="in_progress">🔧 قيد الصيانة (${inProgressJobs.length})</button>
        <button class="tabs__btn ${s.tab === 'delivered' ? 'tabs__btn--active' : ''}" data-action="tab" data-tab="delivered">✅ تم التسليم (${deliveredJobs.length})</button>
      </div>

      ${jobs.length === 0 ? `
        <div class="empty-state"><p>لا توجد عمليات صيانة مسجلة بعد.</p><button class="btn btn--primary" data-action="add">تسجيل أول عملية</button></div>
      ` : rows.length === 0 ? `<div class="empty-state"><p>${s.tab === 'delivered' ? 'لا توجد أجهزة مُسلّمة بعد.' : 'لا توجد أجهزة قيد الصيانة حاليًا.'}</p></div>` : s.tab === 'delivered' ? `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>الكود</th><th>الجهاز</th><th>العميل</th><th>الهاتف</th><th>تاريخ التسليم</th><th>التكلفة</th><th>مديونية متبقية</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>
            ${rows.map((j) => {
              const totalPaid = Number(j.deposit || 0) + Number(j.paymentAtDelivery || 0);
              const remaining = Number(j.cost) - totalPaid;
              return `
              <tr data-id="${j.id}">
                <td class="mono">${Fmt.escapeHtml(j.code)}${j.cases && j.cases.length > 1 ? ` <span class="pill" title="عدد الحالات المسجلة على هذا الكود">📋${j.cases.length}</span>` : ''}</td>
                <td class="table__strong">${Fmt.escapeHtml(j.deviceName || '—')}</td>
                <td>${Fmt.escapeHtml(j.customerName || '—')}</td>
                <td class="mono">${Fmt.escapeHtml(j.phone || '—')}</td>
                <td class="mono">${Fmt.date(j.deliveryDate)}</td>
                <td class="mono">${Fmt.currency(j.cost)}</td>
                <td class="mono" style="color:${remaining > 0 ? 'var(--danger)' : 'var(--success)'}">${remaining > 0 ? Fmt.currency(remaining) + ' — راجع المديونات' : '—'}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="view" title="عرض">👁</button>
                  <button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>الكود</th><th>الجهاز</th><th>العميل</th><th>الهاتف</th><th>تاريخ الاستلام</th><th>التكلفة</th><th>العربون</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>
            ${rows.map((j) => `
              <tr data-id="${j.id}">
                <td class="mono">${Fmt.escapeHtml(j.code)}${j.cases && j.cases.length > 1 ? ` <span class="pill" title="عدد الحالات المسجلة على هذا الكود">📋${j.cases.length}</span>` : ''}</td>
                <td class="table__strong">${Fmt.escapeHtml(j.deviceName || '—')}${j.partsUsed && j.partsUsed.length ? ' <span class="pill" title="استخدم أصناف من المخزون">🔧' + j.partsUsed.length + '</span>' : ''}</td>
                <td>${Fmt.escapeHtml(j.customerName || '—')}</td>
                <td class="mono">${Fmt.escapeHtml(j.phone || '—')}</td>
                <td>${Fmt.date(j.receiptDate)}</td>
                <td class="mono">${Fmt.currency(j.cost)}</td>
                <td class="mono">${Fmt.currency(j.deposit || 0)}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="view" title="عرض">👁</button>
                  <button class="icon-btn" data-action="edit" title="تعديل">✎</button>
                  <button class="icon-btn" data-action="deliver" title="تم التسليم">✓</button>
                  <button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;

    container.querySelectorAll('[data-action="tab"]').forEach((b) => {
      b.onclick = () => { s.tab = b.dataset.tab; Pages.maintenance.render(container); };
    });

    container.querySelectorAll('[data-action="add"]').forEach((b) => b.onclick = () => openForm(null));
    container.querySelectorAll('[data-action="edit"]').forEach((b) => {
      b.onclick = () => openForm(jobs.find((j) => j.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="view"]').forEach((b) => {
      b.onclick = () => openView(jobs.find((j) => j.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => {
      b.onclick = async () => {
        const j = jobs.find((x) => x.id === b.closest('tr').dataset.id);
        const ok = await UI.confirm({ title: 'حذف عملية صيانة', message: `حذف عملية "${j.deviceName}" (${j.code})؟${j.partsUsed && j.partsUsed.length ? ' سيتم إرجاع القطع المستخدمة للمخزون.' : ''}`, danger: true, confirmLabel: 'حذف' });
        if (!ok) return;
        try { await Maintenance.remove(j.id); UI.toast('تم الحذف'); Pages.maintenance.render(container); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });
    container.querySelectorAll('[data-action="deliver"]').forEach((b) => {
      b.onclick = () => openDeliverDialog(jobs.find((j) => j.id === b.closest('tr').dataset.id));
    });

    function openDeliverDialog(job) {
      const remainingBeforeDelivery = Number(job.cost) - Number(job.deposit || 0);
      const { close, bodyEl } = UI.openModal({
        title: `تسليم: ${job.deviceName || job.code}`,
        size: 'modal--sm',
        bodyHtml: `
          <form data-form>
            <p class="modal__text" style="margin-bottom:14px">
              التكلفة: <strong class="mono">${Fmt.currency(job.cost)}</strong> —
              العربون المدفوع سابقًا: <strong class="mono">${Fmt.currency(job.deposit || 0)}</strong> —
              المتبقي قبل التسليم: <strong class="mono">${Fmt.currency(remainingBeforeDelivery)}</strong>
            </p>
            <div class="field"><label>تاريخ التسليم</label>
              <input type="date" name="deliveryDate" value="${Fmt.todayIso()}" /></div>
            <div class="field"><label>المبلغ المدفوع عند التسليم</label>
              <input type="number" step="0.01" min="0" name="paymentAtDelivery" placeholder="افتراضيًا = المتبقي بالكامل (${Fmt.number(remainingBeforeDelivery)})" /></div>
            <p class="hint-note">لو العميل دفع أقل من المتبقي، هتتسجل مديونية تلقائيًا بالفرق.</p>
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">تأكيد التسليم</button>
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
          await Maintenance.deliver(job.id, fd.get('deliveryDate'), fd.get('paymentAtDelivery'));
          close();
          UI.toast('تم تسجيل التسليم وتحديث الإيرادات بنجاح');
          s.tab = 'delivered';
          Router.resolve();
        } catch (err) {
          errorEl.textContent = err.message || String(err);
          errorEl.hidden = false;
        }
      };
    }

    function openForm(existing) {
      MaintenanceForm.open({ existing, onSaved: () => Router.resolve() });
    }

    function openView(job) {
      const totalPaid = job.status === 'delivered'
        ? Number(job.deposit || 0) + Number(job.paymentAtDelivery || 0)
        : Number(job.deposit || 0);
      const remaining = Number(job.cost) - totalPaid;
      const statusLabel = { in_progress: 'قيد الصيانة', delivered: 'تم التسليم' };
      const cases = job.cases && job.cases.length > 0 ? job.cases : [];

      UI.openModal({
        title: `عملية صيانة ${job.code}`,
        size: cases.length > 1 ? 'modal--lg' : undefined,
        bodyHtml: `
          <div class="kv-grid">
            <div><span class="kv-grid__label">الجهاز</span><span>${Fmt.escapeHtml(job.deviceName || '—')}</span></div>
            <div><span class="kv-grid__label">العميل</span><span>${Fmt.escapeHtml(job.customerName || '—')}</span></div>
            <div><span class="kv-grid__label">الهاتف</span><span class="mono">${Fmt.escapeHtml(job.phone || '—')}</span></div>
          </div>

          ${cases.length > 1 ? `
            <h4 class="product-view__subhead" style="margin-top:16px">الحالة الحالية (الأحدث)</h4>
          ` : ''}
          <div class="kv-grid" style="margin-top:8px">
            <div><span class="kv-grid__label">تاريخ الاستلام</span><span class="mono">${Fmt.date(job.receiptDate)}</span></div>
            <div><span class="kv-grid__label">تكلفة هذه الحالة</span><span class="mono">${Fmt.currency(job.cost)}</span></div>
            <div><span class="kv-grid__label">العربون عند الاستلام</span><span class="mono">${Fmt.currency(job.deposit || 0)}</span></div>
            ${job.status === 'delivered' ? `<div><span class="kv-grid__label">المدفوع عند التسليم</span><span class="mono">${Fmt.currency(job.paymentAtDelivery || 0)}</span></div>` : ''}
            <div><span class="kv-grid__label">إجمالي المدفوع لهذه الحالة</span><span class="mono">${Fmt.currency(totalPaid)}</span></div>
            ${job.status === 'delivered' && remaining > 0 ? `<div><span class="kv-grid__label">مديونية متبقية (هذه الحالة)</span><span class="mono">${Fmt.currency(remaining)} — راجع قسم المديونات</span></div>` : ''}
            <div><span class="kv-grid__label">الحالة</span><span class="badge ${job.status === 'delivered' ? 'badge--ok' : 'badge--reorder'}">${statusLabel[job.status] || job.status}</span></div>
            ${job.deliveryDate ? `<div><span class="kv-grid__label">تاريخ التسليم</span><span class="mono">${Fmt.date(job.deliveryDate)}</span></div>` : ''}
          </div>

          ${job.partsUsed && job.partsUsed.length ? `
            <h4 class="product-view__subhead">أصناف استُخدمت (هذه الحالة)</h4>
            <table class="table table--compact">
              <thead><tr><th>الصنف</th><th>الكمية</th></tr></thead>
              <tbody>${job.partsUsed.map((p) => `<tr><td>${Fmt.escapeHtml(p.productNameAr)}</td><td class="mono">${Fmt.number(p.quantity)}</td></tr>`).join('')}</tbody>
            </table>
          ` : ''}
          ${job.notes ? `<p class="product-view__notes">${Fmt.escapeHtml(job.notes)}</p>` : ''}

          ${cases.length > 1 ? `
            <h4 class="product-view__subhead" style="margin-top:20px; border-top:1px solid var(--border); padding-top:12px">
              كل حالات الصيانة على هذا الكود (${cases.length}) — كل حالة مستقلة تمامًا بحسابها
            </h4>
            <table class="table table--compact">
              <thead><tr><th>#</th><th>التاريخ</th><th>التكلفة</th><th>العربون</th><th>الحالة</th><th>تاريخ التسليم</th></tr></thead>
              <tbody>
                ${cases.map((c, i) => `
                  <tr>
                    <td class="mono">${i + 1}</td>
                    <td>${Fmt.date(c.receiptDate)}</td>
                    <td class="mono">${Fmt.currency(c.cost)}</td>
                    <td class="mono">${Fmt.currency(c.deposit || 0)}</td>
                    <td><span class="badge ${c.status === 'delivered' ? 'badge--ok' : 'badge--reorder'}">${statusLabel[c.status] || c.status}</span></td>
                    <td class="mono">${c.deliveryDate ? Fmt.date(c.deliveryDate) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        `,
      });
    }
  },
};
