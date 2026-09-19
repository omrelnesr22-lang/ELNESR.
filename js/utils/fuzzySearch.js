/**
 * EAGLE — بحث ذكي (Fuzzy Search) بسيط، بدون مكتبات خارجية.
 * الفكرة: مش لازم تكتب الاسم بالظبط — تطابق مباشر (substring) بييجي الأول،
 * وبعده تطابق "متتابع" بيسمح بحروف مفقودة بينهم (زي "شسمج" تلاقي بيها "شاشة سامسونج").
 * ده مش تصحيح إملائي كامل (زي مكتبات fuzzy متقدمة)، لكنه كافي جدًا لقوائم
 * منتجات محل عادي وبيشتغل فورًا من غير أي اعتماديات خارجية.
 */

const FuzzySearch = {
  normalize(str) {
    return String(str || '')
      .replace(/[\u064B-\u0652\u0640]/g, '') // إزالة التشكيل والتطويل
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase()
      .trim();
  },

  /** score أقل = تطابق أقوى. matched=false يعني مفيش تطابق خالص */
  match(query, text) {
    const q = FuzzySearch.normalize(query);
    const t = FuzzySearch.normalize(text);
    if (!q) return { matched: true, score: 0 };
    const directIdx = t.indexOf(q);
    if (directIdx !== -1) return { matched: true, score: directIdx }; // تطابق مباشر — الأفضل دايمًا

    // تطابق متتابع (subsequence): كل حروف البحث موجودة بنفس الترتيب مع سماح بفجوات
    let ti = 0, gaps = 0, firstIdx = -1;
    for (let qi = 0; qi < q.length; qi++) {
      const idx = t.indexOf(q[qi], ti);
      if (idx === -1) return { matched: false, score: Infinity };
      if (firstIdx === -1) firstIdx = idx;
      gaps += idx - ti;
      ti = idx + 1;
    }
    return { matched: true, score: 1000 + gaps + firstIdx };
  },

  search(query, items, getText) {
    if (!query || !query.trim()) return items;
    return items
      .map((item) => ({ item, ...FuzzySearch.match(query, getText(item)) }))
      .filter((r) => r.matched)
      .sort((a, b) => a.score - b.score)
      .map((r) => r.item);
  },
};
