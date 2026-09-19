/** EAGLE — أدوات تنسيق الأرقام والتواريخ والعملة */

const Fmt = {
  currency(value) {
    const n = Number(value || 0);
    const settings = Settings.cache || {};
    const symbol = settings.currencySymbol || 'ج.م';
    return n.toLocaleString('ar-EG-u-nu-latn', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
  },

  number(value, decimals = 0) {
    const n = Number(value || 0);
    return n.toLocaleString('ar-EG-u-nu-latn', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  date(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
  },

  dateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
      ' — ' + d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  },

  todayIso() {
    return new Date().toISOString().slice(0, 10);
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  },
};
