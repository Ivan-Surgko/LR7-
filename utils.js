// js/utils.js - Вспомогательные функции

const Utils = {
  // Форматирование даты
  formatDate(date, format = 'short') {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    if (format === 'short') return `${day}.${month}`;
    if (format === 'full') return `${day}.${month}.${year}`;
    if (format === 'iso') return d.toISOString().split('T')[0];
    return `${day}.${month}`;
  },

  // Получить понедельник недели по ISO
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

  // Получить ID недели по дате
  getWeekId(date) {
    const d = date ? new Date(date) : new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return utc.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
  },

  // Форматирование числа
  formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
  },

  // Дебаунс для оптимизации
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Генерация уникального ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};