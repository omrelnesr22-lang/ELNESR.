/**
 * EAGLE — خدمة المديونات
 * ثلاث طرق لإنشاء دين (بيع / صيانة / يدوي) لكنها كلها تنتهي في سجل واحد.
 * قاعدة مهمة: تسديد دين لاحقًا لا يُحسب كربح جديد أبدًا — الربح اتحسب
 * وقت البيع/التسليم نفسه بغض النظر عن قيمة المدفوع وقتها.
 */

const Debts = {
  async list() {
    const items = await DB.getAll('debts');
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async get(id) {
    return DB.get('debts', id);
  },

  /** يُستخدم داخليًا من خدمتي المبيعات والصيانة — مش بينادى مباشرة من الواجهة */
  async createFromTransaction({ source, sourceId, sourceLabel, personName, phone, debtAmount, date }) {
    const amount = Number(debtAmount || 0);
    if (amount <= 0) return null; // لا مديونية لو المدفوع يساوي أو أكبر من المطلوب
    const rec = await DB.add('debts', {
      personName: (personName || '').trim() || 'غير محدد',
      phone: (phone || '').trim(),
      source, sourceId, sourceLabel,
      originalAmount: amount,
      paidAmount: 0,
      remainingAmount: amount,
      status: 'unpaid',
      date: date || Fmt.todayIso(),
      notes: '',
      payments: [],
    });
    await Audit.log('debts', rec.id, 'create', `مديونية جديدة (${sourceLabel}) بقيمة ${amount}`);
    return rec;
  },

  async createManual(data) {
    const amount = Number(data.amount || 0);
    Validate.greaterThanZero(amount, 'قيمة المديونية');
    const paidNow = Number(data.paidNow || 0);
    if (paidNow > amount) throw new EagleError('الدفع حينها لا يمكن أن يكون أكبر من قيمة المديونية.');
    const remaining = amount - paidNow;
    const date = data.date || Fmt.todayIso();
    const rec = await DB.add('debts', {
      personName: (data.personName || '').trim() || 'غير محدد',
      phone: (data.phone || '').trim(),
      source: 'manual',
      sourceId: null,
      sourceLabel: (data.reason || '').trim() || 'مديونية يدوية',
      originalAmount: amount,
      paidAmount: paidNow,
      remainingAmount: remaining,
      status: remaining <= 0 ? 'paid' : (paidNow > 0 ? 'partial' : 'unpaid'),
      date,
      notes: data.notes || '',
      payments: paidNow > 0 ? [{ date, amount: paidNow }] : [],
    });
    await Audit.log('debts', rec.id, 'create', `مديونية يدوية: ${rec.sourceLabel} بقيمة ${amount}${paidNow > 0 ? ` (مدفوع حينها ${paidNow})` : ''}`);
    return rec;
  },

  /** كل مديونيات شخص معين (بالاسم) + إجمالي المتبقي عليه حاليًا — لسجل الشخص */
  async byPerson(personName) {
    const all = await DB.getAll('debts');
    const name = (personName || '').trim();
    const debts = all
      .filter((d) => (d.personName || '').trim() === name)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalOutstanding = debts.filter((d) => d.status !== 'paid').reduce((s, d) => s + d.remainingAmount, 0);
    return { personName: name, debts, totalOutstanding };
  },

  async recordPayment(id, amount, date) {
    const pay = Number(amount || 0);
    Validate.greaterThanZero(pay, 'مبلغ السداد');
    const debt = await DB.get('debts', id);
    if (!debt) throw new EagleError('المديونية غير موجودة.');
    if (debt.status === 'paid') throw new EagleError('تم حذف هذه المديونية من السجل بالفعل.');
    if (pay > debt.remainingAmount) {
      throw new EagleError(`مبلغ السداد (${pay}) أكبر من المتبقي (${debt.remainingAmount}).`);
    }
    const newPaid = debt.paidAmount + pay;
    const newRemaining = debt.originalAmount - newPaid;
    
    // إذا تم السداد الكامل، حذف المديونية من السجل بدل تحديث الحالة
    if (newRemaining <= 0) {
      await DB.delete('debts', id);
      await Audit.log('debts', id, 'payment', `حذف مديونية بعد السداد الكامل ${newPaid} من ${debt.personName} (${debt.sourceLabel})`);
      return null; // إشارة إلى أن المديونية تم حذفها
    }
    
    // إذا كان الدفع جزئي فقط، تحديث المديونية
    const rec = await DB.put('debts', {
      ...debt,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: 'partial',
      payments: [...(debt.payments || []), { date: date || Fmt.todayIso(), amount: pay }],
    });
    await Audit.log('debts', id, 'payment', `تسجيل سداد جزئي ${pay} من مديونية ${debt.personName} (${debt.sourceLabel})`);
    return rec;
  },

  async remove(id) {
    const debt = await DB.get('debts', id);
    if (!debt) return;
    if (debt.paidAmount > 0) {
      throw new EagleError('لا يمكن حذف مديونية تم سداد جزء منها بالفعل — حافظ عليها في السجل التاريخي.');
    }
    await DB.delete('debts', id);
    await Audit.log('debts', id, 'delete', `حذف مديونية: ${debt.personName} (${debt.sourceLabel})`);
  },

  async totalOutstanding() {
    const all = await DB.getAll('debts');
    return all.filter((d) => d.status !== 'paid').reduce((s, d) => s + d.remainingAmount, 0);
  },

  async unpaidCount() {
    const all = await DB.getAll('debts');
    return all.filter((d) => d.status !== 'paid').length;
  },
};
