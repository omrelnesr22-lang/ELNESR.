/** EAGLE — صفحة المخزن الشخصي (اسم الشيء + الكمية فقط) */
Pages.storage = {
  async render(container) {
    const items = await Storage.list();

    container.innerHTML = `
      <div class="page-head">
        <div><h2 class="page-head__title">📦 مخزن المستعمل</h2><p class="page-head__sub">${items.length} عنصر</p></div>
        <button class="btn btn--primary" data-action="add">+ إضافة للمخزن</button>
      </div>

      ${items.length === 0 ? `
        <div class="empty-state"><p>مخزن المستعمل فاضي دلوقتي.</p><button class="btn btn--primary" data-action="add">إضافة أول عنصر</button></div>
      ` : `
      <div class="table-card">
        <table class="table">
          <thead><tr><th>اسم الشيء</th><th>الكمية</th><th>ملاحظات</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>
            ${items.map((it) => `
              <tr data-id="${it.id}">
                <td class="table__strong">${Fmt.escapeHtml(it.itemName || '—')}</td>
                <td class="mono">${Fmt.number(it.quantity)}</td>
                <td>${Fmt.escapeHtml(it.notes || '—')}</td>
                <td class="table__actions">
                  <button class="icon-btn" data-action="edit" title="تعديل">✎</button>
                  <button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;

    container.querySelectorAll('[data-action="add"]').forEach((b) => b.onclick = () => openForm(null));
    container.querySelectorAll('[data-action="edit"]').forEach((b) => {
      b.onclick = () => openForm(items.find((it) => it.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => {
      b.onclick = async () => {
        const it = items.find((x) => x.id === b.closest('tr').dataset.id);
        const ok = await UI.confirm({ title: 'حذف من المخزن', message: `حذف "${it.itemName}"؟`, danger: true, confirmLabel: 'حذف' });
        if (!ok) return;
        try { await Storage.remove(it.id); UI.toast('تم الحذف'); Router.resolve(); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    function openForm(existing) {
      const { close, bodyEl } = UI.openModal({
        title: existing ? 'تعديل عنصر' : 'إضافة للمخزن',
        bodyHtml: `
          <form data-form>
            <div class="field-row">
              <div class="field"><label>اسم الشيء</label><input type="text" name="itemName" value="${Fmt.escapeHtml(existing?.itemName || '')}" autofocus /></div>
              <div class="field"><label>الكمية</label><input type="number" step="1" min="0" name="quantity" value="${existing?.quantity ?? 0}" /></div>
            </div>
            <div class="field"><label>ملاحظات</label><textarea name="notes" rows="2">${Fmt.escapeHtml(existing?.notes || '')}</textarea></div>
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">حفظ</button>
            </div>
          </form>`,
      });
      const form = bodyEl.querySelector('[data-form]');
      bodyEl.querySelector('[data-cancel]').onclick = close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        try {
          if (existing) await Storage.update(existing.id, data);
          else await Storage.create(data);
          close();
          UI.toast(existing ? 'تم التعديل' : 'تم الإضافة');
          Router.resolve();
        } catch (err) {
          UI.toast(err.message || String(err), 'error');
        }
      };
    }
  },
};
