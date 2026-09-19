/**
 * EAGLE — النسخ الاحتياطي (يدوي + تلقائي دوري)
 * "تلقائي" هنا بمعنى: النظام بنفسه بينزّل ملف نسخة احتياطية لما يعدي عدد
 * الأيام المحدد من غير ما تدوس أي زرار — مش "صامت تمامًا" لأن المتصفح
 * بيحتاج يعمل تنزيل ملف فعلي (زي أي تنزيل عادي)، لكنه بيحصل من نفسه.
 */

const Backup = {
  async downloadNow(isAuto = false) {
    const dump = await DB.exportAll();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eagle-backup-${Fmt.todayIso()}${isAuto ? '-auto' : ''}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await Settings.touchLastBackup();
    await Audit.log('backup', 'system', isAuto ? 'auto-export' : 'export', isAuto ? 'تم إنشاء نسخة احتياطية تلقائية' : 'تم تصدير نسخة احتياطية يدويًا');
    return true;
  },

  /** بيتنفذ مرة واحدة عند فتح النظام — بيقرر لو الوقت حان لباكب تلقائي */
  async checkAndRunAuto() {
    const s = Settings.cache;
    if (!s || s.autoBackupEnabled === false) return false;
    const intervalDays = Number(s.autoBackupIntervalDays || 3);
    const last = s.lastBackupAt ? new Date(s.lastBackupAt).getTime() : null;
    const daysSince = last ? (Date.now() - last) / 86400000 : Infinity;
    if (daysSince >= intervalDays) {
      await Backup.downloadNow(true);
      return true;
    }
    return false;
  },
};
