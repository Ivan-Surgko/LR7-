// js/ui.js - Рендеринг интерфейса

const UI = {
  typeStyles: {
    workday:   { icon:'✓', color:'var(--green)',  bg:'rgba(74,222,128,0.07)' },
    short:     { icon:'◑', color:'var(--yellow)', bg:'rgba(250,204,21,0.07)' },
    overtime:  { icon:'⊕', color:'var(--orange)', bg:'rgba(251,146,60,0.07)' },
    dayoff:    { icon:'○', color:'var(--muted)',  bg:'rgba(100,116,139,0.06)' },
    deduction: { icon:'↓', color:'var(--red)',    bg:'rgba(248,113,113,0.07)' },
    advance:   { icon:'↑', color:'var(--purple)', bg:'rgba(167,139,250,0.07)' },
  },

  // Рендер главной страницы
  renderMain() {
    const wid = Utils.getWeekId();
    const week = Storage.load(Storage.KEYS.DATA, {}).weeks?.[wid] || { entries: [], overtimeCarry: 0 };
    const totals = this.calcTotals(week);
    
    // Заголовок недели
    document.getElementById('main-week-label').textContent = this.getWeekLabel(wid);
    
    // Перенос с прошлой недели
    const carryBadge = document.getElementById('carry-badge');
    if (week.overtimeCarry > 0) {
      carryBadge.textContent = '↩ Перенесено: ' + week.overtimeCarry + 'г';
      carryBadge.style.display = 'block';
    } else {
      carryBadge.style.display = 'none';
    }
    
    // Итоговая сумма
    const net = totals.earned + totals.overtime - totals.deductions;
    document.getElementById('main-total').textContent = Utils.formatMoney(net);
    
    // Блок аванса
    const advBlock = document.getElementById('advance-block');
    if (totals.advance > 0) {
      advBlock.style.display = 'block';
      document.getElementById('advance-sub-text').textContent = 'аванс −' + Utils.formatMoney(totals.advance) + '₴';
      document.getElementById('to-receive-text').textContent = '= ' + Utils.formatMoney(net - totals.advance) + '₴';
    } else {
      advBlock.style.display = 'none';
    }
    
    // Мини-статистика
    document.getElementById('ms-days').textContent = (week.entries || []).filter(e => e.type === 'workday').length + ' дн';
    document.getElementById('ms-ot').textContent = Utils.formatMoney(totals.overtime) + '₴';
    document.getElementById('ms-rem').textContent = totals.remainingHours + 'г';
    
    const dedBlock = document.getElementById('ms-ded-block');
    if (totals.deductions > 0) {
      dedBlock.style.display = '';
      document.getElementById('ms-ded').textContent = '−' + Utils.formatMoney(totals.deductions) + '₴';
    } else {
      dedBlock.style.display = 'none';
    }
    
    // Кнопка переноса
    const carryBtn = document.getElementById('carry-btn');
    if (totals.remainingHours > 0) {
      carryBtn.textContent = 'Перенести ' + totals.remainingHours + 'г на следующую неделю →';
      carryBtn.style.display = 'block';
    } else {
      carryBtn.style.display = 'none';
    }
    
    // Последние записи
    const entries = week.entries || [];
    const recentBlock = document.getElementById('recent-block');
    const recentList = document.getElementById('recent-list');
    
    if (entries.length > 0) {
      recentBlock.style.display = 'block';
      const recent = [...entries].reverse().slice(0, 6);
      recentList.innerHTML = recent.map(e => this.entryHTML(wid, e)).join('');
    } else {
      recentBlock.style.display = 'none';
      recentList.innerHTML = '';
    }
    
    // Обновление цели
    Goals.updateDisplay();
  },

  // Рендер истории
  renderHistory() {
    const cards = document.getElementById('hist-cards');
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    const period = document.getElementById('period-select')?.value || 'all';
    
    let wids = Object.keys(data.weeks).sort((a, b) => b.localeCompare(a));
    
    // Фильтрация по периоду
    if (period !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (period === 'month') filterDate.setMonth(now.getMonth() - 1);
      else if (period === 'quarter') filterDate.setMonth(now.getMonth() - 3);
      else if (period === 'year') filterDate.setFullYear(now.getFullYear() - 1);
      
      wids = wids.filter(wid => {
        const monday = Utils.getMondayOfWeek(wid);
        return monday >= filterDate;
      });
    }
    
    if (wids.length === 0) {
      cards.innerHTML = '<div class="empty">Нет записей за выбранный период</div>';
      return;
    }
    
    const currentWid = Utils.getWeekId();
    
    cards.innerHTML = wids.map(wid => {
      const week = data.weeks[wid];
      const totals = this.calcTotals(week);
      const isCurrent = wid === currentWid;
      const typesSet = [...new Set((week.entries || []).map(e => e.type))];
      const net = totals.earned + totals.overtime - totals.deductions;
      
      return `
        <div class="hist-card ${isCurrent ? 'current' : ''}" onclick="App.openWeekDetail('${wid}')">
          <div class="hist-card-top">
            <div>
              <div class="hist-wlbl">${this.getWeekLabel(wid)}</div>
              ${isCurrent ? '<span class="hist-badge">текущая</span>' : ''}
            </div>
            <div>
              <div class="hist-amount">${Utils.formatMoney(net)}₴</div>
              ${totals.advance > 0 ? `<div class="hist-adv">аванс −${Utils.formatMoney(totals.advance)}₴</div>` : ''}
            </div>
          </div>
          <div class="hist-types">
            ${typesSet.map(tp => `
              <span class="hist-type-dot" style="color:${(this.typeStyles[tp] || {}).color || 'var(--muted)'}">
                ${(this.typeStyles[tp] || {}).icon || '?'} ${(week.entries || []).filter(e => e.type === tp).length}
              </span>
            `).join('')}
            ${(week.overtimeCarry || 0) > 0 ? `<span class="hist-type-dot" style="color:var(--orange)">↩ ${week.overtimeCarry}г</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  // Рендер деталей недели
  renderWeekDetail(wid) {
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    const week = data.weeks[wid] || { entries: [], overtimeCarry: 0 };
    const totals = this.calcTotals(week);
    const net = totals.earned + totals.overtime - totals.deductions;
    
    document.getElementById('wd-title').textContent = this.getWeekLabel(wid);
    
    // Бейдж переноса
    const cb = document.getElementById('wd-carry-badge');
    if ((week.overtimeCarry || 0) > 0) {
      cb.textContent = '↩ Перенесено с прошлой недели: ' + week.overtimeCarry + 'г';
      cb.style.display = 'block';
    } else {
      cb.style.display = 'none';
    }
    
    // Заметка
    const notes = Storage.load(Storage.KEYS.WEEK_NOTES, {});
    const noteInput = document.getElementById('week-note-input');
    if (noteInput) {
      noteInput.value = notes[wid] || '';
      noteInput.dataset.weekId = wid;
    }
    
    // Сводка
    let rows = `
      <div class="wd-row">
        <span class="wd-row-lbl">Рабочих дней</span>
        <span class="wd-row-val" style="color:var(--green)">${(week.entries || []).filter(e => e.type === 'workday').length} × ${Config.get('rate')}₴</span>
      </div>
    `;
    rows += `
      <div class="wd-row">
        <span class="wd-row-lbl">Переработка</span>
        <span class="wd-row-val" style="color:var(--orange)">${Utils.formatMoney(totals.overtime)}₴</span>
      </div>
    `;
    
    if (totals.deductions > 0) {
      rows += `
        <div class="wd-row">
          <span class="wd-row-lbl">Вычеты</span>
          <span class="wd-row-val" style="color:var(--red)">−${Utils.formatMoney(totals.deductions)}₴</span>
        </div>
      `;
    }
    
    if (totals.advance > 0) {
      rows += `
        <div class="wd-row">
          <span class="wd-row-lbl">Аванс</span>
          <span class="wd-row-val" style="color:var(--purple)">${Utils.formatMoney(totals.advance)}₴</span>
        </div>
      `;
    }
    
    rows += '<div class="divider"></div>';
    rows += `
      <div class="wd-row big">
        <span class="wd-row-lbl">Заработано</span>
        <span class="wd-row-val" style="color:var(--text)">${Utils.formatMoney(net)}₴</span>
      </div>
    `;
    
    if (totals.advance > 0) {
      rows += `
        <div class="wd-row big">
          <span class="wd-row-lbl">К получению</span>
          <span class="wd-row-val" style="color:var(--green)">${Utils.formatMoney(net - totals.advance)}₴</span>
        </div>
      `;
    }
    
    if (totals.remainingHours > 0) {
      rows += `<div style="font-size:12px;color:var(--muted2);margin-top:4px">↩ Остаток переработки: ${totals.remainingHours}г</div>`;
    }
    
    document.getElementById('wd-summary').innerHTML = rows;
    
    // Записи
    const entries = week.entries || [];
    const entriesContainer = document.getElementById('wd-entries');
    if (entriesContainer) {
      entriesContainer.innerHTML = entries.length === 0
        ? '<div class="empty">Нет записей</div>'
        : [...entries].reverse().map(e => this.entryHTML(wid, e)).join('');
    }
  },

  // HTML для записи
  entryHTML(wid, entry) {
    const ts = this.typeStyles[entry.type] || { icon: '?', color: 'var(--muted)', bg: 'rgba(255,255,255,0.03)' };
    return `
      <div class="entry-row" style="background:${ts.bg}">
        <span class="e-icon" style="color:${ts.color}">${ts.icon}</span>
        <span class="e-label">${entry.label}</span>
        <button class="del-btn" onclick="App.askDelete('${wid}', ${entry.id}, '${entry.label.replace(/'/g, "\\'")}')">✕</button>
      </div>
    `;
  },

  // Получение метки недели
  getWeekLabel(wid) {
    const customLabels = Storage.load(Storage.KEYS.CUSTOM_WEEK_LABELS, {});
    if (customLabels[wid]) return customLabels[wid];
    
    const monday = Utils.getMondayOfWeek(wid);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    
    return Utils.formatDate(monday) + ' — ' + Utils.formatDate(sunday) + '.' + String(sunday.getUTCFullYear()).slice(2);
  },

  // Расчёт totals
  calcTotals(week) {
    if (!week) return { earned: 0, overtime: 0, deductions: 0, advance: 0, overtimeHours: 0, remainingHours: 0 };
    
    const rate = Config.get('rate');
    const overtimeRate = Config.get('overtimeRate');
    const overtimeHoursBlock = Config.get('overtimeHours');
    
    let earned = 0;
    let overtimeHours = week.overtimeCarry || 0;
    let deductions = 0;
    let advance = 0;
    
    for (const e of week.entries || []) {
      if (e.type === 'workday') earned += rate;
      if (e.type === 'short' || e.type === 'overtime') overtimeHours += e.hours;
      if (e.type === 'deduction') deductions += e.amount;
      if (e.type === 'advance') advance += e.amount;
    }
    
    const blocks = Math.floor(overtimeHours / overtimeHoursBlock);
    const overtimePay = blocks * overtimeRate;
    const remainingHours = +(overtimeHours - blocks * overtimeHoursBlock).toFixed(2);
    
    return { earned, overtime: overtimePay, deductions, advance, overtimeHours, remainingHours };
  }
};