// js/utils.js - Вспомогательные функции

const Utils = {
  formatDate(date, format = 'short') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    if (format === 'short') return `${day}.${month}`;
    if (format === 'full') return `${day}.${month}.${year}`;
    if (format === 'iso') return d.toISOString().split('T')[0];
    if (format === 'weekday') {
      const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return `${days[d.getDay()]} ${day}.${month}`;
    }
    return `${day}.${month}`;
  },

  getMondayOfWeek(wid) {
    const [y, wPart] = wid.split('-W');
    const w = parseInt(wPart);
    const jan4 = new Date(Date.UTC(parseInt(y), 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
    const monday = new Date(firstMonday);
    monday.setUTCDate(firstMonday.getUTCDate() + (w - 1) * 7);
    return monday;
  },

  getWeekId(date) {
    const d = date ? new Date(date) : new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return utc.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
  },

  formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  parseDate(dateStr) {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  },

  getTodayISO() {
    return new Date().toISOString().split('T')[0];
  }
};