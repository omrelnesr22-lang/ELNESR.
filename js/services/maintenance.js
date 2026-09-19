/**
 * EAGLE — خدمة الصيانة
 * كل "كود" ممكن يبقى ليه أكتر من "حالة/زيارة" صيانة عبر الزمن (نفس الجهاز رجع تاني مثلاً).
 * كل حالة مستقلة تمامًا: ليها تكلفتها وعربونها ومديونيتها الخاصة — من غير أي جمع مع الحالات اللي قبلها.
 * بيانات الجهاز/العميل (الاسم، الهاتف) بتتحدث لآخر قيمة بس التكلفة والعربون بيفضلوا منفصلين لكل حالة.
 *
 * حالة قيد الصيانة → تم التسليم. الإيراد بيتضاف فقط عند التسليم.
 * العربون (وقت الاستلام) منفصل تمامًا عن التسوية النهائية (وقت التسليم):
 *   - عند الاستلام: بيتسجل عربون بس، ومفيش أي مديونية بتتحسب لسه.
 *   - عند التسليم: إجمالي المدفوع لهذه الحالة = العربون + المدفوع وقت التسليم.
 *     المتبقي = تكلفة هذه الحالة - إجمالي المدفوع → لو أكبر من صفر، تتسجل مديونية.
 */

const Maintenance = {
  async list() {
    const items = await DB.getAll('maintenanceJobs');
    return items.sort((a, b) => new Date(b.receiptDate) - new Date(a.receiptDate));
  },

  async get(id) {
    return DB.get('maintenanceJobs', id);
  },

  async getByCode(code) {
    const items = await DB.getByIndex('maintenanceJobs', 'code', code);
    return items && items.length > 0 ? items[0] : null;
  },

  async create(data) {
    const code = (data.code || '').trim() || (await this._nextCode());

    // **الكود موجود بالفعل → دي مش عملية جديدة، دي "حالة" جديدة على نفس السجل**
    const existingJob = await this.getByCode(code);
    if (existingJob) {
      return await this.addCase(existingJob.id, data);
    }

    // **الكود جديد تمامًا → سجل جديد بأول حالة له**
    const parts = await this._validateParts(data.parts);
    const receiptDate = data.receiptDate || Fmt.todayIso();
    const cost = Number(data.cost || 0);
    const deposit = (data.deposit === undefined || data.deposit === null || data.deposit === '') ? 0 : Number(data.deposit);

    for (const part of parts) await Products.decreaseQuantity(part.productId, part.quantity);

    const firstCase = {
      caseId: DB.genId(),
      receiptDate,
      cost,
      deposit,
      notes: data.notes || '',
      partsUsed: parts,
      status: 'in_progress',
      deliveryDate: null,
      paymentAtDelivery: null,
    };

    const rec = await DB.add('maintenanceJobs', {
      deviceName: (data.deviceName || '').trim(),
      customerName: (data.customerName || '').trim(),
      code,
      phone: (data.phone || '').trim(),
      // الحقول دي على مستوى السجل بتعكس دايمًا "آخر حالة" — للعرض السريع في الجداول
      receiptDate,
      cost,
      deposit,
      notes: data.notes || '',
      status: 'in_progress',
      deliveryDate: null,
      paymentAtDelivery: null,
      partsUsed: parts,
      cases: [firstCase],
    });
    await Audit.log('maintenanceJobs', rec.id, 'create', `استلام جهاز للصيانة: ${rec.deviceName || 'بدون اسم'} (${rec.code}) — عربون ${deposit}`);
    return rec;
  },

  /** إضافة حالة صيانة جديدة مستقلة على سجل موجود (كود متكرر) */
  async addCase(id, data) {
    const existing = await DB.get('maintenanceJobs', id);
    if (!existing) throw new EagleError('التسجيل غير موجود.');

    const parts = await this._validateParts(data.parts);
    for (const part of parts) await Products.decreaseQuantity(part.productId, part.quantity);

    const receiptDate = data.receiptDate || Fmt.todayIso();
    const cost = Number(data.cost || 0);
    const deposit = (data.deposit === undefined || data.deposit === null || data.deposit === '') ? 0 : Number(data.deposit);

    const newCase = {
      caseId: DB.genId(),
      receiptDate,
      cost,
      deposit,
      notes: data.notes || '',
      partsUsed: parts,
      status: 'in_progress',
      deliveryDate: null,
      paymentAtDelivery: null,
    };

    const cases = [...(existing.cases || []), newCase];

    const rec = await DB.put('maintenanceJobs', {
      ...existing,
      deviceName: (data.deviceName || existing.deviceName).trim(),
      customerName: (data.customerName || existing.customerName).trim(),
      phone: (data.phone || existing.phone).trim(),
      // **الحقول دي بتتحول بالكامل للحالة الجديدة — مفيش أي جمع مع القديم**
      receiptDate,
      cost,
      deposit,
      notes: data.notes || existing.notes,
      status: 'in_progress',
      deliveryDate: null,
      paymentAtDelivery: null,
      partsUsed: parts,
      cases,
    });

    await Audit.log('maintenanceJobs', id, 'add-case', `حالة صيانة جديدة مستقلة للكود ${existing.code} — تكلفة ${cost} وعربون ${deposit}`);
    return rec;
  },

  /** تعديل الحالة الحالية (الأخيرة) فقط — متاح ما دامت لسه قيد الصيانة */
  async update(id, data) {
    const existing = await DB.get('maintenanceJobs', id);
    if (!existing) throw new EagleError('العملية غير موجودة.');
    if (existing.status === 'delivered') throw new EagleError('لا يمكن تعديل عملية صيانة تم تسليمها بالفعل.');

    const cases = [...(existing.cases || [])];
    const idx = cases.length - 1;
    const currentCase = cases[idx] || { partsUsed: existing.partsUsed || [] };

    const newParts = await this._validateParts(data.parts);
    await this._reverseParts(currentCase.partsUsed || []);
    try {
      for (const part of newParts) await Products.decreaseQuantity(part.productId, part.quantity);
    } catch (err) {
      await this._applyParts(currentCase.partsUsed || []);
      throw err;
    }

    const deposit = (data.deposit === undefined || data.deposit === null || data.deposit === '') ? currentCase.deposit : Number(data.deposit);
    const cost = Number(data.cost || 0);
    const receiptDate = data.receiptDate || currentCase.receiptDate || existing.receiptDate;
    const notes = data.notes || '';

    cases[idx] = { ...currentCase, cost, deposit, receiptDate, notes, partsUsed: newParts };

    const rec = await DB.put('maintenanceJobs', {
      ...existing,
      deviceName: (data.deviceName || '').trim(),
      customerName: (data.customerName || '').trim(),
      code: (data.code || existing.code).trim(),
      phone: (data.phone || '').trim(),
      receiptDate,
      cost,
      deposit,
      notes,
      partsUsed: newParts,
      cases,
    });
    await Audit.log('maintenanceJobs', id, 'update', `تعديل عملية صيانة: ${rec.deviceName || 'بدون اسم'} (${rec.code})`);
    return rec;
  },

  async remove(id) {
    const existing = await DB.get('maintenanceJobs', id);
    if (!existing) return;

    // رجّع القطع المستخدمة لأي حالة لسه مش متسلّمة
    const cases = existing.cases && existing.cases.length > 0
      ? existing.cases
      : [{ status: existing.status, partsUsed: existing.partsUsed }];
    for (const c of cases) {
      if (c.status !== 'delivered') await this._reverseParts(c.partsUsed || []);
    }

    // حذف أي مديونية مرتبطة بأي حالة من حالات هذا السجل
    const allDebts = await DB.getAll('debts');
    const relatedDebts = allDebts.filter((d) => d.source === 'maintenance' && (d.sourceId === id || String(d.sourceId).startsWith(id + '#')));
    for (const d of relatedDebts) await DB.delete('debts', d.id);

    await DB.delete('maintenanceJobs', id);
    await Audit.log('maintenanceJobs', id, 'delete', `حذف عملية صيانة: ${existing.deviceName || 'بدون اسم'} (${existing.code})`);
  },

  /**
   * نقطة اللاعودة: تسوية نهائية + تسليم — بتخص الحالة الحالية (الأخيرة) بس.
   * لو "المدفوع عند التسليم" مش متحدد، بنفترض إنه اتسدد الباقي بالكامل.
   */
  async deliver(id, deliveryDate, paymentAtDelivery) {
    const existing = await DB.get('maintenanceJobs', id);
    if (!existing) throw new EagleError('العملية غير موجودة.');
    if (existing.status === 'delivered') throw new EagleError('العملية مُسلَّمة بالفعل.');

    const cases = [...(existing.cases || [])];
    const idx = cases.length - 1;
    const currentCase = { ...(cases[idx] || { cost: existing.cost, deposit: existing.deposit, caseId: DB.genId() }) };

    const remainingBeforeDelivery = Number(currentCase.cost) - Number(currentCase.deposit || 0);
    const paidNow = (paymentAtDelivery === undefined || paymentAtDelivery === null || paymentAtDelivery === '')
      ? remainingBeforeDelivery
      : Number(paymentAtDelivery);

    const totalPaid = Number(currentCase.deposit || 0) + paidNow;
    const remaining = Number(currentCase.cost) - totalPaid;
    const deliveryDateFinal = deliveryDate || Fmt.todayIso();

    currentCase.status = 'delivered';
    currentCase.deliveryDate = deliveryDateFinal;
    currentCase.paymentAtDelivery = paidNow;
    if (idx >= 0) cases[idx] = currentCase;

    const rec = await DB.put('maintenanceJobs', {
      ...existing,
      status: 'delivered',
      deliveryDate: deliveryDateFinal,
      paymentAtDelivery: paidNow,
      cases,
    });
    await Audit.log('maintenanceJobs', id, 'deliver', `تسليم جهاز: ${rec.deviceName || 'بدون اسم'} (${rec.code}) — إضافة ${currentCase.cost} للإيرادات`);

    if (remaining > 0) {
      await Debts.createFromTransaction({
        source: 'maintenance', sourceId: `${rec.id}#${currentCase.caseId}`,
        sourceLabel: `صيانة ${rec.code} — ${rec.deviceName || ''}`.trim(),
        personName: rec.customerName, phone: rec.phone, debtAmount: remaining, date: deliveryDateFinal,
      });
    }
    return rec;
  },

  /** إجمالي الإيرادات = مجموع تكلفة كل الحالات (في كل الأكواد) اللي اتسلمت */
  async totalDeliveredRevenue() {
    const all = await DB.getAll('maintenanceJobs');
    let total = 0;
    for (const job of all) {
      const cases = job.cases && job.cases.length > 0 ? job.cases : [{ status: job.status, cost: job.cost }];
      for (const c of cases) {
        if (c.status === 'delivered') total += Number(c.cost || 0);
      }
    }
    return total;
  },

  async inProgressJobs() {
    const jobs = await DB.getByIndex('maintenanceJobs', 'status', 'in_progress');
    return jobs.sort((a, b) => new Date(b.receiptDate) - new Date(a.receiptDate));
  },

  async inProgressCount() {
    const inProgress = await DB.getByIndex('maintenanceJobs', 'status', 'in_progress');
    return inProgress.length;
  },

  async _validateParts(parts) {
    if (!parts || parts.length === 0) return [];
    const result = [];
    const seen = new Set();
    for (const part of parts) {
      Validate.required(part.productId, 'الصنف المستخدم');
      Validate.greaterThanZero(part.quantity, 'كمية القطعة المستخدمة');
      if (seen.has(part.productId)) throw new EagleError('لا يمكن تكرار نفس الصنف أكتر من مرة في قطع الصيانة.');
      seen.add(part.productId);
      const product = await Products.get(part.productId);
      if (!product) throw new EagleError('أحد الأصناف المستخدمة في الصيانة غير موجود.');
      result.push({ productId: product.id, productNameAr: product.nameAr, quantity: Number(part.quantity) });
    }
    return result;
  },

  async _reverseParts(parts) {
    for (const part of parts || []) {
      const product = await Products.get(part.productId);
      if (product) await DB.put('products', { ...product, quantity: Number(product.quantity) + Number(part.quantity) });
    }
  },

  async _applyParts(parts) {
    for (const part of parts || []) await Products.decreaseQuantity(part.productId, part.quantity);
  },

  async _nextCode() {
    const count = await DB.count('maintenanceJobs');
    return 'MT-' + String(count + 1).padStart(4, '0');
  },
};
