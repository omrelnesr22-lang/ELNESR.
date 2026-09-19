/** EAGLE — خدمة الأصناف (نسخة مبسّطة: مكان واحد، كمية مباشرة على الصنف) */

const Products = {
  async list() {
    const items = await DB.getAll('products');
    return items.sort((a, b) => (a.nameAr || '').localeCompare(b.nameAr || '', 'ar'));
  },

  async get(id) {
    return DB.get('products', id);
  },

  async create(data) {
    this._validate(data);
    const code = (data.code || '').trim() || (await this._nextCode());
    await this._checkUniqueCode(code);
    const rec = await DB.add('products', this._shape(data, code));
    await Audit.log('products', rec.id, 'create', `إنشاء صنف: ${rec.nameAr || 'بدون اسم'} (${rec.code})`);
    return rec;
  },

  async update(id, data) {
    this._validate(data, { isUpdate: true });
    const existing = await DB.get('products', id);
    if (!existing) throw new EagleError('الصنف غير موجود.');
    const code = (data.code || '').trim() || existing.code;
    await this._checkUniqueCode(code, id);
    // **التعديل يمس فقط: الاسم / الكود / حد التنبيه / الملاحظات / سعر البيع**
    // **أسعار الشراء (قديم/جديد/معتمد) وسجلها بتتغير فقط من "إضافة كمية"**
    const rec = await DB.put('products', {
      ...existing,
      nameAr: (data.nameAr || '').trim(),
      code,
      categoryId: data.categoryId !== undefined ? (data.categoryId || null) : existing.categoryId,
      minAlert: Number(data.minAlert || 0),
      notes: data.notes || '',
      salePrice: data.salePrice !== undefined && data.salePrice !== '' ? Number(data.salePrice) : existing.salePrice,
    });
    await Audit.log('products', id, 'update', `تعديل صنف: ${rec.nameAr || 'بدون اسم'} (${rec.code})`);
    return rec;
  },

  async remove(id) {
    // ملاحظة: أسماء وأسعار الأصناف بتتحفظ كـ"نسخة" جوه كل عملية بيع/صيانة وقت حدوثها،
    // فحذف الصنف مش بيأثر على السجلات التاريخية القديمة.
    const existing = await DB.get('products', id);
    await DB.delete('products', id);
    await Audit.log('products', id, 'delete', `حذف صنف: ${existing ? existing.nameAr : id}`);
  },

  /**
   * خصم كمية من صنف مباشرة (بعد التحقق من التوفر) — بيُستخدم من خدمة المبيعات.
   * العملية دي منعزلة هنا عشان تفضل قاعدة "مينفعش تبيع أكتر من المتاح" في مكان واحد.
   */
  async decreaseQuantity(id, quantity) {
    const p = await DB.get('products', id);
    if (!p) throw new EagleError('الصنف غير موجود.');
    const qty = Number(quantity);
    if (qty > Number(p.quantity)) {
      throw new EagleError(`الكمية المطلوبة من "${p.nameAr}" (${qty}) أكبر من الكمية المتاحة (${p.quantity}).`);
    }
    return DB.put('products', { ...p, quantity: Number(p.quantity) - qty });
  },

  isLowStock(product) {
    return Number(product.minAlert) > 0 && Number(product.quantity) <= Number(product.minAlert);
  },

  _validate(data, { isUpdate } = {}) {
    // الحقول الوصفية (الاسم، الكود) اختيارية عمدًا — الكود بيتولّد تلقائيًا لو فاضي.
    // بس الأرقام لازم تفضل غير سالبة عشان الحسابات تبقى منطقية دايمًا.
    Validate.positiveNumber(data.quantity, 'الكمية الحالية');
    Validate.positiveNumber(data.salePrice, 'سعر البيع');
    // سعر الشراء الابتدائي اختياري عند الإنشاء (ممكن يتحدد لاحقًا من "إضافة كمية")
    // وغير مطلوب أصلًا عند التعديل (بيتغير فقط من "إضافة كمية")
    if (!isUpdate && data.purchasePrice !== undefined && data.purchasePrice !== '') {
      Validate.positiveNumber(data.purchasePrice, 'سعر الشراء الابتدائي');
    }
    if (data.minAlert) Validate.positiveNumber(data.minAlert, 'حد التنبيه الأدنى');
  },

  async _checkUniqueCode(code, currentId) {
    const matches = await DB.getByIndex('products', 'code', code);
    const conflict = matches.find((m) => m.id !== currentId);
    if (conflict) throw new EagleError(`كود الصنف "${code}" مستخدم بالفعل.`);
  },

  async _nextCode() {
    const count = await DB.count('products');
    return 'P-' + String(count + 1).padStart(4, '0');
  },

  _shape(data, code) {
    const initialPrice = Number(data.purchasePrice || 0);
    const prices = (data.priceHistory || []).length > 0 
      ? (data.priceHistory || []) 
      : [{ date: Fmt.todayIso(), purchasePrice: initialPrice, salePrice: Number(data.salePrice || 0) }];
    
    return {
      nameAr: (data.nameAr || '').trim(),
      code,
      categoryId: data.categoryId || null,
      quantity: Number(data.quantity || 0),
      purchasePrice: initialPrice, // ✅ السعر المعتمد حالياً
      oldPurchasePrice: 0, // لسه معندناش سعر قديم — أول تسجيل
      newPurchasePrice: initialPrice, // السعر الابتدائي
      salePrice: Number(data.salePrice || 0),
      minAlert: Number(data.minAlert || 0),
      notes: data.notes || '',
      priceHistory: prices,
    };
  },
  
  async addQuantity(id, newQuantity, newPurchasePrice) {
    const p = await DB.get('products', id);
    if (!p) throw new EagleError('الصنف غير موجود.');
    
    const qty = Number(newQuantity);
    const enteredPrice = Number(newPurchasePrice);
    if (qty <= 0) throw new EagleError('الكمية يجب أن تكون أكبر من صفر.');
    if (enteredPrice <= 0) throw new EagleError('سعر الشراء يجب أن يكون أكبر من صفر.');
    
    // إضافة الكمية الجديدة للرصيد الحالي
    const newTotalQty = Number(p.quantity || 0) + qty;
    
    // **السعر القديم = السعر المستخدم حالياً في الصنف قبل هذا التحديث**
    const oldPurchasePrice = Number(p.purchasePrice || 0);
    // **السعر الجديد = اللي المستخدم داخله دلوقتي**
    const newPurchasePriceValue = enteredPrice;
    // **السعر المعتمد = الأعلى بينهم**
    const maxPurchasePrice = Math.max(oldPurchasePrice, newPurchasePriceValue);
    
    // تسجيل في سجل الأسعار (priceHistory) للأرشفة فقط
    const priceHistory = [...(p.priceHistory || [])];
    const todayIndex = priceHistory.findIndex(ph => ph.date === Fmt.todayIso());
    if (todayIndex !== -1) {
      priceHistory[todayIndex].purchasePrice = maxPurchasePrice;
    } else {
      priceHistory.push({
        date: Fmt.todayIso(),
        purchasePrice: enteredPrice,
        salePrice: p.salePrice,
      });
    }
    
    const rec = await DB.put('products', {
      ...p,
      quantity: newTotalQty,
      purchasePrice: maxPurchasePrice,
      oldPurchasePrice: oldPurchasePrice,
      newPurchasePrice: newPurchasePriceValue,
      priceHistory,
    });
    
    // تسجيل تلقائي في المشتريات
    await Expenses.recordPurchase({
      productId: id,
      productName: p.nameAr,
      quantity: qty,
      unitPrice: enteredPrice,
      oldPrice: oldPurchasePrice,
      date: Fmt.todayIso(),
    });
    
    await Audit.log('products', id, 'add-quantity', `إضافة كمية: ${qty} وحدة من "${p.nameAr}" بسعر ${enteredPrice} (قديم: ${oldPurchasePrice} → معتمد: ${maxPurchasePrice})`);
    return rec;
  },
};
