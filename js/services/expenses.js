/** EAGLE — خدمة المصروفات والمشتريات */

const Expenses = {
  // ============= المشتريات (إضافة كمية جديدة) =============
  async recordPurchase({ productId, productName, quantity, unitPrice, date, oldPrice }) {
    const qty = Number(quantity);
    const newPrice = Number(unitPrice);
    const old = Number(oldPrice || 0);
    
    if (qty <= 0) throw new EagleError('الكمية يجب أن تكون أكبر من صفر.');
    if (newPrice <= 0) throw new EagleError('سعر الشراء يجب أن يكون أكبر من صفر.');
    
    // **استخدام السعر الأعلى بين القديم والجديد**
    const maxPrice = Math.max(old, newPrice);
    const totalAmount = qty * maxPrice;
    
    const rec = await DB.add('purchases', {
      productId,
      productName: (productName || '').trim(),
      quantity: qty,
      unitPrice: maxPrice, // السعر الأعلى
      totalAmount,
      oldPrice: old,
      newPrice: newPrice,
      date: date || Fmt.todayIso(),
      type: 'purchase',
    });
    
    await Audit.log('purchases', rec.id, 'create', `شراء: ${qty} وحدة من "${productName}" بسعر ${maxPrice} (إجمالي ${totalAmount})`);
    return rec;
  },

  // ============= المصروفات العامة =============
  async addExpense({ category, description, amount, date }) {
    const amt = Number(amount);
    if (amt <= 0) throw new EagleError('المبلغ يجب أن يكون أكبر من صفر.');
    if (!category || !description) throw new EagleError('الفئة والبيان مطلوبان.');
    
    const rec = await DB.add('expenses', {
      category: (category || '').trim(),
      description: (description || '').trim(),
      amount: amt,
      date: date || Fmt.todayIso(),
      type: 'expense',
    });
    
    await Audit.log('expenses', rec.id, 'create', `مصروف: ${category} - ${description} بقيمة ${amt}`);
    return rec;
  },

  // ============= الإحصائيات =============
  async getDailyExpenses(date) {
    const dateStr = date || Fmt.todayIso();
    const purchases = await DB.getByIndex('purchases', 'date', dateStr);
    const expenses = await DB.getByIndex('expenses', 'date', dateStr);
    
    const purchasesTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const dayTotal = purchasesTotal + expensesTotal;
    
    return {
      date: dateStr,
      purchases: purchases || [],
      expenses: expenses || [],
      purchasesTotal,
      expensesTotal,
      dayTotal,
    };
  },

  async getMonthlyExpenses(yearMonth) {
    // yearMonth بصيغة "YYYY-MM"
    const allPurchases = await DB.getAll('purchases');
    const allExpenses = await DB.getAll('expenses');
    
    const purchases = allPurchases.filter(p => p.date.startsWith(yearMonth));
    const expenses = allExpenses.filter(e => e.date.startsWith(yearMonth));
    
    const purchasesTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
    const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const monthTotal = purchasesTotal + expensesTotal;
    
    // تجميع حسب اليوم
    const dailyBreakdown = {};
    [...purchases, ...expenses].forEach(item => {
      if (!dailyBreakdown[item.date]) {
        dailyBreakdown[item.date] = { purchases: [], expenses: [], purchasesTotal: 0, expensesTotal: 0, dayTotal: 0 };
      }
      
      if (item.type === 'purchase') {
        dailyBreakdown[item.date].purchases.push(item);
        dailyBreakdown[item.date].purchasesTotal += item.totalAmount;
      } else {
        dailyBreakdown[item.date].expenses.push(item);
        dailyBreakdown[item.date].expensesTotal += item.amount;
      }
      dailyBreakdown[item.date].dayTotal += (item.type === 'purchase' ? item.totalAmount : item.amount);
    });
    
    return {
      yearMonth,
      purchases,
      expenses,
      purchasesTotal,
      expensesTotal,
      monthTotal,
      dailyBreakdown,
    };
  },

  /** إجمالي كل المصروفات والمشتريات من بداية استخدام النظام (للخزنة) */
  async grandTotal() {
    const [allPurchases, allExpenses] = await Promise.all([DB.getAll('purchases'), DB.getAll('expenses')]);
    const purchasesTotal = allPurchases.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
    const expensesTotal = allExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    return purchasesTotal + expensesTotal;
  },

  async listExpenseCategories() {
    const all = await DB.getAll('expenses');
    const categories = [...new Set(all.map(e => e.category))];
    return categories.sort();
  },

  async removePurchase(id) {
    const purchase = await DB.get('purchases', id);
    if (!purchase) return;
    
    // إرجاع الكمية من المخزون (لو لسه متاحة)
    const product = await Products.get(purchase.productId);
    if (product) {
      const newQty = Number(product.quantity || 0) - Number(purchase.quantity || 0);
      if (newQty < 0) {
        throw new EagleError(`لا يمكن حذف هذه العملية — جزء من الكمية (${purchase.quantity}) تم بيعه بالفعل.`);
      }
      await DB.put('products', { ...product, quantity: newQty });
    }
    
    await DB.delete('purchases', id);
    await Audit.log('purchases', id, 'delete', `حذف عملية شراء: ${purchase.productName} (${purchase.quantity} وحدة)`);
  },

  async removeExpense(id) {
    const exp = await DB.get('expenses', id);
    if (!exp) return;
    await DB.delete('expenses', id);
    await Audit.log('expenses', id, 'delete', `حذف مصروف: ${exp.category} - ${exp.description}`);
  },
};
