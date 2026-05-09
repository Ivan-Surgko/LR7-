// js/storage.js - Единое хранилище данных

const STORAGE_KEY = 'salary_tracker_v3';

const Storage = {
  data: null,

  init() {
    this.load();
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        // Валидация структуры
        if (!this.data.weeks) this.data.weeks = {};
        if (!this.data.customWeekLabels) this.data.customWeekLabels = {};
        if (!this.data.weekNotes) this.data.weekNotes = {};
        if (!this.data.config) this.data.config = {};
      } else {
        this.data = {
          weeks: {},
          customWeekLabels: {},
          weekNotes: {},
          config: {}
        };
      }
    } catch (e) {
      console.error('Storage load error:', e);
      this.data = {
        weeks: {},
        customWeekLabels: {},
        weekNotes: {},
        config: {}
      };
    }
  },

  save() {
    try {
      const json = JSON.stringify(this.data);
      localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded');
        App.showToast('⚠️ Хранилище переполнено! Экспортируйте данные');
      }
      return false;
    }
  },

  getWeeks() {
    return this.data.weeks;
  },

  getWeek(wid) {
    if (!this.data.weeks[wid]) {
      this.data.weeks[wid] = { entries: [], overtimeCarry: 0 };
    }
    return this.data.weeks[wid];
  },

  addEntry(wid, entry) {
    const week = this.getWeek(wid);
    week.entries.push(entry);
    this.save();
  },

  removeEntry(wid, entryId) {
    if (!this.data.weeks[wid]) return false;
    const before = this.data.weeks[wid].entries.length;
    this.data.weeks[wid].entries = this.data.weeks[wid].entries.filter(e => e.id !== entryId);
    const after = this.data.weeks[wid].entries.length;
    if (before !== after) {
      this.save();
      return true;
    }
    return false;
  },

  updateWeek(wid, updates) {
    if (!this.data.weeks[wid]) this.data.weeks[wid] = { entries: [], overtimeCarry: 0 };
    Object.assign(this.data.weeks[wid], updates);
    this.save();
  },

  getCustomLabel(wid) {
    return this.data.customWeekLabels[wid] || null;
  },

  setCustomLabel(wid, label) {
    this.data.customWeekLabels[wid] = label;
    this.save();
  },

  getWeekNote(wid) {
    return this.data.weekNotes[wid] || '';
  },

  setWeekNote(wid, note) {
    this.data.weekNotes[wid] = note;
    this.save();
  },

  getConfig() {
    return this.data.config;
  },

  setConfig(config) {
    this.data.config = { ...this.data.config, ...config };
    this.save();
  },

  exportAll() {
    return JSON.parse(JSON.stringify(this.data));
  },

  importAll(importedData) {
    try {
      if (!importedData.weeks) throw new Error('Invalid data structure');
      this.data = {
        weeks: importedData.weeks || {},
        customWeekLabels: importedData.customWeekLabels || {},
        weekNotes: importedData.weekNotes || {},
        config: importedData.config || {}
      };
      this.save();
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  },

  clearAll() {
    this.data = {
      weeks: {},
      customWeekLabels: {},
      weekNotes: {},
      config: {}
    };
    localStorage.removeItem(STORAGE_KEY);
  }
};