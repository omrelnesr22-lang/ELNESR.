/** EAGLE — خدمة البحث العام */

const Search = {
  async searchDebts(query) {
    const q = (query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    
    const debts = await Debts.list();
    return debts.filter(d => 
      (d.personName || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.sourceLabel || '').toLowerCase().includes(q)
    ).slice(0, 20);
  },

  async searchProducts(query) {
    const q = (query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    
    const products = await Products.list();
    return products.filter(p =>
      (p.nameAr || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q)
    ).slice(0, 20);
  },

  async globalSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (q.length < 2) return { debts: [], products: [] };
    
    return {
      debts: await Search.searchDebts(query),
      products: await Search.searchProducts(query),
    };
  },
};
