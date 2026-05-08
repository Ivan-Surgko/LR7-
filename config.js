// js/config.js - Настройки приложения

const Config = {
  defaults: {
    rate: 650,
    overtimeRate: 300,
    overtimeHours: 4,
    goal: 0,
    theme: 'dark'
  },

  current: {},

  init() {
    this.current = Storage.load(Storage.KEYS.CONFIG, { ...this.defaults });
    this.applyTheme();
    this.updateInputs();
  },

  get(key) {
    return this.current[key] || this.defaults[key];
  },

  set(key, value) {
    this.current[key] = value;
    Storage.save(Storage.KEYS.CONFIG, this.current);
  },

  updateRate() {
    const input = document.getElementById('setting-rate');
    const value = parseInt(input.value) || this.defaults.rate;
    if (value < 0) {
      input.value = this.defaults.rate;
      return;
    }
    this.set('rate', value);
    App.renderMain();
    App.showToast(`Ставка: ${value}₴`);
  },

  updateOvertimeRate() {
    const input = document.getElementById('setting-overtime-rate');
    const value = parseInt(input.value) || this.defaults.overtimeRate;
    if (value < 0) {
      input.value = this.defaults.overtimeRate;
      return;
    }
    this.set('overtimeRate', value);
    App.renderMain();
    App.showToast(`Переработка: ${value}₴`);
  },

  updateGoal() {
    const input = document.getElementById('setting-goal');
    const value = parseInt(input.value) || 0;
    if (value < 0) {
      input.value = 0;
      return;
    }
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
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.get('theme'));
    document.querySelector('meta[name="theme-color"]').content = 
      this.get('theme') === 'dark' ? '#080d14' : '#f8fafc';
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