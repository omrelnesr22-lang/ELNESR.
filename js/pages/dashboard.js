/** EAGLE — لوحة التحكم: الوضع الحالي والعمليات المحتاجة متابعة (بدون تفاصيل الإيرادات) */
Pages.dashboard = {
  async render(container) {
    const [lowStock, activity, inProgressJobs, recentDebts] = await Promise.all([
      Dashboard.lowStockAlerts(), Dashboard.recentActivity(6),
      Maintenance.inProgressJobs(), Dashboard.recentDebts(6),
    ]);
    const sourceIcon = { sale: '🛒', maintenance: '🔧', manual: '✍️' };

    container.innerHTML = `
      <div class="filter-bar" style="margin-bottom:16px; position:relative">
        <input type="text" class="search-box" placeholder="🔍 بحث عام: كود • هاتف • اسم عميل..." data-role="globalSearch" />
        <div data-role="searchResults" hidden style="position:absolute; top:45px; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-radius:4px; max-height:400px; overflow-y:auto; z-index:10"></div>
      </div>

      <div class="quick-actions">
        <button class="quick-action" data-action="new-sale">
          <span class="quick-action__icon">🛒</span>
          <span class="quick-action__text">
            <strong>تسجيل عملية بيع</strong>
            <span>خصم من المخزون + حساب الربح</span>
          </span>
        </button>
        <button class="quick-action" data-action="new-maintenance">
          <span class="quick-action__icon">🔧</span>
          <span class="quick-action__text">
            <strong>استلام جهاز صيانة</strong>
            <span>تسجيل الجهاز والعربون</span>
          </span>
        </button>
        <button class="quick-action" data-action="new-debt">
          <span class="quick-action__icon">💳</span>
          <span class="quick-action__text">
            <strong>إضافة مديونية</strong>
            <span>مديونية يدوية على شخص</span>
          </span>
        </button>
      </div>

      <div class="dash-grid">
        <div class="panel panel--wide">
          <div class="panel__head">
            <h3>🔧 أجهزة قيد الصيانة</h3>
            ${inProgressJobs.length > 0 ? `<span class="badge badge--reorder">${inProgressJobs.length}</span>` : ''}
          </div>
          ${inProgressJobs.length === 0 ? `<p class="panel__empty">مفيش أجهزة قيد الصيانة دلوقتي.</p>` : `
            <div class="detail-list">
              ${inProgressJobs.map((j) => `
                <div class="detail-card">
                  <div class="detail-card__row"><strong>${Fmt.escapeHtml(j.deviceName || 'بدون اسم')}</strong><span class="badge badge--reorder">قيد الصيانة</span></div>
                  <div class="detail-card__grid">
                    <span>الشخص: ${Fmt.escapeHtml(j.customerName || '—')}</span>
                    <span>الكود: <span class="mono">${Fmt.escapeHtml(j.code)}</span></span>
                    <span>تاريخ الاستلام: ${Fmt.date(j.receiptDate)}</span>
                    <span>الهاتف: <span class="mono">${Fmt.escapeHtml(j.phone || '—')}</span></span>
                    <span>التكلفة: ${Fmt.currency(j.cost)}</span>
                    <span>العربون: ${Fmt.currency(j.deposit || 0)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="panel panel--wide">
          <div class="panel__head">
            <h3>💳 المديونات</h3>
            ${recentDebts.length > 0 ? `<a href="#/debts" class="panel__link">عرض الكل</a>` : ''}
          </div>
          ${recentDebts.length === 0 ? `<p class="panel__empty">لا توجد مديونيات مسجلة.</p>` : `
            <div class="detail-list">
              ${recentDebts.map((d) => `
                <div class="detail-card">
                  <div class="detail-card__row"><strong>${Fmt.escapeHtml(d.personName)}</strong><span class="mono">${Fmt.date(d.date)}</span></div>
                  <div class="detail-card__row">
                    <span>${sourceIcon[d.source]} مديونية ${d.source === 'sale' ? 'بيع' : d.source === 'maintenance' ? 'صيانة' : 'يدوية'}</span>
                    <span class="mono">${Fmt.currency(d.remainingAmount)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="panel">
          <div class="panel__head">
            <h3>تنبيهات المخزون</h3>
            ${lowStock.length > 0 ? `<span class="badge badge--low">${lowStock.length}</span>` : ''}
          </div>
          ${lowStock.length === 0 ? `<p class="panel__empty">مفيش أصناف وصلت لحد التنبيه دلوقتي.</p>` : `
            <ul class="alert-list">
              ${lowStock.map((p) => `
                <li class="alert-list__row">
                  <span class="badge badge--low">⚠️ تنبيه مخزون</span>
                  <span class="alert-list__name">${Fmt.escapeHtml(p.nameAr)} — الحد الأدنى ${Fmt.number(p.minAlert)}</span>
                  <span class="alert-list__qty mono">متبقي: ${Fmt.number(p.quantity)}</span>
                </li>
              `).join('')}
            </ul>
          `}
        </div>

        <div class="panel">
          <div class="panel__head"><h3>آخر العمليات</h3></div>
          ${activity.length === 0 ? `<p class="panel__empty">لا توجد عمليات مسجلة بعد.</p>` : `
            <ul class="activity-list">
              ${activity.map((a) => `
                <li>
                  <span class="activity-list__dot"></span>
                  <div><p>${Fmt.escapeHtml(a.description)}</p><span class="activity-list__time">${Fmt.dateTime(a.date)}</span></div>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>
    `;

    // الأزرار السريعة — بتفتح نفس المربعات الحوارية بتاعة الأقسام، وبعد الحفظ
    // بتعيد رسم لوحة التحكم نفسها عشان السجلات تتحدث فورًا من غير ما تسيب الصفحة.
    const refresh = () => Pages.dashboard.render(container);
    container.querySelector('[data-action="new-sale"]').onclick = () => SaleForm.open({ onSaved: refresh });
    container.querySelector('[data-action="new-maintenance"]').onclick = () => MaintenanceForm.open({ onSaved: refresh });
    container.querySelector('[data-action="new-debt"]').onclick = () => DebtForm.open({ onSaved: refresh });

    // البحث العام
    const searchBox = container.querySelector('[data-role="globalSearch"]');
    const searchResults = container.querySelector('[data-role="searchResults"]');
    
    if (searchBox) {
      searchBox.oninput = async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          searchResults.hidden = true;
          return;
        }
        
        const results = await Search.globalSearch(query);
        const allResults = [...(results.products || []), ...(results.debts || [])];
        
        if (allResults.length === 0) {
          searchResults.innerHTML = `<div style="padding:12px; color:var(--text-secondary); text-align:center">لا توجد نتائج</div>`;
          searchResults.hidden = false;
          return;
        }
        
        searchResults.innerHTML = `
          <div style="padding:8px">
            ${results.products && results.products.length > 0 ? `
              <div style="margin-bottom:8px">
                <div style="font-size:12px; font-weight:600; color:var(--text-secondary); padding:4px 8px">📦 الأصناف</div>
                ${results.products.map(p => `
                  <div style="padding:8px; border-radius:3px; cursor:pointer; hover:background:var(--surface-2)" onclick="location.hash='#/products'">
                    <strong>${Fmt.escapeHtml(p.nameAr)}</strong>
                    <span class="mono" style="font-size:11px">(${Fmt.escapeHtml(p.code)})</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${results.debts && results.debts.length > 0 ? `
              <div>
                <div style="font-size:12px; font-weight:600; color:var(--text-secondary); padding:4px 8px">💳 المديونات</div>
                ${results.debts.map(d => `
                  <div style="padding:8px; border-radius:3px; cursor:pointer; hover:background:var(--surface-2)" onclick="location.hash='#/debts'">
                    <strong>${Fmt.escapeHtml(d.personName)}</strong>
                    <span class="mono" style="font-size:11px">${Fmt.escapeHtml(d.phone || '—')}</span>
                    <span style="float:right; color:var(--danger)">${Fmt.currency(d.remainingAmount)}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
        searchResults.hidden = false;
      };
    }
  },
};
