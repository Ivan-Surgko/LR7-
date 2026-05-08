// js/goals.js - Месячные цели

const Goals = {
  updateDisplay() {
    const goal = Config.get('goal');
    const banner = document.getElementById('goal-banner');
    
    if (!banner || goal <= 0) {
      if (banner) banner.style.display = 'none';
      return;
    }
    
    banner.style.display = 'block';
    
    // Считаем заработок за текущий месяц
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const data = Storage.load(Storage.KEYS.DATA, { weeks: {} });
    
    let monthlyEarnings = 0;
    
    Object.entries(data.weeks).forEach(([wid, week]) => {
      const monday = Utils.getMondayOfWeek(wid);
      if (monday >= monthStart) {
        const totals = UI.calcTotals(week);
        monthlyEarnings += totals.earned + totals.overtime - totals.deductions;
      }
    });
    
    const progress = Math.min(100, Math.round((monthlyEarnings / goal) * 100));
    
    document.getElementById('goal-progress-text').textContent = progress + '%';
    document.getElementById('goal-bar-fill').style.width = progress + '%';
    document.getElementById('goal-current').textContent = Utils.formatMoney(monthlyEarnings) + '₴';
    document.getElementById('goal-target').textContent = Utils.formatMoney(goal) + '₴';
  }
};
