/** EAGLE — نقطة الإقلاع */

const App = {
  async applyBranding() {
    const s = Settings.cache || await Settings.load();
    document.getElementById('brandCompanyName').textContent = s.companyName || 'منشأتي';
    const logoSlot = document.getElementById('brandLogoSlot');
    logoSlot.innerHTML = s.logoDataUrl
      ? `<img src="${s.logoDataUrl}" alt="${Fmt.escapeHtml(s.companyName || '')}" class="brand__logo-img" />`
      : App.eagleMark();
  },

  eagleMark() {
    return `<svg viewBox="0 0 40 40" class="brand__mark" aria-hidden="true"><path d="M20 4 L34 20 L26 20 L32 34 L20 26 L8 34 L14 20 L6 20 Z" fill="var(--gold)"/></svg>`;
  },

  registerRoutes() {
    const required = ['dashboard', 'products', 'sales', 'maintenance', 'debts', 'expenses', 'profits', 'accounts', 'storage', 'settings'];
    const missing = required.filter((p) => !Pages[p] || typeof Pages[p].render !== 'function');
    if (missing.length > 0) {
      throw new Error(`فشل تحميل بعض ملفات الصفحات (${missing.join('، ')}) — تأكد إن كل ملفات مجلد js/pages موجودة بجانب index.html.`);
    }
    Router.register('dashboard', { title: 'لوحة التحكم', render: Pages.dashboard.render });
    Router.register('products', { title: 'الأصناف', render: Pages.products.render });
    Router.register('sales', { title: 'المبيعات', render: Pages.sales.render });
    Router.register('maintenance', { title: 'الصيانة', render: Pages.maintenance.render });
    Router.register('debts', { title: 'المديونات', render: Pages.debts.render });
    Router.register('expenses', { title: 'المصروفات', render: Pages.expenses.render });
    Router.register('profits', { title: 'الإيرادات', render: Pages.profits.render });
    Router.register('accounts', { title: 'الحسابات', render: Pages.accounts.render });
    Router.register('storage', { title: 'مخزن المستعمل', render: Pages.storage.render });
    Router.register('settings', { title: 'الإعدادات', render: Pages.settings.render });
  },

  bindSidebarToggle() {
    const toggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sideNav');
    const scrim = document.getElementById('navScrim');
    const open = () => { sidebar.classList.add('is-open'); scrim.hidden = false; };
    const close = () => { sidebar.classList.remove('is-open'); scrim.hidden = true; };
    toggle.onclick = () => (sidebar.classList.contains('is-open') ? close() : open());
    scrim.onclick = close;
    sidebar.querySelectorAll('.side-nav__link').forEach((a) => a.addEventListener('click', close));
  },

  async boot() {
    DB.onBlocked = () => {
      document.getElementById('mainContent').innerHTML = `
        <div class="error-state">
          النظام مفتوح في تبويب آخر بنسخة أقدم من قاعدة البيانات، فالمتصفح مانع تحديثها.<br/>
          اقفل كل تبويبات EAGLE التانية ثم أعد تحميل هذه الصفحة (F5).
        </div>`;
    };
    await DB.openDb();
    await Settings.load();
    await App.applyBranding();
    App.registerRoutes();
    App.bindSidebarToggle();
    await Router.start();

    // بعد ما الواجهة اشتغلت، نتحقق لو محتاجين ننزّل نسخة احتياطية تلقائية
    try {
      const ran = await Backup.checkAndRunAuto();
      if (ran) UI.toast('تم إنشاء نسخة احتياطية تلقائية في مجلد التنزيلات', 'info');
    } catch (err) {
      console.error('auto backup failed', err);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.boot().catch((err) => {
    console.error(err);
    document.getElementById('mainContent').innerHTML =
      `<div class="error-state">تعذر تشغيل النظام: ${Fmt.escapeHtml(err.message || err)}</div>`;
  });
});
