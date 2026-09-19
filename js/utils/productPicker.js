/**
 * EAGLE — أداة اختيار صنف بالبحث الذكي، بديل الـ <select> العادي.
 * تستخدمها المبيعات وقطع الصيانة المستخدمة، عشان تفضل نفس التجربة في مكان واحد.
 */

const ProductPicker = {
  /**
   * @param {HTMLElement} container - عنصر فاضي (زي <div>) هيتحول لأداة البحث
   * @param {Object} opts
   * @param {Array} opts.products
   * @param {string} [opts.initialProductId]
   * @param {function} [opts.onChange] - بينادى بالـ product المختار أو null
   */
  mount(container, { products, initialProductId, onChange }) {
    const initial = products.find((p) => p.id === initialProductId) || null;

    container.classList.add('product-picker');
    container.innerHTML = `
      <input type="text" class="product-picker__input" placeholder="اكتب اسم أو كود الصنف للبحث…" autocomplete="off"
             value="${initial ? Fmt.escapeHtml(initial.nameAr) : ''}" />
      <div class="product-picker__menu" hidden></div>
    `;

    const input = container.querySelector('.product-picker__input');
    const menu = container.querySelector('.product-picker__menu');
    let selected = initial;

    function renderResults(query) {
      const results = FuzzySearch.search(query, products, (p) => `${p.nameAr} ${p.code}`).slice(0, 8);
      menu.innerHTML = results.length === 0
        ? `<div class="product-picker__empty">لا توجد أصناف مطابقة</div>`
        : results.map((p) => `
            <div class="product-picker__item" data-id="${p.id}">
              <span>${Fmt.escapeHtml(p.nameAr)} <span class="mono" style="color:var(--text-faint)">(${Fmt.escapeHtml(p.code)})</span></span>
              <span class="mono product-picker__item-meta">متاح: ${Fmt.number(p.quantity)}</span>
            </div>`).join('');
      menu.hidden = false;
      menu.querySelectorAll('[data-id]').forEach((el) => {
        el.onmousedown = (e) => e.preventDefault(); // يمنع فقدان الـ focus قبل الكليك
        el.onclick = () => {
          selected = products.find((p) => p.id === el.dataset.id) || null;
          input.value = selected ? selected.nameAr : '';
          menu.hidden = true;
          if (onChange) onChange(selected);
        };
      });
    }

    input.addEventListener('focus', () => renderResults(input.value));
    input.addEventListener('input', () => {
      selected = null;
      renderResults(input.value);
      if (onChange) onChange(null);
    });
    input.addEventListener('blur', () => {
      setTimeout(() => { menu.hidden = true; }, 150);
    });

    return {
      getProduct: () => selected,
      getProductId: () => (selected ? selected.id : null),
    };
  },
};
