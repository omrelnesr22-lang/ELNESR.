/** EAGLE — صفحة الإعدادات (نسخة مبسّطة) */
Pages.settings = {
  async render(container) {
    const s = Settings.cache || await Settings.load();

    container.innerHTML = `
      <div class="page-head">
        <div><h2 class="page-head__title">الإعدادات</h2><p class="page-head__sub">بيانات المنشأة والنسخ الاحتياطي</p></div>
      </div>

      <form data-form class="settings-form">
        <section class="settings-section">
          <h3>بيانات المنشأة</h3>
          <div class="field-row">
            <div class="field"><label>اسم المنشأة <span class="req">*</span></label>
              <input type="text" name="companyName" value="${Fmt.escapeHtml(s.companyName || '')}" /></div>
            <div class="field"><label>رقم الهاتف</label><input type="text" name="phone" value="${Fmt.escapeHtml(s.phone || '')}" /></div>
          </div>
          <div class="field"><label>العنوان</label><input type="text" name="address" value="${Fmt.escapeHtml(s.address || '')}" /></div>
          <div class="field"><label>رمز العملة</label><input type="text" name="currencySymbol" value="${Fmt.escapeHtml(s.currencySymbol || '')}" style="max-width:140px" /></div>
          <div class="field">
            <label>الشعار</label>
            <div class="logo-picker">
              ${s.logoDataUrl ? `<img src="${s.logoDataUrl}" class="logo-picker__preview" alt="الشعار" />` : `<div class="logo-picker__placeholder">EAGLE</div>`}
              <input type="file" name="logo" accept="image/*" />
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h3>النسخ الاحتياطي</h3>
          <p class="hint-note">بما إن النظام يعمل بالكامل داخل هذا المتصفح، النسخة الاحتياطية هي الطريقة الوحيدة لحماية بياناتك أو نقلها لجهاز آخر.</p>
          <p class="hint-note" style="margin-top:6px">
            آخر نسخة احتياطية: <strong class="mono">${s.lastBackupAt ? Fmt.dateTime(s.lastBackupAt) : 'لم تُنشأ نسخة بعد'}</strong>
          </p>
          <div class="backup-actions" style="margin-top:10px">
            <button type="button" class="btn btn--ghost" data-action="export">⬇ تصدير نسخة احتياطية الآن</button>
            <label class="btn btn--ghost" style="cursor:pointer">⬆ استيراد نسخة احتياطية<input type="file" accept="application/json" data-action="import" hidden /></label>
          </div>
          <div class="field field--inline" style="margin-top:16px">
            <label><input type="checkbox" name="autoBackupEnabled" ${s.autoBackupEnabled !== false ? 'checked' : ''} /> تفعيل النسخ الاحتياطي التلقائي عند فتح النظام</label>
          </div>
          <div class="field" style="max-width:220px">
            <label>تنزيل نسخة تلقائية كل (يوم)</label>
            <input type="number" min="1" step="1" name="autoBackupIntervalDays" value="${s.autoBackupIntervalDays ?? 3}" />
          </div>
        </section>

        <section class="settings-section">
          <h3>🔒 كلمة مرور الحسابات</h3>
          <p class="hint-note">قسم "الحسابات" (الإيرادات والمصروفات والخزنة) محمي بكلمة مرور منفصلة. الحالة الحالية: <strong>${s.accountsPassword ? '🔒 محمي' : '🔓 غير محمي'}</strong></p>
          ${s.accountsPassword ? `
            <div class="field" style="max-width:260px; margin-top:8px">
              <label>كلمة المرور الحالية <span class="req">*</span></label>
              <input type="password" name="currentAccountsPassword" placeholder="لازم تكتبها عشان تقدر تغيّر أو تلغي الحماية" autocomplete="off" />
            </div>
          ` : ''}
          <div class="field" style="max-width:260px; margin-top:8px">
            <label>${s.accountsPassword ? 'كلمة المرور الجديدة' : 'تحديد كلمة مرور'}</label>
            <input type="password" name="accountsPassword" placeholder="${s.accountsPassword ? 'سيبها فاضية لو مش عايز تغيّرها' : 'اكتب كلمة مرور'}" autocomplete="new-password" />
          </div>
          ${s.accountsPassword ? `<button type="button" class="btn btn--ghost" data-action="clear-accounts-password" style="margin-top:8px">🗑 إلغاء الحماية نهائيًا</button>` : ''}
        </section>

        <p class="form-error" data-error hidden></p>
        <div class="settings-form__actions"><button type="submit" class="btn btn--primary">حفظ الإعدادات</button></div>
      </form>
    `;

    const form = container.querySelector('[data-form]');
    let pendingLogo = null;
    form.querySelector('[name="logo"]').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { pendingLogo = reader.result; };
      reader.readAsDataURL(file);
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.autoBackupEnabled = fd.get('autoBackupEnabled') === 'on';
      data.autoBackupIntervalDays = Number(fd.get('autoBackupIntervalDays') || 3);
      if (pendingLogo) data.logoDataUrl = pendingLogo;
      delete data.logo;
      const errorEl = form.querySelector('[data-error]');
      errorEl.hidden = true;

      // كلمة مرور الحسابات: تغييرها مشروط بكتابة الباسورد الحالية الصح أولًا
      // (إلا أول مرة — لو مفيش باسورد محدد أصلًا، مفيش حاجة نتحقق منها)
      if (!data.accountsPassword) {
        // الحقل فاضي — مفيش تغيير مطلوب، سيبها زي ما هي
        delete data.accountsPassword;
      } else if (s.accountsPassword) {
        // فيه باسورد قديمة محفوظة بالفعل — لازم تتأكد إنه كتب الصح قبل الاستبدال
        if (data.currentAccountsPassword !== s.accountsPassword) {
          errorEl.textContent = 'كلمة المرور الحالية اللي كتبتها غلط — محدش من الإعدادات اتغيّر.';
          errorEl.hidden = false;
          return;
        }
      }
      // أول مرة (s.accountsPassword فاضي): مفيش تحقق مطلوب، بيتسجل على طول
      delete data.currentAccountsPassword;

      try {
        await Settings.update(data);
        UI.toast('تم حفظ الإعدادات بنجاح');
        App.applyBranding();
        Router.resolve();
      } catch (err) {
        errorEl.textContent = err.message || String(err);
        errorEl.hidden = false;
      }
    };

    const clearPwdBtn = container.querySelector('[data-action="clear-accounts-password"]');
    if (clearPwdBtn) {
      clearPwdBtn.onclick = async () => {
        const currentInput = form.querySelector('[name="currentAccountsPassword"]');
        const typed = currentInput ? currentInput.value : '';
        if (typed !== s.accountsPassword) {
          UI.toast('اكتب كلمة المرور الحالية الصح في الخانة فوق الأول عشان تقدر تلغي الحماية', 'error');
          if (currentInput) currentInput.focus();
          return;
        }
        const ok = await UI.confirm({ title: 'إلغاء حماية الحسابات', message: 'هيبقى أي حد يقدر يفتح قسم الحسابات من غير كلمة مرور. متأكد؟', danger: true, confirmLabel: 'إلغاء الحماية' });
        if (!ok) return;
        await Settings.update({ ...Settings.cache, accountsPassword: '' });
        UI.toast('تم إلغاء حماية الحسابات');
        Router.resolve();
      };
    }

    container.querySelector('[data-action="export"]').onclick = async () => {
      await Backup.downloadNow(false);
      UI.toast('تم تصدير النسخة الاحتياطية');
      Router.resolve();
    };

    container.querySelector('[data-action="import"]').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await UI.confirm({ title: 'استيراد نسخة احتياطية', message: 'سيتم استبدال كل البيانات الحالية بمحتوى الملف المستورد. هل تريد المتابعة؟', danger: true, confirmLabel: 'استيراد واستبدال' });
      if (!ok) { e.target.value = ''; return; }
      try {
        const dump = JSON.parse(await file.text());
        await DB.importAll(dump);
        UI.toast('تم استيراد النسخة الاحتياطية بنجاح');
        await Settings.load();
        App.applyBranding();
        Router.resolve();
      } catch (err) {
        UI.toast('تعذر استيراد الملف — تأكد أنه ملف نسخة احتياطية صحيح', 'error');
      }
    };

  },
};
