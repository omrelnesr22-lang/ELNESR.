/**
 * EAGLE — المخزن الشخصي
 * قايمة بسيطة جدًا لأغراض المستخدم الخاصة: اسم الشيء + الكمية فقط،
 * منفصلة تمامًا عن الأصناف والمبيعات (مفيش أسعار ولا خصم تلقائي).
 */

const Storage = {
  async list() {
    const items = await DB.getAll('storageItems');
    return items.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || '', 'ar'));
  },

  async create(data) {
    const rec = await DB.add('storageItems', {
      itemName: (data.itemName || '').trim(),
      quantity: Number(data.quantity || 0),
      notes: data.notes || '',
    });
    await Audit.log('storageItems', rec.id, 'create', `إضافة للمخزن: ${rec.itemName || 'بدون اسم'}`);
    return rec;
  },

  async update(id, data) {
    const existing = await DB.get('storageItems', id);
    if (!existing) throw new EagleError('العنصر غير موجود.');
    const rec = await DB.put('storageItems', {
      ...existing,
      itemName: (data.itemName || '').trim(),
      quantity: Number(data.quantity || 0),
      notes: data.notes || '',
    });
    await Audit.log('storageItems', id, 'update', `تعديل عنصر المخزن: ${rec.itemName || 'بدون اسم'}`);
    return rec;
  },

  async remove(id) {
    const existing = await DB.get('storageItems', id);
    await DB.delete('storageItems', id);
    await Audit.log('storageItems', id, 'delete', `حذف من المخزن: ${existing ? existing.itemName : id}`);
  },
};
