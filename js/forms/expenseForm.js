/** نموذج إضافة مصروف عام */

const ExpenseForm = {
  async open({ onSaved }) {
    const categories = [
      'إيجار',
      'كهرباء',
      'مياه',
      'صيانة',
      'خدمات',
      'تأمين',
      'نقل',
      'إعلانات',
      'أخرى'
    ];

    const { close, bodyEl } = UI.openModal({
      title: 'إضافة مصروف',
      size: 'modal--sm',
      bodyHtml: `
        <form data-form>
          <div class="field">
            <label>فئة المصروف <span class="req">*</span></label>
            <select name="category" autofocus>
              <option value="">-- اختر فئة --</option>
              ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
              <option value="">-- أخرى (اكتب يدويًا) --</option>
            </select>
          </div>
          <div class="field">
            <label>البيان <span class="req">*</span></label>
            <input type="text" name="description" placeholder="مثال: إيجار الشهر الحالي" />
          </div>
          <div class="field">
            <label>المبلغ <span class="req">*</span></label>
            <input type="number" step="0.01" min="0.01" name="amount" />
          </div>
          <div class="field">
            <label>التاريخ</label>
            <input type="date" name="date" value="${Fmt.todayIso()}" />
          </div>
          <p class="form-error" data-error hidden></p>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
            <button type="submit" class="btn btn--primary">حفظ المصروف</button>
          </div>
        </form>
      `,
    });

    const form = bodyEl.querySelector('[data-form]');
    const categorySelect = form.querySelector('[name="category"]');
    const errorEl = form.querySelector('[data-error]');

    bodyEl.querySelector('[data-cancel]').onclick = close;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      errorEl.hidden = true;

      try {
        const category = fd.get('category') || fd.get('category');
        if (!category) throw new EagleError('يجب اختيار أو إدخال فئة المصروف.');

        await Expenses.addExpense({
          category,
          description: fd.get('description'),
          amount: fd.get('amount'),
          date: fd.get('date'),
        });

        close();
        UI.toast('تم حفظ المصروف بنجاح');
        if (onSaved) onSaved();
      } catch (err) {
        errorEl.textContent = err.message || String(err);
        errorEl.hidden = false;
      }
    };
  },
};
