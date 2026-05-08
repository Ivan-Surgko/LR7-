// js/stats.js - Статистика и графики

const Stats = {
  chart: null,

  render() {
    this.renderSummary();
    this.renderChart();
    this.renderRecords();
  },

  renderSummary() {
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    const weeks = Object.values(data.weeks);
    
    let totalEarned = 0;
    let totalOvertime = 0;
    let totalDeductions = 0;
    let totalWorkdays = 0;
    let bestWeek = { amount: 0, label: '' };
    
    Object.entries(data.weeks).forEach(([wid, week]) => {
      const totals = UI.calcTotals(week);
      const net = totals.earned + totals.overtime - totals.deductions;
      totalEarned += totals.earned;
      totalOvertime += totals.overtime;
      totalDeductions += totals.deductions;
      totalWorkdays += (week.entries || []).filter(e => e.type === 'workday').length;
      
      if (net > bestWeek.amount) {
        bestWeek = { amount: net, label: UI.getWeekLabel(wid) };
      }
    });
    
    const weekCount = Object.keys(data.weeks).length || 1;
    const avgPerWeek = Math.round((totalEarned + totalOvertime - totalDeductions) / weekCount);
    
    document.getElementById('stats-summary').innerHTML = `
      <div class="stats-grid">
        <div class="stats-item">
          <div class="stats-item-label">Всего заработано</div>
          <div class="stats-item-value" style="color:var(--green)">${Utils.formatMoney(totalEarned + totalOvertime - totalDeductions)}₴</div>
        </div>
        <div class="stats-item">
          <div class="stats-item-label">В среднем/нед</div>
          <div class="stats-item-value" style="color:var(--blue)">${Utils.formatMoney(avgPerWeek)}₴</div>
        </div>
        <div class="stats-item">
          <div class="stats-item-label">Всего смен</div>
          <div class="stats-item-value" style="color:var(--purple)">${totalWorkdays}</div>
        </div>
        <div class="stats-item">
          <div class="stats-item-label">Лучшая неделя</div>
          <div class="stats-item-value" style="color:var(--yellow)">${Utils.formatMoney(bestWeek.amount)}₴</div>
        </div>
      </div>
    `;
  },

  renderChart() {
    const canvas = document.getElementById('earnings-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    
    // Берём последние 12 недель
    const wids = Object.keys(data.weeks).sort().slice(-12);
    const labels = wids.map(wid => {
      const monday = Utils.getMondayOfWeek(wid);
      return Utils.formatDate(monday);
    });
    
    const values = wids.map(wid => {
      const week = data.weeks[wid];
      const totals = UI.calcTotals(week);
      return totals.earned + totals.overtime - totals.deductions;
    });
    
    // Простой canvas график
    const width = canvas.parentElement.clientWidth - 28;
    const height = 170;
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (values.length === 0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted2');
      ctx.font = '14px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Нет данных для графика', width / 2, height / 2);
      return;
    }
    
    const maxValue = Math.max(...values, 1);
    const padding = { top: 20, right: 10, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.min(40, (chartWidth / values.length) * 0.7);
    const gap = (chartWidth - barWidth * values.length) / (values.length + 1);
    
    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Столбцы
    values.forEach((value, index) => {
      const x = padding.left + gap + (barWidth + gap) * index;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      // Градиент
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
      gradient.addColorStop(0, '#4ade80');
      gradient.addColorStop(1, 'rgba(74,222,128,0.1)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();
      
      // Значение над столбцом
      if (value > 0) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Utils.formatMoney(value), x + barWidth / 2, y - 5);
      }
      
      // Метка
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labels[index], x + barWidth / 2, height - 8);
    });
  },

  renderRecords() {
    const container = document.getElementById('stats-records');
    if (!container) return;
    
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    let totalWorkdays = 0;
    let totalShortDays = 0;
    let totalOvertimeHours = 0;
    
    Object.values(data.weeks).forEach(week => {
      (week.entries || []).forEach(entry => {
        if (entry.type === 'workday') totalWorkdays++;
        if (entry.type === 'short') {
          totalShortDays++;
          totalOvertimeHours += entry.hours || 0;
        }
        if (entry.type === 'overtime') totalOvertimeHours += entry.hours || 0;
      });
    });
    
    container.innerHTML = `
      <div class="section-lbl" style="margin-top:0">Рекорды</div>
      <div class="wd-row">
        <span class="wd-row-lbl">Всего рабочих дней</span>
        <span class="wd-row-val" style="color:var(--green)">${totalWorkdays}</span>
      </div>
      <div class="wd-row">
        <span class="wd-row-lbl">Неполных дней</span>
        <span class="wd-row-val" style="color:var(--yellow)">${totalShortDays}</span>
      </div>
      <div class="wd-row">
        <span class="wd-row-lbl">Часов переработки</span>
        <span class="wd-row-val" style="color:var(--orange)">${totalOvertimeHours}г</span>
      </div>
      <div class="wd-row">
        <span class="wd-row-lbl">Всего недель в истории</span>
        <span class="wd-row-val" style="color:var(--blue)">${Object.keys(data.weeks).length}</span>
      </div>
    `;
  }
};
