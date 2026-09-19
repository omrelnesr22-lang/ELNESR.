/** EAGLE — سجل العمليات (Audit Log) */

const Audit = {
  async log(entity, entityId, action, description) {
    await DB.add('auditLog', {
      entity, entityId, action, description,
      date: new Date().toISOString(),
    });
  },

  async recent(limit = 15) {
    const all = await DB.getAll('auditLog');
    return all.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  },
};
