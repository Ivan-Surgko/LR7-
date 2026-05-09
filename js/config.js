// js/config.js - Настройки приложения

const Config = {
  defaults: {
    rate: 650,
    overtimeRate: 300,
    overtimeHours: 4,
    goal: 0,
    theme: 'dark'
  },

  init() {
    const saved = Storage.getConfig();
    this.current = { ...this.defaults, ...saved };
    this.applyTheme();
    this.updateInputs();
  },

  get(key) {
    return this.current[key] ?? this.defaults[key];
  },

  set(key, value) {
    this.current[key] = value;
    Storage.setConfig(this.current);
  },

  updateRate() {
    const input = document.getElementById('setting-rate');
    let value = Math.abs(parseInt(input.value) || this.defaults.rate);
    input.value = value;
    this.set('rate', value);
    App.refreshAll();
    App.showToast(`Ставка: ${value}₴`);
  },

  updateOvertimeRate() {
    const input = document.getElementById('setting-overtime-rate');
    let value = Math.abs(parseInt(input.value) || this.defaults.overtimeRate);
    input.value = value;
    this.set('overtimeRate', value);
    App.refreshAll();
    App.showToast(`Переработка: ${value}₴`);
  },

  updateGoal() {
    const input = document.getElementById('setting-goal');
    let value = Math.abs(parseInt(input.value) || 0);
    input.value = value;
    this.set('goal', value);
    Goals.updateDisplay();
    App.showToast(value > 0 ? `Цель: ${value}₴` : 'Цель сброшена');
  },

  setTheme(theme) {
    this.set('theme', theme);
    this.applyTheme();
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(theme === 'dark' ? 'Тёмная' : 'Светлая'));
    });
    // Перерисовываем график при смене темы
    if (document.getElementById('page-stats').classList.contains('active')) {
      Stats.renderChart();
    }
  },

  applyTheme() {
    const theme = this.get('theme');
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]').content =
      theme === 'dark' ? '#080d14' : '#f8fafc';
  },

  updateInputs() {
    const rateInput = document.getElementById('setting-rate');
    const overtimeInput = document.getElementById('setting-overtime-rate');
    const goalInput = document.getElementById('setting-goal');

    if (rateInput) rateInput.value = this.get('rate');
    if (overtimeInput) overtimeInput.value = this.get('overtimeRate');
    if (goalInput) goalInput.value = this.get('goal');
  }
};