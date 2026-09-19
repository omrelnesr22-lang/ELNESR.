/** EAGLE — عناصر واجهة عامة: Toast + Confirm Dialog + Modal */

const UI = {
  toast(message, type = 'success') {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <span class="toast__icon">${type === 'success' ? '✓' : type === 'error' ? '!' : 'ⓘ'}</span>
      <span class="toast__msg">${Fmt.escapeHtml(message)}</span>
    `;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--in'));
    setTimeout(() => {
      el.classList.remove('toast--in');
      setTimeout(() => el.remove(), 250);
    }, 3200);
  },

  confirm({ title = 'تأكيد العملية', message, danger = false, confirmLabel = 'تأكيد' }) {
    return new Promise((resolve) => {
      const host = document.getElementById('modalHost');
      host.innerHTML = `
        <div class="modal-overlay" data-role="overlay">
          <div class="modal modal--sm" role="alertdialog" aria-modal="true">
            <div class="modal__body">
              <h3 class="modal__title">${Fmt.escapeHtml(title)}</h3>
              <p class="modal__text">${Fmt.escapeHtml(message)}</p>
            </div>
            <div class="modal__actions">
              <button class="btn btn--ghost" data-role="cancel">إلغاء</button>
              <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-role="ok">${Fmt.escapeHtml(confirmLabel)}</button>
            </div>
          </div>
        </div>`;
      const overlay = host.querySelector('[data-role="overlay"]');
      const close = (result) => {
        overlay.classList.remove('modal-overlay--in');
        setTimeout(() => { host.innerHTML = ''; resolve(result); }, 150);
      };
      overlay.querySelector('[data-role="cancel"]').onclick = () => close(false);
      overlay.querySelector('[data-role="ok"]').onclick = () => close(true);
      overlay.onclick = (e) => { if (e.target === overlay) close(false); };
      requestAnimationFrame(() => overlay.classList.add('modal-overlay--in'));
    });
  },

  /** يفتح Modal بمحتوى حر (للفورمات) ويرجّع دوال للتحكم فيه */
  openModal({ title, bodyHtml, size = '' }) {
    const host = document.getElementById('modalHost');
    host.innerHTML = `
      <div class="modal-overlay" data-role="overlay">
        <div class="modal ${size}" role="dialog" aria-modal="true">
          <div class="modal__header">
            <h3 class="modal__title">${Fmt.escapeHtml(title)}</h3>
            <button class="modal__close" data-role="x" aria-label="إغلاق">✕</button>
          </div>
          <div class="modal__body" data-role="body">${bodyHtml}</div>
        </div>
      </div>`;
    const overlay = host.querySelector('[data-role="overlay"]');
    const close = () => {
      overlay.classList.remove('modal-overlay--in');
      setTimeout(() => { host.innerHTML = ''; }, 150);
    };
    overlay.querySelector('[data-role="x"]').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--in'));
    return { close, bodyEl: overlay.querySelector('[data-role="body"]') };
  },
};
