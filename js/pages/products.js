/**
 * EAGLE — صفحة الأصناف
 * وضع البحث: نتيجة مسطّحة (زي الأول) للبحث السريع باسم/كود.
 * وضع التصفح (بدون بحث): أكورديون حسب "النوع" — نفس فكرة تجميع المصروفات بالأيام.
 * قسم "غير مصنف" بيظهر دايمًا في الآخر للأصناف اللي من غير نوع.
 */
Pages.products = {
  state: { search: '', status: '', expandedCategory: null },

  async render(container) {
    const [products, categories] = await Promise.all([Products.list(), Categories.list()]);
    const s = Pages.products.state;

    const withLow = products.map((p) => ({ p, low: Products.isLowStock(p) }));
    const matchesStatus = (r) => (s.status === 'low' ? r.low : s.status === 'ok' ? !r.low : true);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h2 class="page-head__title">الأصناف</h2>
          <p class="page-head__sub">${products.length} صنف إجمالًا في ${categories.length} نوع</p>
        </div>
        <div style="display:flex; gap:8px">
          <button class="btn btn--ghost" data-action="add-category">+ إضافة نوع جديد</button>
          <button class="btn btn--primary" data-action="add">+ إضافة صنف</button>
        </div>
      </div>

      <div class="filter-bar">
        <input type="search" class="filter-bar__search" placeholder="ابحث بالاسم أو الكود…" value="${Fmt.escapeHtml(s.search)}" data-role="search" />
        <select data-role="status">
          <option value="">كل الحالات</option>
          <option value="ok" ${s.status === 'ok' ? 'selected' : ''}>متوفر</option>
          <option value="low" ${s.status === 'low' ? 'selected' : ''}>وصل لحد التنبيه</option>
        </select>
      </div>

      ${products.length === 0 ? `
        <div class="empty-state"><p>لا توجد أصناف حتى الآن.</p><button class="btn btn--primary" data-action="add">إضافة أول صنف</button></div>
      ` : s.search.trim() ? renderSearchResults() : renderGrouped()}
    `;

    function rowHtml(p, low) {
      return `
        <tr data-id="${p.id}">
          <td class="mono">${Fmt.escapeHtml(p.code)}</td>
          <td class="table__strong">${Fmt.escapeHtml(p.nameAr)}</td>
          <td class="mono">${Fmt.number(p.quantity)}</td>
          <td class="mono">${Fmt.currency(p.purchasePrice)}</td>
          <td class="mono">${Fmt.currency(p.salePrice)}</td>
          <td><span class="badge ${low ? 'badge--low' : 'badge--ok'}">${low ? 'وصل لحد التنبيه' : 'متوفر'}</span></td>
          <td class="mono" style="font-size:12px">${Fmt.date((p.priceHistory && p.priceHistory.length > 0) ? p.priceHistory[p.priceHistory.length - 1].date : p.createdAt)}</td>
          <td class="table__actions">
            <button class="icon-btn" data-action="add-qty" title="إضافة كمية">➕</button>
            <button class="icon-btn" data-action="edit" title="تعديل">✎</button>
            <button class="icon-btn icon-btn--danger" data-action="delete" title="حذف">🗑</button>
          </td>
        </tr>`;
    }

    function tableHtml(rows) {
      if (rows.length === 0) return `<p class="panel__empty">لا توجد أصناف مطابقة هنا.</p>`;
      return `
        <table class="table">
          <thead><tr><th>الكود</th><th>الاسم</th><th>الكمية</th><th>سعر التكلفة</th><th>سعر البيع</th><th>الحالة</th><th>آخر تحديث</th><th class="table__actions-col">إجراءات</th></tr></thead>
          <tbody>${rows.map(({ p, low }) => rowHtml(p, low)).join('')}</tbody>
        </table>`;
    }

    function renderSearchResults() {
      const q = s.search.trim().toLowerCase();
      const rows = withLow
        .filter(({ p }) => p.nameAr.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
        .filter(matchesStatus)
        .sort((a, b) => a.p.nameAr.localeCompare(b.p.nameAr, 'ar'));
      return `<div class="table-card">${tableHtml(rows)}</div>`;
    }

    function renderGrouped() {
      const groups = categories.map((c) => ({
        id: c.id, name: c.name,
        rows: withLow.filter(({ p }) => p.categoryId === c.id).filter(matchesStatus).sort((a, b) => a.p.nameAr.localeCompare(b.p.nameAr, 'ar')),
      }));
      const uncategorizedRows = withLow.filter(({ p }) => !p.categoryId).filter(matchesStatus).sort((a, b) => a.p.nameAr.localeCompare(b.p.nameAr, 'ar'));
      groups.push({ id: null, name: 'غير مصنف', rows: uncategorizedRows });

      return `
        <div class="table-card">
          <div style="font-size:14px">
            ${groups.map((g) => {
              const isExpanded = s.expandedCategory === (g.id || 'uncategorized');
              return `
                <div style="border-bottom:1px solid var(--border-soft); padding:12px 0">
                  <button type="button" class="btn btn--ghost btn--sm" data-action="toggle-category" data-cat="${g.id || 'uncategorized'}" style="width:100%; text-align:right; justify-content:space-between">
                    <span>${isExpanded ? '▼' : '▶'}</span>
                    <strong>${Fmt.escapeHtml(g.name)}</strong>
                    <span class="mono">${g.rows.length} صنف</span>
                  </button>
                  ${isExpanded ? `
                    <div style="padding:12px 8px; background:var(--surface-2)">
                      <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:10px">
                        ${g.id ? `
                          <button class="btn btn--ghost btn--sm" data-action="rename-category" data-cat="${g.id}">✎ تعديل الاسم</button>
                          <button class="btn btn--ghost btn--sm" data-action="delete-category" data-cat="${g.id}">🗑 حذف النوع</button>
                        ` : ''}
                        <button class="btn btn--primary btn--sm" data-action="add-in-category" data-cat="${g.id || ''}">+ إضافة صنف هنا</button>
                      </div>
                      ${tableHtml(g.rows)}
                    </div>
                  ` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ---------- بحث وفلترة ----------
    const searchEl = container.querySelector('[data-role="search"]');
    let debounceTimer;
    searchEl.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { s.search = searchEl.value; Pages.products.render(container); }, 300);
    };
    container.querySelector('[data-role="status"]').onchange = (e) => { s.status = e.target.value; Pages.products.render(container); };

    // ---------- طي/فرد الأنواع ----------
    container.querySelectorAll('[data-action="toggle-category"]').forEach((b) => {
      b.onclick = () => {
        s.expandedCategory = s.expandedCategory === b.dataset.cat ? null : b.dataset.cat;
        Pages.products.render(container);
      };
    });

    // ---------- إدارة الأنواع ----------
    container.querySelectorAll('[data-action="add-category"]').forEach((b) => b.onclick = () => openCategoryForm(null));
    container.querySelectorAll('[data-action="rename-category"]').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); openCategoryForm(categories.find((c) => c.id === b.dataset.cat)); };
    });
    container.querySelectorAll('[data-action="delete-category"]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const cat = categories.find((c) => c.id === b.dataset.cat);
        const ok = await UI.confirm({
          title: 'حذف نوع',
          message: `حذف نوع "${cat.name}"؟\n\nكل الأصناف تحته هتتنقل تلقائيًا لقسم "غير مصنف" (مش هتتحذف).`,
          danger: true, confirmLabel: 'حذف',
        });
        if (!ok) return;
        try { await Categories.remove(cat.id); UI.toast('تم حذف النوع ونقل أصنافه لقسم "غير مصنف"'); s.expandedCategory = null; Pages.products.render(container); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    // ---------- أزرار الأصناف ----------
    container.querySelectorAll('[data-action="add"]').forEach((b) => b.onclick = () => openForm(null));
    container.querySelectorAll('[data-action="add-in-category"]').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); openForm(null, b.dataset.cat || null); };
    });
    container.querySelectorAll('[data-action="add-qty"]').forEach((b) => {
      b.onclick = () => openAddQuantityForm(products.find((p) => p.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="edit"]').forEach((b) => {
      b.onclick = () => openForm(products.find((p) => p.id === b.closest('tr').dataset.id));
    });
    container.querySelectorAll('[data-action="delete"]').forEach((b) => {
      b.onclick = async () => {
        const p = products.find((x) => x.id === b.closest('tr').dataset.id);
        const ok = await UI.confirm({ title: 'حذف صنف', message: `هل أنت متأكد من حذف "${p.nameAr}"؟`, danger: true, confirmLabel: 'حذف' });
        if (!ok) return;
        try { await Products.remove(p.id); UI.toast('تم حذف الصنف'); Pages.products.render(container); }
        catch (err) { UI.toast(err.message || String(err), 'error'); }
      };
    });

    // ---------- مودال إضافة/تعديل نوع ----------
    function openCategoryForm(existing) {
      const { close, bodyEl } = UI.openModal({
        title: existing ? 'تعديل اسم النوع' : 'إضافة نوع جديد',
        size: 'modal--sm',
        bodyHtml: `
          <form data-form>
            <div class="field"><label>اسم النوع</label>
              <input type="text" name="name" value="${Fmt.escapeHtml(existing?.name || '')}" placeholder="مثال: غسالة، خلاط..." autofocus /></div>
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">حفظ</button>
            </div>
          </form>
        `,
      });
      const form = bodyEl.querySelector('[data-form]');
      bodyEl.querySelector('[data-cancel]').onclick = close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const errorEl = form.querySelector('[data-error]');
        errorEl.hidden = true;
        try {
          let cat;
          if (existing) cat = await Categories.rename(existing.id, fd.get('name'));
          else cat = await Categories.create(fd.get('name'));
          close();
          UI.toast(existing ? 'تم تعديل اسم النوع' : 'تم إضافة النوع بنجاح');
          s.expandedCategory = cat.id; // نفتحه على طول عشان يضيف أصنافه
          Pages.products.render(container);
        } catch (err) {
          errorEl.textContent = err.message || String(err);
          errorEl.hidden = false;
        }
      };
    }

    function openAddQuantityForm(product) {
      const { close, bodyEl } = UI.openModal({
        title: `إضافة كمية جديدة — ${product.nameAr}`,
        size: 'modal--sm',
        bodyHtml: `
          <form data-form>
            <div class="field"><label>الكمية الحالية</label>
              <input type="text" value="${Fmt.number(product.quantity)}" disabled style="background:#f0f0f0" /></div>
            <div class="field"><label>الكمية المضافة <span class="req">*</span></label>
              <input type="number" step="1" min="1" name="addQty" autofocus /></div>
            <div class="field"><label>سعر شراء الوحدة <span class="req">*</span></label>
              <input type="number" step="0.01" min="0.01" name="newPrice" value="${product.purchasePrice}" /></div>
            ${product.priceHistory && product.priceHistory.length > 0 ? `
              <p class="hint-note">السعر الحالي: ${Fmt.currency(product.purchasePrice)} (آخر تحديث: ${Fmt.date(product.priceHistory[product.priceHistory.length - 1].date)})</p>
            ` : ''}
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">إضافة الكمية</button>
            </div>
          </form>
        `,
      });
      const form = bodyEl.querySelector('[data-form]');
      bodyEl.querySelector('[data-cancel]').onclick = close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const errorEl = form.querySelector('[data-error]');
        errorEl.hidden = true;
        try {
          await Products.addQuantity(product.id, fd.get('addQty'), fd.get('newPrice'));
          close();
          UI.toast('تم إضافة الكمية بنجاح');
          Router.resolve();
        } catch (err) {
          errorEl.textContent = err.message || String(err);
          errorEl.hidden = false;
        }
      };
    }

    function openForm(existing, presetCategoryId) {
      const { close, bodyEl } = UI.openModal({
        title: existing ? 'تعديل صنف' : 'إضافة صنف',
        bodyHtml: `
          <form data-form>
            <div class="field"><label>اسم الصنف</label>
              <input type="text" name="nameAr" value="${Fmt.escapeHtml(existing?.nameAr || '')}" autofocus /></div>

            <div class="field"><label>النوع</label>
              <div style="display:flex; gap:6px">
                <select name="categoryId" data-role="categorySelect" style="flex:1">
                  <option value="">غير مصنف</option>
                  ${categories.map((c) => `<option value="${c.id}" ${(existing?.categoryId ?? presetCategoryId) === c.id ? 'selected' : ''}>${Fmt.escapeHtml(c.name)}</option>`).join('')}
                </select>
                <button type="button" class="btn btn--ghost btn--sm" data-role="newCategoryToggle">+ نوع جديد</button>
              </div>
              <input type="text" data-role="newCategoryInput" placeholder="اكتب اسم النوع الجديد" hidden style="margin-top:6px" />
            </div>

            ${existing ? `
            <div class="field">
              <label>أسعار الشراء</label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
                <div style="border:1px solid var(--border); padding:8px; border-radius:4px; background:var(--surface-2)">
                  <div style="font-size:11px; color:var(--text-secondary)">🕐 السعر القديم</div>
                  <div style="font-weight:600; font-size:14px">${Fmt.currency(existing.oldPurchasePrice || 0)}</div>
                </div>
                <div style="border:1px solid var(--border); padding:8px; border-radius:4px; background:var(--surface-2)">
                  <div style="font-size:11px; color:var(--text-secondary)">✨ السعر الجديد</div>
                  <div style="font-weight:600; font-size:14px">${Fmt.currency(existing.newPurchasePrice || 0)}</div>
                </div>
                <div style="border:2px solid var(--success); padding:8px; border-radius:4px; background:var(--surface-success)">
                  <div style="font-size:11px; color:var(--success); font-weight:600">✅ السعر المستخدم</div>
                  <div style="font-weight:600; font-size:14px; color:var(--success)">${Fmt.currency(existing.purchasePrice || 0)}</div>
                </div>
              </div>
              <span class="hint-note" style="margin-top:8px">السعر المستخدم هو الأعلى بين القديم والجديد — يتغير فقط من زر "➕ إضافة كمية"</span>
            </div>
            ` : `
            <div class="field"><label>سعر الشراء الابتدائي</label>
              <input type="number" step="0.01" min="0" name="purchasePrice" value="" placeholder="0.00" /></div>
            `}
            <div class="field-row">
              <div class="field"><label>الكود</label>
                <input type="text" name="code" value="${Fmt.escapeHtml(existing?.code || '')}" placeholder="يُنشأ تلقائيًا لو فاضي" dir="ltr" /></div>
              <div class="field"><label>الكمية الحالية</label>
                <input type="number" step="1" min="0" name="quantity" value="${existing?.quantity ?? 0}" ${existing ? 'readonly style="background:#f0f0f0"' : ''} /></div>
            </div>
            <div class="field"><label>سعر البيع</label>
              <input type="number" step="0.01" min="0" name="salePrice" value="${existing?.salePrice ?? ''}" style="max-width:200px" /></div>
            <div class="field"><label>حد التنبيه الأدنى</label>
              <input type="number" step="1" min="0" name="minAlert" value="${existing?.minAlert ?? ''}" style="max-width:200px" />
              <span class="hint-note">لما الكمية توصل للرقم ده أو تقل عنه، هيظهر تنبيه. اتركه صفر لو مش عايز تنبيه لهذا الصنف.</span>
            </div>
            <div class="field"><label>ملاحظات</label><textarea name="notes" rows="2">${Fmt.escapeHtml(existing?.notes || '')}</textarea></div>
            <p class="form-error" data-error hidden></p>
            <div class="modal__actions">
              <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
              <button type="submit" class="btn btn--primary">حفظ الصنف</button>
            </div>
          </form>
        `,
      });
      const form = bodyEl.querySelector('[data-form]');
      bodyEl.querySelector('[data-cancel]').onclick = close;

      // تبديل: اختيار نوع موجود ↔ كتابة نوع جديد
      const categorySelect = form.querySelector('[data-role="categorySelect"]');
      const newCategoryInput = form.querySelector('[data-role="newCategoryInput"]');
      const newCategoryToggle = form.querySelector('[data-role="newCategoryToggle"]');
      let addingNewCategory = false;
      newCategoryToggle.onclick = () => {
        addingNewCategory = !addingNewCategory;
        categorySelect.hidden = addingNewCategory;
        newCategoryInput.hidden = !addingNewCategory;
        newCategoryToggle.textContent = addingNewCategory ? 'اختيار من الموجود' : '+ نوع جديد';
        if (addingNewCategory) newCategoryInput.focus();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        const errorEl = form.querySelector('[data-error]');
        errorEl.hidden = true;
        try {
          // تحديد النوع النهائي: إما المختار من القايمة، أو نوع جديد بيتنشئ دلوقتي
          if (addingNewCategory && newCategoryInput.value.trim()) {
            const newCat = await Categories.create(newCategoryInput.value.trim());
            data.categoryId = newCat.id;
          } else {
            data.categoryId = categorySelect.value || null;
          }

          if (existing) await Products.update(existing.id, data);
          else await Products.create(data);
          close();
          UI.toast(existing ? 'تم تعديل الصنف بنجاح' : 'تم حفظ الصنف بنجاح');
          Router.resolve();
        } catch (err) {
          errorEl.textContent = err.message || String(err);
          errorEl.hidden = false;
        }
      };
    }
  },
};
