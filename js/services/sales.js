/** EAGLE — خدمة المبيعات: عملية بيع = صنف واحد أو أكثر، خصم فوري من المخزون، وحساب ربح فوري */

const Sales = {
  async list() {
    const items = await DB.getAll('sales');
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async create({ date, notes, items, personName, phone, amountPaid }) {
    if (!items || items.length === 0) throw new EagleError('أضف صنف واحد على الأقل للبيع.');
    const saleDate = date || Fmt.todayIso();

    // -------- الخطوة 1: تحقق كامل من كل البنود قبل أي تعديل فعلي على المخزون --------
    const prepared = [];
    for (const it of items) {
      Validate.required(it.productId, 'الصنف'); // ده حقل بنائي — لازم صنف فعلي عشان الحساب يشتغل
      Validate.greaterThanZero(it.quantity, 'الكمية');
      Validate.positiveNumber(it.salePrice, 'سعر البيع');

      const product = await Products.get(it.productId);
      if (!product) throw new EagleError('أحد الأصناف المختارة غير موجود.');
      const quantity = Number(it.quantity);
      if (quantity > Number(product.quantity)) {
        throw new EagleError(`الكمية المطلوبة من "${product.nameAr}" (${quantity}) أكبر من المتاح (${product.quantity}).`);
      }
      const salePrice = Number(it.salePrice);
      // **purchasePrice هنا هو السعر الأعلى بالفعل من priceHistory** ✅
      const purchasePriceAtSale = Number(product.purchasePrice);
      prepared.push({
        productId: product.id,
        productNameAr: product.nameAr,
        quantity,
        salePrice,
        purchasePriceAtSale,
        lineValue: quantity * salePrice,
        lineProfit: quantity * (salePrice - purchasePriceAtSale),
      });
    }

    // -------- الخطوة 2: التنفيذ الفعلي بعد التأكد إن كل البنود سليمة --------
    for (const it of prepared) {
      await Products.decreaseQuantity(it.productId, it.quantity);
    }

    const totalValue = prepared.reduce((s, it) => s + it.lineValue, 0);
    // الربح دايمًا بيتحسب على القيمة الكاملة للبيع، مش على المدفوع فعليًا —
    // المديونية حالة تحصيل نقدي بحتة ومالهاش أي علاقة بحساب الربح.
    const totalProfit = prepared.reduce((s, it) => s + it.lineProfit, 0);
    const number = await this._nextNumber();

    // لو "المدفوع" مش متحدد، افتراضيًا نعتبره اتسدد بالكامل (سلوك المحل العادي)
    const paid = (amountPaid === undefined || amountPaid === null || amountPaid === '') ? totalValue : Number(amountPaid);

    const sale = await DB.add('sales', {
      number, date: saleDate, notes: notes || '', items: prepared, totalValue, totalProfit,
      personName: (personName || '').trim(), phone: (phone || '').trim(), amountPaid: paid,
    });
    await Audit.log('sales', sale.id, 'create', `تسجيل عملية بيع رقم ${sale.number} بقيمة ${totalValue}`);

    const debtAmount = totalValue - paid;
    if (debtAmount > 0) {
      await Debts.createFromTransaction({
        source: 'sale', sourceId: sale.id, sourceLabel: `بيع رقم ${sale.number}`,
        personName, phone, debtAmount, date: saleDate,
      });
    }

    return sale;
  },

  async totalsForDate(dateIso) {
    const all = await DB.getAll('sales');
    const todays = all.filter((s) => (s.date || '').slice(0, 10) === dateIso);
    return {
      totalValue: todays.reduce((s, r) => s + r.totalValue, 0),
      totalProfit: todays.reduce((s, r) => s + r.totalProfit, 0),
      count: todays.length,
    };
  },

  async totalProfit() {
    const all = await DB.getAll('sales');
    return all.reduce((s, r) => s + r.totalProfit, 0);
  },

  async get(id) {
    return DB.get('sales', id);
  },

  async remove(id) {
    const sale = await DB.get('sales', id);
    if (!sale) throw new EagleError('عملية البيع غير موجودة.');

    // إرجاع الكميات المخصومة إلى المخزون
    for (const it of (sale.items || [])) {
      const product = await Products.get(it.productId);
      if (product) {
        await DB.put('products', { ...product, quantity: Number(product.quantity || 0) + Number(it.quantity || 0) });
      }
    }

    // حذف أي مديونية مرتبطة بهذه العملية
    const allDebts = await DB.getAll('debts');
    const relatedDebts = allDebts.filter((d) => d.source === 'sale' && d.sourceId === id);
    for (const d of relatedDebts) await DB.delete('debts', d.id);

    await DB.delete('sales', id);
    await Audit.log('sales', id, 'delete', `حذف عملية بيع رقم ${sale.number} — تم إرجاع الكميات للمخزون`);
  },

  async _nextNumber() {
    const count = await DB.count('sales');
    return 'S-' + String(count + 1).padStart(4, '0');
  },
};
