/** EAGLE — قواعد تحقق عامة، تُستخدم في كل الـ services */

const Validate = {
  required(value, fieldName) {
    if (value === null || value === undefined || String(value).trim() === '') {
      throw new EagleError(`الحقل "${fieldName}" مطلوب.`);
    }
  },

  positiveNumber(value, fieldName) {
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) {
      throw new EagleError(`"${fieldName}" لازم يكون رقم صحيح وغير سالب.`);
    }
  },

  greaterThanZero(value, fieldName) {
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) {
      throw new EagleError(`"${fieldName}" لازم يكون أكبر من صفر.`);
    }
  },

  async uniqueInStore(storeName, indexName, value, currentId) {
    if (!value) return;
    const matches = await DB.getByIndex(storeName, indexName, value);
    const conflict = matches.find((m) => m.id !== currentId);
    if (conflict) {
      throw new EagleError(`القيمة "${value}" مستخدمة بالفعل.`);
    }
  },
};

/** خطأ مخصص برسالة واضحة للمستخدم (بنفرقه عن أخطاء البرمجة العادية) */
class EagleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EagleError';
  }
}
