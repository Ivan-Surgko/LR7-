// js/storage.js - Работа с localStorage

const Storage = {
  KEYS: {
    DATA: 'salary_tracker_data',
    CONFIG: 'salary_tracker_config',
    CUSTOM_WEEK_LABELS: 'salary_custom_week_labels',
    WEEK_NOTES: 'salary_week_notes',
    GOALS: 'salary_goals'
  },

  // Загрузка данных
  load(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.error('Storage load error:', e);
      return defaultValue;
    }
  },

  // Сохранение данных
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage save error:', e);
      return false;
    }
  },

  // Удаление данных
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Очистка всех данных приложения
  clearAll() {
    Object.values(this.KEYS).forEach(key => this.remove(key));
  },

  // Экспорт всех данных
  exportAll() {
    const exportData = {};
    Object.entries(this.KEYS).forEach(([name, key]) => {
      exportData[name.toLowerCase()] = this.load(key);
    });
    return exportData;
  },

  // Импорт данных
  importAll(data) {
    if (data.data) this.save(this.KEYS.DATA, data.data);
    if (data.config) this.save(this.KEYS.CONFIG, data.config);
    if (data.custom_week_labels) this.save(this.KEYS.CUSTOM_WEEK_LABELS, data.custom_week_labels);
    if (data.week_notes) this.save(this.KEYS.WEEK_NOTES, data.week_notes);
    if (data.goals) this.save(this.KEYS.GOALS, data.goals);
  }
};
