/** EAGLE — إعدادات النظام (سجل واحد فقط id='main') */

const Settings = {
  cache: null,

  async load() {
    let s = await DB.get('settings', 'main');
    if (!s) {
      s = {
        id: 'main', companyName: 'منشأتي', logoDataUrl: '', phone: '', address: '', currencySymbol: 'ج.م',
        autoBackupEnabled: true, autoBackupIntervalDays: 3, lastBackupAt: null,
        accountsPassword: '', treasuryOpeningBalance: null, treasuryOpeningBalanceSet: false,
      };
      await DB.add('settings', s);
    }
    Settings.cache = s;
    return s;
  },

  async update(patch) {
    Validate.required(patch.companyName, 'اسم المنشأة');
    const merged = { ...Settings.cache, ...patch, id: 'main' };
    await DB.put('settings', merged);
    Settings.cache = merged;
    await Audit.log('settings', 'main', 'update', 'تحديث إعدادات النظام');
    return merged;
  },

  /** تحديد الرصيد الافتتاحي للخزنة أول مرة — من غير Validation كامل زي touchLastBackup */
  async setTreasuryOpeningBalance(amount) {
    const merged = { ...Settings.cache, treasuryOpeningBalance: Number(amount || 0), treasuryOpeningBalanceSet: true };
    await DB.put('settings', merged);
    Settings.cache = merged;
    await Audit.log('settings', 'main', 'update', `تحديد رصيد افتتاحي للخزنة: ${Number(amount || 0)}`);
    return merged;
  },

  /** تحديث خفيف لتاريخ آخر نسخة احتياطية فقط — من غير Validation أو ضجة في سجل العمليات */
  async touchLastBackup() {
    const merged = { ...Settings.cache, lastBackupAt: new Date().toISOString() };
    await DB.put('settings', merged);
    Settings.cache = merged;
  },
};
