/**
 * EAGLE — فورم عملية البيع (مشترك)
 * مستخرج من صفحة المبيعات عشان لوحة التحكم تقدر تفتحه كمان.
 * onSaved: بيتنادى بعد الحفظ الناجح عشان الصفحة اللي فتحته تحدّث نفسها.
 */

const SaleForm = {
  async open({ onSaved } = {}) {
    const products = await Products.list();
    if (products.length === 0) {
      UI.toast('محتاج تضيف صنف واحد على الأقل قبل تسجيل أي بيع', 'error');
      return;
    }

    function rowHtml() {
      return `
        <div class="ob-row" data-row>
          <div class="ob-row__product" data-field="productPicker"></div>
          <input type="number" step="1" min="1" data-field="quantity" placeholder="الكمية" />
          <div class="ob-row__price-cell">
            <input type="number" step="0.01" min="0" data-field="salePrice" placeholder="سعر البيع" />
            <small data-role="suggestedPrice" class="ob-row__price-hint"></small>
          </div>
          <span class="ob-row__value mono" data-role="rowValue">${Fmt.currency(0)}</span>
          <button type="button" class="icon-btn icon-btn--danger" data-remove-row title="حذف السطر">✕</button>
        </div>`;
    }

    const { close, bodyEl } = UI.openModal({
      title: 'عملية بيع جديدة',
      size: 'modal--lg',
      bodyHtml: `
        <form data-form>
          <div class="field-row">
            <div class="field"><label>التاريخ</label><input type="date" name="date" value="${Fmt.todayIso()}" /></div>
            <div class="field"><label>اسم العميل (اختياري)</label><input type="text" name="personName" placeholder="مطلوب فقط لو هيكون فيه مديونية" /></div>
          </div>

          <div class="ob-items">
            <div class="ob-row ob-row--head"><span>الصنف</span><span>الكمية</span><span>سعر البيع</span><span>الإجمالي</span><span></span></div>
            <div data-rows>${rowHtml()}</div>
            <button type="button" class="btn btn--ghost btn--sm" data-add-row style="margin-top:8px">+ إضافة صنف للفاتورة</button>
          </div>

          <div class="ob-total"><span>إجمالي عملية البيع</span><span class="mono" data-role="grandTotal">${Fmt.currency(0)}</span></div>

          <div class="field-row" style="margin-top:14px">
            <div class="field"><label>رقم هاتف العميل (اختياري)</label><input type="text" name="phone" dir="ltr" /></div>
            <div class="field"><label>المبلغ المدفوع فعليًا</label>
              <input type="number" step="0.01" min="0" name="amountPaid" data-role="amountPaid" placeholder="افتراضيًا = الإجمالي (مدفوع بالكامل)" /></div>
          </div>
          <p class="hint-note" data-role="debtHint" hidden></p>

          <div class="field" style="margin-top:6px"><label>ملاحظات</label><textarea name="notes" rows="2"></textarea></div>
          <p class="form-error" data-error hidden></p>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
            <button type="submit" class="btn btn--primary">حفظ عملية البيع</button>
          </div>
        </form>
      `,
    });

    const form = bodyEl.querySelector('[data-form]');
    const rowsHost = bodyEl.querySelector('[data-rows]');
    const amountPaidInput = bodyEl.querySelector('[data-role="amountPaid"]');
    const debtHint = bodyEl.querySelector('[data-role="debtHint"]');
    bodyEl.querySelector('[data-cancel]').onclick = close;

    function currentTotal() {
      let total = 0;
      rowsHost.querySelectorAll('[data-row]').forEach((r) => {
        total += Number(r.querySelector('[data-field="quantity"]').value || 0) * Number(r.querySelector('[data-field="salePrice"]').value || 0);
      });
      return total;
    }
    function updateTotals() {
      bodyEl.querySelector('[data-role="grandTotal"]').textContent = Fmt.currency(currentTotal());
      const total = currentTotal();
      const paidRaw = amountPaidInput.value;
      const paid = paidRaw === '' ? total : Number(paidRaw);
      const debt = total - paid;
      if (debt > 0) {
        debtHint.hidden = false;
        debtHint.textContent = `⚠️ هيتسجل مديونية بقيمة ${Fmt.currency(debt)} — يفضّل تحديد اسم العميل عشان تقدر تتابعها.`;
      } else {
        debtHint.hidden = true;
      }
    }
    amountPaidInput.addEventListener('input', updateTotals);

    function recalcRow(rowEl) {
      const qty = Number(rowEl.querySelector('[data-field="quantity"]').value || 0);
      const price = Number(rowEl.querySelector('[data-field="salePrice"]').value || 0);
      rowEl.querySelector('[data-role="rowValue"]').textContent = Fmt.currency(qty * price);
      updateTotals();
    }
    function bindRow(rowEl) {
      const pickerHost = rowEl.querySelector('[data-field="productPicker"]');
      rowEl._picker = ProductPicker.mount(pickerHost, {
        products,
        onChange: (product) => {
          if (product) {
            // ملء سعر البيع بسعر البيع المقترح
            rowEl.querySelector('[data-field="salePrice"]').value = product.salePrice;
            // عرض السعر الأعلى (التكلفة) كمرجع
            const suggestedEl = rowEl.querySelector('[data-role="suggestedPrice"]');
            if (suggestedEl) {
              suggestedEl.textContent = `التكلفة: ${Fmt.currency(product.purchasePrice)}`;
            }
          }
          recalcRow(rowEl);
        },
      });
      rowEl.querySelectorAll('[data-field="quantity"], [data-field="salePrice"]').forEach((el) => el.addEventListener('input', () => recalcRow(rowEl)));
      rowEl.querySelector('[data-remove-row]').onclick = () => {
        if (rowsHost.querySelectorAll('[data-row]').length <= 1) return;
        rowEl.remove();
        updateTotals();
      };
    }
    rowsHost.querySelectorAll('[data-row]').forEach(bindRow);
    bodyEl.querySelector('[data-add-row]').onclick = () => {
      rowsHost.insertAdjacentHTML('beforeend', rowHtml());
      bindRow(rowsHost.lastElementChild);
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const items = [];
      rowsHost.querySelectorAll('[data-row]').forEach((r) => {
        const productId = r._picker ? r._picker.getProductId() : null;
        const quantity = r.querySelector('[data-field="quantity"]').value;
        const salePrice = r.querySelector('[data-field="salePrice"]').value;
        if (productId || quantity) items.push({ productId, quantity, salePrice });
      });
      const errorEl = form.querySelector('[data-error]');
      errorEl.hidden = true;
      try {
        await Sales.create({
          date: fd.get('date'), notes: fd.get('notes'), items,
          personName: fd.get('personName'), phone: fd.get('phone'), amountPaid: fd.get('amountPaid'),
        });
        close();
        UI.toast('تم تسجيل عملية البيع وتحديث المخزون والإيرادات بنجاح');
        if (onSaved) onSaved(); else Router.resolve();
      } catch (err) {
        errorEl.textContent = err.message || String(err);
        errorEl.hidden = false;
      }
    };
  },
};
