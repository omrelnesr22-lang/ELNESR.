/**
 * EAGLE — صفحة الحسابات (بوابة محمية بكلمة مرور اختيارية)
 * تجمع تبويبات: الإيرادات (بيستخدم Pages.profits.render نفسها) + المصروفات
 * (بيستخدم Pages.expenses.render نفسها) + الخزنة (منطق جديد: رصيد افتتاحي +
 * إجمالي الإيرادات - إجمالي المصروفات، كل الوقت).
 * القفل بيفضل مفتوح طول الجلسة الحالية (لحد ما يعمل المستخدم تحديث للصفحة).
 */
Pages.accounts = {
  state: { tab: 'revenue' },
  unlocked: false,

  async render(container) {
    const s = Settings.cache || await Settings.load();

    // ---------- بوابة كلمة المرور ----------
    if (s.accountsPassword && !Pages.accounts.unlocked) {
      container.innerHTML = `
        <div class="lock-screen">
          <div class="lock-screen__box">
            <div class="lock-screen__icon">🔒</div>
            <h2>الحسابات محمية</h2>
            <p class="hint-note">أدخل كلمة المرور للمتابعة</p>
            <form data-form style="margin-top:16px">
              <input type="password" name="password" placeholder="كلمة المرور" autofocus style="text-align:center" />
              <p class="form-error" data-error hidden style="margin-top:10px"></p>
              <button type="submit" class="btn btn--primary" style="width:100%; margin-top:14px">دخول</button>
            </form>
          </div>
        </div>
      `;
      const form = container.querySelector('[data-form]');
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const errorEl = form.querySelector('[data-error]');
        if (fd.get('password') === s.accountsPassword) {
          Pages.accounts.unlocked = true;
          Pages.accounts.render(container);
        } else {
          errorEl.textContent = 'كلمة المرور غلط.';
          errorEl.hidden = false;
        }
      };
      return;
    }

    // ---------- المحتوى بعد فتح القفل (أو لو مفيش كلمة مرور أصلًا) ----------
    const st = Pages.accounts.state;
    container.innerHTML = `
      <div class="page-head">
        <div><h2 class="page-head__title">💰 الحسابات</h2><p class="page-head__sub">الإيرادات، المصروفات، والخزنة في مكان واحد</p></div>
      </div>

      <div class="tabs">
        <button class="tabs__btn ${st.tab === 'revenue' ? 'tabs__btn--active' : ''}" data-action="tab" data-tab="revenue">📈 الإيرادات</button>
        <button class="tabs__btn ${st.tab === 'expenses' ? 'tabs__btn--active' : ''}" data-action="tab" data-tab="expenses">📉 المصروفات</button>
        <button class="tabs__btn ${st.tab === 'treasury' ? 'tabs__btn--active' : ''}" data-action="tab" data-tab="treasury">🏦 الخزنة</button>
      </div>

      <div data-role="tabBody"></div>
    `;

    container.querySelectorAll('[data-action="tab"]').forEach((b) => {
      b.onclick = () => { st.tab = b.dataset.tab; Pages.accounts.render(container); };
    });

    const tabBody = container.querySelector('[data-role="tabBody"]');
    if (st.tab === 'revenue') await Pages.profits.render(tabBody);
    else if (st.tab === 'expenses') await Pages.expenses.render(tabBody);
    else await renderTreasury(tabBody);

    // ---------- تبويب الخزنة ----------
    async function renderTreasury(body) {
      const settingsNow = Settings.cache;

      // أول استخدام: لسه محددش رصيد افتتاحي
      if (!settingsNow.treasuryOpeningBalanceSet) {
        body.innerHTML = `
          <div class="empty-state">
            <p>🏦 دي أول مرة تفتح فيها الخزنة — محتاجين نحدد الرصيد اللي معاك دلوقتي كنقطة بداية.</p>
            <form data-form style="max-width:300px; margin:16px auto 0">
              <div class="field"><label>الرصيد الحالي (نقدًا)</label>
                <input type="number" step="0.01" min="0" name="openingBalance" value="0" autofocus /></div>
              <p class="form-error" data-error hidden></p>
              <button type="submit" class="btn btn--primary" style="width:100%; margin-top:10px">تأكيد وبدء المتابعة</button>
            </form>
          </div>
        `;
        const form = body.querySelector('[data-form]');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const errorEl = form.querySelector('[data-error]');
          errorEl.hidden = true;
          try {
            await Settings.setTreasuryOpeningBalance(fd.get('openingBalance'));
            UI.toast('تم تحديد الرصيد الافتتاحي');
            Router.resolve();
          } catch (err) {
            errorEl.textContent = err.message || String(err);
            errorEl.hidden = false;
          }
        };
        return;
      }

      // العرض العادي: افتتاحي + إيرادات - مصروفات = الرصيد الحالي
      const [revenueTotals, expensesGrandTotal] = await Promise.all([Profits.totals(), Expenses.grandTotal()]);
      const opening = Number(settingsNow.treasuryOpeningBalance || 0);
      const currentBalance = opening + revenueTotals.grandTotal - expensesGrandTotal;

      body.innerHTML = `
        <div class="hero-band">
          <div class="hero-stat">
            <span class="hero-stat__label">الرصيد الحالي بالخزنة</span>
            <span class="hero-stat__value">${Fmt.currency(currentBalance)}</span>
          </div>
        </div>
        <div class="table-card">
          <table class="table">
            <tbody>
              <tr><td class="table__strong">الرصيد الافتتاحي</td><td class="mono" style="text-align:left">${Fmt.currency(opening)}</td></tr>
              <tr><td class="table__strong">إجمالي الإيرادات (كل الوقت)</td><td class="mono" style="text-align:left; color:var(--success)">+ ${Fmt.currency(revenueTotals.grandTotal)}</td></tr>
              <tr><td class="table__strong">إجمالي المصروفات (كل الوقت)</td><td class="mono" style="text-align:left; color:var(--danger)">- ${Fmt.currency(expensesGrandTotal)}</td></tr>
              <tr style="border-top:2px solid var(--border)"><td class="table__strong">= الرصيد الحالي</td><td class="mono" style="text-align:left; font-weight:700">${Fmt.currency(currentBalance)}</td></tr>
            </tbody>
          </table>
        </div>
        <p class="hint-note" style="margin-top:10px">الرصيد بيتحدث تلقائيًا مع كل عملية بيع أو صيانة مُسلّمة أو مصروف جديد. لو محتاج تعدّل الرصيد الافتتاحي، كلم الدعم أو عدّل الإعدادات يدويًا من قاعدة البيانات.</p>
        <div style="margin-top:10px">
          <button type="button" class="btn btn--ghost btn--sm" data-action="edit-opening">✎ تعديل الرصيد الافتتاحي</button>
        </div>
      `;

      body.querySelector('[data-action="edit-opening"]').onclick = () => {
        const { close, bodyEl } = UI.openModal({
          title: 'تعديل الرصيد الافتتاحي',
          size: 'modal--sm',
          bodyHtml: `
            <form data-form>
              <div class="field"><label>الرصيد الافتتاحي</label>
                <input type="number" step="0.01" min="0" name="openingBalance" value="${opening}" autofocus /></div>
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
            await Settings.setTreasuryOpeningBalance(fd.get('openingBalance'));
            close();
            UI.toast('تم تحديث الرصيد الافتتاحي');
            Router.resolve();
          } catch (err) {
            errorEl.textContent = err.message || String(err);
            errorEl.hidden = false;
          }
        };
      };
    }
  },
};
