/**
 * EAGLE — فورم استلام/تعديل عملية صيانة (مشترك)
 * مستخرج من صفحة الصيانة عشان لوحة التحكم تقدر تفتحه كمان.
 */

const MaintenanceForm = {
  async open({ existing = null, onSaved } = {}) {
    const products = await Products.list();
    const hasParts = !!(existing?.partsUsed && existing.partsUsed.length > 0);

    function partRowHtml(part) {
      return `
        <div class="ob-row ob-row--parts" data-part-row>
          <div class="ob-row__product" data-field="productPicker"></div>
          <input type="number" step="1" min="1" data-field="quantity" placeholder="الكمية" value="${part?.quantity ?? ''}" />
          <button type="button" class="icon-btn icon-btn--danger" data-remove-row title="حذف السطر">✕</button>
        </div>`;
    }

    const { close, bodyEl } = UI.openModal({
      title: existing ? 'تعديل عملية صيانة' : 'استلام جهاز للصيانة',
      size: 'modal--lg',
      bodyHtml: `
        <form data-form>
          <div class="field-row">
            <div class="field"><label>اسم الجهاز</label>
              <input type="text" name="deviceName" value="${Fmt.escapeHtml(existing?.deviceName || '')}" autofocus /></div>
            <div class="field"><label>الكود</label>
              <input type="text" name="code" value="${Fmt.escapeHtml(existing?.code || '')}" placeholder="يُنشأ تلقائيًا لو فاضي" dir="ltr" ${existing ? 'readonly style="background:#f0f0f0"' : ''} />
              ${!existing ? `<div data-role="existingRecordInfo" hidden style="margin-top:8px; padding:10px; border:1px solid var(--gold); border-radius:4px; background:var(--surface-2); font-size:12px"></div>` : ''}
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>اسم العميل</label>
              <input type="text" name="customerName" value="${Fmt.escapeHtml(existing?.customerName || '')}" placeholder="مطلوب فقط لو هيكون فيه مديونية" /></div>
            <div class="field"><label>رقم الهاتف</label>
              <input type="text" name="phone" value="${Fmt.escapeHtml(existing?.phone || '')}" dir="ltr" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>تاريخ الاستلام</label>
              <input type="date" name="receiptDate" value="${existing?.receiptDate ? existing.receiptDate.slice(0, 10) : Fmt.todayIso()}" /></div>
            <div class="field"><label>تكلفة الصيانة (لهذه الحالة فقط)</label>
              <input type="number" step="0.01" min="0" name="cost" value="${existing?.cost ?? ''}" /></div>
          </div>
          <div class="field">
            <label>العربون (المدفوع عند الاستلام — لهذه الحالة فقط)</label>
            <input type="number" step="0.01" min="0" name="deposit" value="${existing?.deposit ?? ''}" placeholder="افتراضيًا = صفر" style="max-width:260px" />
            <span class="hint-note">مش الدفع النهائي — التسوية والمديونية بيتحسبوا لاحقًا عند التسليم. كل حالة صيانة مستقلة بحسابها الخاص تمامًا.</span>
          </div>

          <div class="field field--inline" style="margin-bottom:10px">
            <label><input type="checkbox" data-role="usedParts" ${hasParts ? 'checked' : ''} /> استخدمت أصناف من المخزون في الصيانة؟ (اختياري)</label>
          </div>
          <div class="ob-items" data-parts-section ${hasParts ? '' : 'hidden'}>
            <div data-part-rows>${(hasParts ? existing.partsUsed : [null]).map(partRowHtml).join('')}</div>
            <button type="button" class="btn btn--ghost btn--sm" data-add-part-row style="margin-top:4px;margin-bottom:14px">+ إضافة صنف مستخدم</button>
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
    const partsSection = bodyEl.querySelector('[data-parts-section]');
    const partRowsHost = bodyEl.querySelector('[data-part-rows]');
    const usedPartsToggle = bodyEl.querySelector('[data-role="usedParts"]');
    bodyEl.querySelector('[data-cancel]').onclick = close;

    function bindPartRow(rowEl, initialProductId) {
      const pickerHost = rowEl.querySelector('[data-field="productPicker"]');
      rowEl._picker = ProductPicker.mount(pickerHost, { products, initialProductId });
      rowEl.querySelector('[data-remove-row]').onclick = () => {
        if (partRowsHost.querySelectorAll('[data-part-row]').length <= 1) return;
        rowEl.remove();
      };
    }
    partRowsHost.querySelectorAll('[data-part-row]').forEach((rowEl, i) => {
      bindPartRow(rowEl, hasParts ? existing.partsUsed[i]?.productId : null);
    });
    bodyEl.querySelector('[data-add-part-row]').onclick = () => {
      partRowsHost.insertAdjacentHTML('beforeend', partRowHtml(null));
      bindPartRow(partRowsHost.lastElementChild, null);
    };
    usedPartsToggle.onchange = () => { partsSection.hidden = !usedPartsToggle.checked; };

    // **بحث لحظي عن الكود — لو الكود موجود بالفعل، اعرض السجل القديم**
    if (!existing) {
      const codeInput = form.querySelector('[name="code"]');
      const infoBox = form.querySelector('[data-role="existingRecordInfo"]');
      const statusLabel = { in_progress: 'قيد الصيانة', delivered: 'تم التسليم' };
      codeInput.addEventListener('blur', async () => {
        const code = codeInput.value.trim();
        if (!code) { infoBox.hidden = true; return; }
        const found = await Maintenance.getByCode(code);
        if (found) {
          const cases = found.cases || [];
          infoBox.innerHTML = `
            <strong style="color:var(--gold)">⚠️ الكود ده مسجل بالفعل — هيتسجل كـ"حالة جديدة مستقلة" على نفس السجل (بتكلفتها وعربونها الخاص، من غير أي جمع مع القديم)</strong>
            <div style="margin-top:6px">
              <div>الجهاز: <strong>${Fmt.escapeHtml(found.deviceName || '—')}</strong></div>
              <div>العميل: <strong>${Fmt.escapeHtml(found.customerName || '—')}</strong> — ${Fmt.escapeHtml(found.phone || '—')}</div>
              <div>عدد الحالات السابقة: <strong>${cases.length}</strong></div>
            </div>
            ${cases.length > 0 ? `
              <div style="margin-top:8px; border-top:1px solid var(--border); padding-top:6px">
                <strong>سجل الحالات:</strong>
                ${cases.map((c, i) => `
                  <div style="margin-top:4px; display:flex; justify-content:space-between">
                    <span>📅 ${Fmt.date(c.receiptDate)} — حالة ${i + 1} — ${statusLabel[c.status] || c.status}</span>
                    <span class="mono">تكلفة: ${Fmt.currency(c.cost)} / عربون: ${Fmt.currency(c.deposit || 0)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          `;
          infoBox.hidden = false;
        } else {
          infoBox.hidden = true;
        }
      });
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.parts = [];
      if (usedPartsToggle.checked) {
        partRowsHost.querySelectorAll('[data-part-row]').forEach((r) => {
          const productId = r._picker ? r._picker.getProductId() : null;
          const quantity = r.querySelector('[data-field="quantity"]').value;
          if (productId && quantity) data.parts.push({ productId, quantity });
        });
      }
      const errorEl = form.querySelector('[data-error]');
      errorEl.hidden = true;
      try {
        if (existing) await Maintenance.update(existing.id, data);
        else await Maintenance.create(data);
        close();
        UI.toast(existing ? 'تم تعديل العملية' : 'تم تسجيل استلام الجهاز');
        if (onSaved) onSaved(); else Router.resolve();
      } catch (err) {
        errorEl.textContent = err.message || String(err);
        errorEl.hidden = false;
      }
    };
  },
};
