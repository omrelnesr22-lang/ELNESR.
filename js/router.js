/** EAGLE — راوتر بسيط قائم على الـ hash (#/products ...الخ) */

const Router = {
  routes: {},
  current: null,

  register(path, { title, render, icon }) {
    Router.routes[path] = { title, render, icon };
  },

  async start() {
    window.addEventListener('hashchange', Router.resolve);
    await Router.resolve();
  },

  async resolve() {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    const path = hash.split('?')[0];
    const route = Router.routes[path] || Router.routes['dashboard'];
    Router.current = path in Router.routes ? path : 'dashboard';

    document.querySelectorAll('.side-nav__link').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.route === Router.current);
    });

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = route.title;
    document.title = `${route.title} — EAGLE`;

    const main = document.getElementById('mainContent');
    main.classList.add('page--loading');
    try {
      await route.render(main);
      main.classList.remove('page--loading');
    } catch (err) {
      console.error(err);
      main.classList.remove('page--loading');
      main.innerHTML = `<div class="error-state">حدث خطأ أثناء تحميل الصفحة "${Fmt.escapeHtml(route.title)}":<br/><span class="mono" style="direction:ltr;display:inline-block;margin-top:8px">${Fmt.escapeHtml(err.message || err)}</span></div>`;
    }
  },

  navigate(path) {
    window.location.hash = '#/' + path;
  },
};
