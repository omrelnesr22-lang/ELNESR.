/**
 * EAGLE — فورم إضافة مديونية يدوية (مشترك)
 * مستخرج من صفحة المديونات عشان لوحة التحكم تقدر تفتحه كمان.
 */

const DebtForm = {
  open({ onSaved } = {}) {
    const { close, bodyEl } = UI.openModal({
      title: 'إضافة مديونية يدويًا',
      bodyHtml: `
        <form data-form>
          <div class="field-row">
            <div class="field"><label>اسم الشخص</label><input type="text" name="personName" autofocus /></div>
            <div class="field"><label>رقم الهاتف</label><input type="text" name="phone" dir="ltr" /></div>
          </div>
          <div class="field"><label>سبب المديونية / البيان</label><input type="text" name="reason" placeholder="مثال: سلفة، بضاعة بالأجل..." /></div>
          <div class="field-row">
            <div class="field"><label>قيمة المديونية <span class="req">*</span></label><input type="number" step="0.01" min="0.01" name="amount" /></div>
            <div class="field"><label>التاريخ</label><input type="date" name="date" value="${Fmt.todayIso()}" /></div>
          </div>
          <div class="field"><label>الدفع حينها (إن وجد)</label><input type="number" step="0.01" min="0" name="paidNow" placeholder="افتراضيًا = صفر" style="max-width:220px" /></div>
          <div class="field"><label>ملاحظات</label><textarea name="notes" rows="2"></textarea></div>
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
      const errorEl = form.querySelector('[data-error]');
      errorEl.hidden = true;
      try {
        await Debts.createManual(data);
        close();
        UI.toast('تم إضافة المديونية بنجاح');
        if (onSaved) onSaved(); else Router.resolve();
      } catch (err) {
        errorEl.textContent = err.message || String(err);
        errorEl.hidden = false;
      }
    };
  },
};
