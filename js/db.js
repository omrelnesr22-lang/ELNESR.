/**
 * EAGLE — الطبقة الوحيدة اللي بتتعامل مع قاعدة البيانات (IndexedDB)
 * النسخة المبسّطة: مكان واحد، بدون مخازن/فروع. الكمية حقل مباشر على الصنف.
 */

const DB_NAME = 'eagle_sales_maintenance_db'; // اسم مختلف عمدًا عن النسخة القديمة (eagle_db) لتفادي أي تعارض إصدارات

const SCHEMA = [
  {
    name: 'products', keyPath: 'id', indexes: [
      { name: 'nameAr', keyPath: 'nameAr' },
      { name: 'code', keyPath: 'code', unique: true },
    ]
  },
  { name: 'sales', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }] },
  {
    name: 'maintenanceJobs', keyPath: 'id', indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'receiptDate', keyPath: 'receiptDate' },
      { name: 'code', keyPath: 'code' },
    ]
  },
  {
    name: 'debts', keyPath: 'id', indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'date', keyPath: 'date' },
      { name: 'source', keyPath: 'source' },
      { name: 'sourceId', keyPath: 'sourceId' },
    ]
  },
  { name: 'storageItems', keyPath: 'id', indexes: [{ name: 'itemName', keyPath: 'itemName' }] },
  {
    name: 'purchases', keyPath: 'id', indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'productId', keyPath: 'productId' },
    ]
  },
  {
    name: 'expenses', keyPath: 'id', indexes: [
      { name: 'date', keyPath: 'date' },
      { name: 'category', keyPath: 'category' },
    ]
  },
  { name: 'categories', keyPath: 'id', indexes: [{ name: 'name', keyPath: 'name', unique: true }] },
  { name: 'settings', keyPath: 'id' },
  { name: 'auditLog', keyPath: 'id', indexes: [{ name: 'date', keyPath: 'date' }, { name: 'entity', keyPath: 'entity' }] },
];

// إصدار قاعدة البيانات — زد الرقم عند إضافة جداول جديدة
// v4: إضافة جداول purchases و expenses للمشتريات والمصروفات
// v5: إضافة جدول categories (أنواع/تصنيفات الأصناف)
// v6: (تم التراجع عنه) كان فيه جدول installments — أُلغي القسم بالكامل
const DB_VERSION = 6;

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      SCHEMA.forEach((store) => {
        if (!db.objectStoreNames.contains(store.name)) {
          const os = db.createObjectStore(store.name, { keyPath: store.keyPath });
          (store.indexes || []).forEach((idx) => {
            os.createIndex(idx.name, idx.keyPath, { unique: !!idx.unique });
          });
        }
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
    req.onblocked = () => {
      if (typeof DB.onBlocked === 'function') DB.onBlocked();
    };
  });
  return _dbPromise;
}

function genId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

const DB = {
  genId,
  openDb,
  onBlocked: null,

  async add(storeName, obj) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const record = { ...obj, id: obj.id || genId(), createdAt: obj.createdAt || new Date().toISOString() };
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, obj) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const record = { ...obj, updatedAt: new Date().toISOString() };
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(storeName, indexName, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName).getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async count(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(storeName, 'readonly').objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  },

  async exportAll() {
    const dump = {};
    for (const store of SCHEMA) dump[store.name] = await DB.getAll(store.name);
    return { exportedAt: new Date().toISOString(), version: DB_VERSION, data: dump };
  },

  async importAll(dump) {
    const db = await openDb();
    const storeNames = Object.keys(dump.data || {}).filter((n) => db.objectStoreNames.contains(n));
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeNames, 'readwrite');
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
      storeNames.forEach((name) => {
        const os = t.objectStore(name);
        os.clear();
        (dump.data[name] || []).forEach((rec) => os.put(rec));
      });
    });
  },
};
