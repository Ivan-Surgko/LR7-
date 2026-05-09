// js/app.js - Основная логика приложения

const App = {
  currentModal: null,
  pendingDelete: null,
  detailWeekId: null,
  carryBlocked: false,
  carryTimer: null,

  init() {
    Storage.init();
    Config.init();
    this.setupDelegation();
    this.renderMain();

    window.addEventListener('resize', () => {
      if (document.getElementById('page-stats').classList.contains('active')) {
        Stats.renderChart();
      }
    });
  },

  // Делегирование событий для кнопок удаления
  setupDelegation() {
    document.body.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        const wid = delBtn.dataset.wid;
        const id = delBtn.dataset.id;
        const label = delBtn.dataset.label;
        this.askDelete(wid, id, label);
      }
    });

    // Кнопка подтверждения удаления
    document.getElementById('del-confirm-btn').addEventListener('click', () => {
      this.confirmDelete();
    });
  },

  showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + name);
    if (page) page.classList.add('active');

    if (name === 'main') this.renderMain();
    if (name === 'history') UI.renderHistory();
    if (name === 'stats') Stats.render();
    if (name === 'settings') Config.updateInputs();

    this.closeModal();
    this.closeDelModal();
  },

  refreshAll() {
    this.renderMain();
    if (document.getElementById('page-history').classList.contains('active')) UI.renderHistory();
    if (document.getElementById('page-stats').classList.contains('active')) Stats.render();
  },

  // Добавление записей
  addWorkday() {
    const entry = {
      type: 'workday',
      label: 'Рабочий день +' + Config.get('rate') + '₴',
      date: Utils.getTodayISO(),
      id: Utils.generateId()
    };
    Storage.addEntry(Utils.getWeekId(), entry);
    this.renderMain();
    this.showToast('+' + Config.get('rate') + '₴ зачислено');
  },

  addDayOff() {
    const entry = {
      type: 'dayoff',
      label: 'Выходной',
      date: Utils.getTodayISO(),
      id: Utils.generateId()
    };
    Storage.addEntry(Utils.getWeekId(), entry);
    this.renderMain();
    this.showToast('Выходной отмечен');
  },

  // Модальные окна
  openModal(type) {
    this.currentModal = type;
    const configs = {
      short:     { title: 'Неполный день', sub: 'Сколько часов отработал? (1–7.5)', showDate: true },
      overtime:  { title: 'Переработка', sub: 'Сколько часов сверхурочно?', showDate: true },
      deduction: { title: 'Вычет', sub: 'Сумма вычета (₴)', showDate: true },
      advance:   { title: 'Аванс', sub: 'Сколько получил авансом (₴)?', showDate: true },
    };

    const cfg = configs[type];
    if (!cfg) return;

    document.getElementById('modal-title').textContent = cfg.title;
    document.getElementById('modal-sub').textContent = cfg.sub;
    document.getElementById('modal-input').value = '';
    document.getElementById('modal-overlay').classList.add('open');

    const dateRow = document.getElementById('modal-date-row');
    const dateInput = document.getElementById('modal-date-input');
    if (cfg.showDate) {
      dateRow.style.display = 'flex';
      dateInput.value = Utils.getTodayISO();
    } else {
      dateRow.style.display = 'none';
    }

    setTimeout(() => document.getElementById('modal-input').focus(), 300);
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    this.currentModal = null;
  },

  modalConfirm() {
    const val = Math.abs(parseFloat(document.getElementById('modal-input').value));
    const dateInput = document.getElementById('modal-date-input');
    const date = dateInput.value || Utils.getTodayISO();
    const wid = Utils.getWeekId(new Date(date));

    if (this.currentModal === 'short') {
      if (!val || val <= 0 || val >= 8) { this.showToast('Введи часы от 0.5 до 7.5'); return; }
      const entry = { type: 'short', hours: val, label: `Неполный день ${val}г`, date, id: Utils.generateId() };
      Storage.addEntry(wid, entry);
      this.showToast(`+${val}г в копилку`);
    }
    if (this.currentModal === 'overtime') {
      if (!val || val <= 0) { this.showToast('Введи количество часов'); return; }
      const entry = { type: 'overtime', hours: val, label: `Переработка +${val}г`, date, id: Utils.generateId() };
      Storage.addEntry(wid, entry);
      this.showToast(`+${val}г в копилку`);
    }
    if (this.currentModal === 'deduction') {
      if (!val || val <= 0) { this.showToast('Введи сумму'); return; }
      const entry = { type: 'deduction', amount: val, label: `Вычет −${val}₴`, date, id: Utils.generateId() };
      Storage.addEntry(wid, entry);
      this.showToast(`−${val}₴ вычет`);
    }
    if (this.currentModal === 'advance') {
      if (!val || val <= 0) { this.showToast('Введи сумму'); return; }
      const entry = { type: 'advance', amount: val, label: `Аванс +${val}₴`, date, id: Utils.generateId() };
      Storage.addEntry(wid, entry);
      this.showToast(`Аванс ${val}₴ зафиксирован`);
    }

    this.closeModal();
    this.renderMain();
  },

  // Перенос часов
  carryOvertime() {
    if (this.carryBlocked) return;

    const wid = Utils.getWeekId();
    const week = Storage.getWeek(wid);
    const totals = UI.calcTotals(week);

    if (!totals.remainingHours || totals.remainingHours <= 0) {
      this.renderMain();
      return;
    }

    // Блокируем кнопку
    this.carryBlocked = true;
    const carryBtn = document.getElementById('carry-btn');
    if (carryBtn) carryBtn.disabled = true;

    // Вычисляем следующую неделю
    const monday = Utils.getMondayOfWeek(wid);
    monday.setUTCDate(monday.getUTCDate() + 7);
    const nextWid = Utils.getWeekId(monday);

    const nextWeek = Storage.getWeek(nextWid);
    nextWeek.overtimeCarry = +((nextWeek.overtimeCarry || 0) + totals.remainingHours).toFixed(2);
    Storage.updateWeek(nextWid, { overtimeCarry: nextWeek.overtimeCarry });

    // Обнуляем остаток текущей недели
    week.overtimeCarry = 0;
    Storage.updateWeek(wid, { overtimeCarry: 0 });

    this.renderMain();
    this.showToast(totals.remainingHours + 'г перенесено');

    // Разблокируем через 3 секунды
    clearTimeout(this.carryTimer);
    this.carryTimer = setTimeout(() => {
      this.carryBlocked = false;
      this.renderMain();
    }, 3000);
  },

  // Удаление
  askDelete(wid, id, label) {
    this.pendingDelete = { wid, id };
    document.getElementById('del-sub').textContent = label;
    document.getElementById('del-overlay').classList.add('open');
  },

  confirmDelete() {
    if (!this.pendingDelete) return;

    const { wid, id } = this.pendingDelete;
    const success = Storage.removeEntry(wid, id);

    this.closeDelModal();

    if (success) {
      if (this.detailWeekId && this.detailWeekId === wid) {
        UI.renderWeekDetail(wid);
      }
      this.renderMain();
      this.showToast('Удалено');
    } else {
      this.showToast('Ошибка удаления');
    }
  },

  closeDelModal() {
    document.getElementById('del-overlay').classList.remove('open');
    this.pendingDelete = null;
  },

  // Детали недели
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
    Storage.setCustomLabel(this.detailWeekId, label);

    document.getElementById('date-edit-row').style.display = 'none';
    UI.renderWeekDetail(this.detailWeekId);
    UI.renderHistory();
    this.showToast('Даты обновлены');
  },

  saveWeekNote() {
    const noteInput = document.getElementById('week-note-input');
    if (!noteInput) return;

    Storage.setWeekNote(noteInput.dataset.weekId, noteInput.value);
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
        if (Storage.importAll(imported)) {
          this.refreshAll();
          this.showToast('Данные загружены ✓');
        } else {
          this.showToast('Неверный формат файла');
        }
      } catch {
        this.showToast('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  clearAllData() {
    if (confirm('Точно удалить ВСЕ данные? Это необратимо!')) {
      Storage.clearAll();
      this.refreshAll();
      this.showToast('Все данные удалены');
    }
  },

  renderMain() {
    UI.renderMain();
  },

  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;

    el.textContent = msg;
    el.classList.add('show');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => App.init());