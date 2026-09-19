/**
 * EAGLE — خدمة أنواع/تصنيفات الأصناف
 * كل نوع (زي "غسالة"، "خلاط") بيتحط تحته مجموعة أصناف. الصنف اللي من غير نوع
 * بيتحط تلقائيًا تحت قسم "غير مصنف" في الواجهة (categoryId = null).
 */

const Categories = {
  async list() {
    const items = await DB.getAll('categories');
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  },

  async get(id) {
    return DB.get('categories', id);
  },

  async getByName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const matches = await DB.getByIndex('categories', 'name', trimmed);
    return matches && matches.length > 0 ? matches[0] : null;
  },

  async create(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new EagleError('اسم النوع مطلوب.');
    const exists = await this.getByName(trimmed);
    if (exists) throw new EagleError(`النوع "${trimmed}" موجود بالفعل.`);
    const rec = await DB.add('categories', { name: trimmed, createdAt: new Date().toISOString() });
    await Audit.log('categories', rec.id, 'create', `إنشاء نوع جديد: ${trimmed}`);
    return rec;
  },

  async rename(id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new EagleError('اسم النوع مطلوب.');
    const existing = await DB.get('categories', id);
    if (!existing) throw new EagleError('النوع غير موجود.');
    const dup = await this.getByName(trimmed);
    if (dup && dup.id !== id) throw new EagleError(`النوع "${trimmed}" موجود بالفعل.`);
    const rec = await DB.put('categories', { ...existing, name: trimmed });
    await Audit.log('categories', id, 'update', `تعديل اسم نوع من "${existing.name}" إلى "${trimmed}"`);
    return rec;
  },

  /** حذف نوع بالكامل — الأصناف اللي تحته بتتنقل تلقائيًا لقسم "غير مصنف" (مش بتتحذف) */
  async remove(id) {
    const existing = await DB.get('categories', id);
    if (!existing) return;

    const allProducts = await DB.getAll('products');
    const affected = allProducts.filter((p) => p.categoryId === id);
    for (const p of affected) {
      await DB.put('products', { ...p, categoryId: null });
    }

    await DB.delete('categories', id);
    await Audit.log('categories', id, 'delete', `حذف نوع "${existing.name}" — تم نقل ${affected.length} صنف لقسم "غير مصنف"`);
  },
};
