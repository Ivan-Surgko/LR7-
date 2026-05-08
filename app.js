// js/app.js - Основная логика приложения

const App = {
  currentModal: null,
  pendingDelete: null,
  detailWeekId: null,

  init() {
    Config.init();
    this.renderMain();
    
    // Обработчик изменения размера для графика
    window.addEventListener('resize', Utils.debounce(() => {
      if (document.getElementById('page-stats').classList.contains('active')) {
        Stats.renderChart();
      }
    }, 250));
  },

  // Навигация
  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');
    
    if (name === 'main') this.renderMain();
    if (name === 'history') UI.renderHistory();
    if (name === 'stats') Stats.render();
    if (name === 'settings') Config.updateInputs();
    
    // Скрываем модалки при смене страницы
    this.closeModal();
    this.closeDelModal();
  },

  // Действия с записями
  addWorkday() {
    this.addEntry(Utils.getWeekId(), { type: 'workday', label: 'Рабочий день +' + Config.get('rate') + '₴' });
    this.showToast('+' + Config.get('rate') + '₴ зачислено');
  },

  addDayOff() {
    this.addEntry(Utils.getWeekId(), { type: 'dayoff', label: 'Выходной' });
    this.showToast('Выходной отмечен');
  },

  addEntry(wid, entry) {
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    if (!data.weeks[wid]) data.weeks[wid] = { entries: [], overtimeCarry: 0 };
    data.weeks[wid].entries.push({ ...entry, id: Utils.generateId() });
    Storage.save(Storage.KEYS.DATA, data);
    this.renderMain();
  },

  removeEntry(wid, id) {
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    if (data.weeks[wid]) {
      data.weeks[wid].entries = data.weeks[wid].entries.filter(e => e.id !== id);
      Storage.save(Storage.KEYS.DATA, data);
    }
  },

  carryOvertime() {
    const wid = Utils.getWeekId();
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    const week = data.weeks[wid] || { entries: [], overtimeCarry: 0 };
    const totals = UI.calcTotals(week);
    
    if (!totals.remainingHours) return;
    
    const nextWid = this.getNextWeekId(wid);
    if (!data.weeks[nextWid]) data.weeks[nextWid] = { entries: [], overtimeCarry: 0 };
    data.weeks[nextWid].overtimeCarry = +((data.weeks[nextWid].overtimeCarry || 0) + totals.remainingHours).toFixed(2);
    
    Storage.save(Storage.KEYS.DATA, data);
    this.renderMain();
    this.showToast(totals.remainingHours + 'г перенесено');
  },

  getNextWeekId(wid) {
    const monday = Utils.getMondayOfWeek(wid);
    monday.setUTCDate(monday.getUTCDate() + 7);
    return Utils.getWeekId(monday);
  },

  // Модальные окна
  openModal(type) {
    this.currentModal = type;
    const configs = {
      short:     { title: 'Неполный день', sub: 'Сколько часов отработал? (1–7.5)\nОни пойдут в копилку переработки' },
      overtime:  { title: 'Переработка', sub: 'Сколько часов сверхурочно?\n' + Config.get('overtimeHours') + 'г = ' + Config.get('overtimeRate') + '₴' },
      deduction: { title: 'Вычет', sub: 'Сумма вычета (₴)' },
      advance:   { title: 'Аванс', sub: 'Сколько получил авансом (₴)?' },
    };
    
    const cfg = configs[type];
    if (!cfg) return;
    
    document.getElementById('modal-title').textContent = cfg.title;
    document.getElementById('modal-sub').textContent = cfg.sub;
    document.getElementById('modal-input').value = '';
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('modal-input').focus(), 300);
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    this.currentModal = null;
  },

  modalConfirm() {
    const val = parseFloat(document.getElementById('modal-input').value);
    const wid = Utils.getWeekId();
    
    if (this.currentModal === 'short') {
      if (!val || val <= 0 || val >= 8) { this.showToast('Введи часы от 0.5 до 7.5'); return; }
      this.addEntry(wid, { type: 'short', hours: val, label: 'Неполный день ' + val + 'г' });
      this.showToast('+' + val + 'г в копилку');
    }
    if (this.currentModal === 'overtime') {
      if (!val || val <= 0) { this.showToast('Введи количество часов'); return; }
      this.addEntry(wid, { type: 'overtime', hours: val, label: 'Переработка +' + val + 'г' });
      this.showToast('+' + val + 'г в копилку');
    }
    if (this.currentModal === 'deduction') {
      if (!val || val <= 0) { this.showToast('Введи сумму'); return; }
      this.addEntry(wid, { type: 'deduction', amount: val, label: 'Вычет −' + val + '₴' });
      this.showToast('−' + val + '₴ вычет');
    }
    if (this.currentModal === 'advance') {
      if (!val || val <= 0) { this.showToast('Введи сумму'); return; }
      this.addEntry(wid, { type: 'advance', amount: val, label: 'Аванс +' + val + '₴' });
      this.showToast('Аванс ' + val + '₴ зафиксирован');
    }
    this.closeModal();
  },

  // Удаление
  askDelete(wid, id, label) {
    this.pendingDelete = { wid, id };
    document.getElementById('del-sub').textContent = label;
    document.getElementById('del-overlay').classList.add('open');
  },

  confirmDelete() {
    if (!this.pendingDelete) return;
    this.removeEntry(this.pendingDelete.wid, this.pendingDelete.id);
    this.closeDelModal();
    
    if (this.detailWeekId) {
      UI.renderWeekDetail(this.detailWeekId);
    }
    this.renderMain();
    this.showToast('Удалено');
  },

  closeDelModal() {
    document.getElementById('del-overlay').classList.remove('open');
    this.pendingDelete = null;
  },

  // Работа с неделями
  openWeekDetail(wid) {
    this.detailWeekId = wid;
    document.getElementById('date-edit-row').style.display = 'none';
    UI.renderWeekDetail(wid);
    this.showPage('week');
  },

  editWeekDates() {
    const row = document.getElementById('date-edit-row');
    if (row.style.display === 'none' || !row.style.display) {
      row.style.display = 'flex';
      const monday = Utils.getMondayOfWeek(this.detailWeekId);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      
      document.getElementById('edit-date-start').value = Utils.formatDate(monday, 'iso');
      document.getElementById('edit-date-end').value = Utils.formatDate(sunday, 'iso');
    } else {
      row.style.display = 'none';
    }
  },

  saveWeekDates() {
    const startVal = document.getElementById('edit-date-start').value;
    const endVal = document.getElementById('edit-date-end').value;
    
    if (!startVal || !endVal) { this.showToast('Выбери обе даты'); return; }
    
    const start = new Date(startVal);
    const end = new Date(endVal);
    
    if (end < start) { this.showToast('Конец раньше начала'); return; }
    
    const label = Utils.formatDate(start) + ' — ' + Utils.formatDate(end) + '.' + String(end.getFullYear()).slice(2);
    
    const customLabels = Storage.load(Storage.KEYS.CUSTOM_WEEK_LABELS, {});
    customLabels[this.detailWeekId] = label;
    Storage.save(Storage.KEYS.CUSTOM_WEEK_LABELS, customLabels);
    
    document.getElementById('date-edit-row').style.display = 'none';
    UI.renderWeekDetail(this.detailWeekId);
    UI.renderHistory();
    this.showToast('Даты обновлены');
  },

  saveWeekNote() {
    const noteInput = document.getElementById('week-note-input');
    if (!noteInput) return;
    
    const wid = noteInput.dataset.weekId;
    const notes = Storage.load(Storage.KEYS.WEEK_NOTES, {});
    notes[wid] = noteInput.value;
    Storage.save(Storage.KEYS.WEEK_NOTES, notes);
    this.showToast('Заметка сохранена');
  },

  // Экспорт/Импорт
  exportData() {
    const exportData = Storage.exportAll();
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    a.href = url;
    a.download = `зарплата_${Utils.formatDate(now, 'full').replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Данные экспортированы');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        Storage.importAll(imported);
        UI.renderHistory();
        this.renderMain();
        this.showToast('Данные загружены ✓');
      } catch {
        this.showToast('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // Очистка данных
  clearAllData() {
    if (confirm('Точно удалить ВСЕ данные? Это необратимо!')) {
      Storage.clearAll();
      this.renderMain();
      UI.renderHistory();
      this.showToast('Все данные удалены');
    }
  },

  // Рендер главной
  renderMain() {
    UI.renderMain();
  },

  // Уведомления
  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    
    el.textContent = msg;
    el.classList.add('show');
    
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => App.init());