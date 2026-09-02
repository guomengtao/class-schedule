/* ============================================================
   Ev课程表 · 应用主逻辑
   ============================================================ */

/* ---------- Course Data ---------- */
const courseData = {
  // icon names from lucide
  iconMap: {
    math: 'sigma',
    english: 'languages',
    cs: 'cpu',
    politics: 'book-open',
    pe: 'dumbbell',
    physics: 'atom',
    chemistry: 'flask-conical',
    history: 'landmark'
  },
  courses: {
    math_a: {
      id: 'math_a',
      name: '高等数学 A',
      teacher: '王建国',
      department: '理学院',
      room: '教学楼 A-301',
      type: '必修',
      credits: 4,
      icon: 'math',
      weeks: '第 1 - 16 周',
      color: 'var(--ev-brand-100)',
      weekdays: [1, 3] // 周一、周三
    },
    english_iii: {
      id: 'english_iii',
      name: '大学英语 III',
      teacher: '李雅婷',
      department: '外语学院',
      room: '外语楼 B-205',
      type: '必修',
      credits: 3,
      icon: 'english',
      weeks: '第 1 - 16 周',
      color: 'var(--ev-brand-100)',
      weekdays: [1, 3, 5]
    },
    data_structure: {
      id: 'data_structure',
      name: '数据结构',
      teacher: '张明辉',
      department: '信息学院',
      room: '信息楼 C-402',
      type: '必修',
      credits: 4,
      icon: 'cs',
      weeks: '第 3 - 16 周',
      color: 'var(--ev-brand-100)',
      weekdays: [1, 3, 4]
    },
    marxism: {
      id: 'marxism',
      name: '马克思主义基本原理',
      teacher: '陈静',
      department: '马克思主义学院',
      room: '教学楼 D-108',
      type: '必修',
      credits: 3,
      icon: 'politics',
      weeks: '第 1 - 12 周',
      color: 'var(--ev-brand-100)',
      weekdays: [1, 4]
    },
    physics: {
      id: 'physics',
      name: '大学物理',
      teacher: '刘志强',
      department: '理学院',
      room: '理学楼 E-201',
      type: '必修',
      credits: 4,
      icon: 'physics',
      weeks: '第 1 - 16 周',
      color: 'var(--ev-brand-100)',
      weekdays: [2, 4]
    },
    pe: {
      id: 'pe',
      name: '体育（篮球）',
      teacher: '孙大鹏',
      department: '体育部',
      room: '体育馆 A 区',
      type: '必修',
      credits: 2,
      icon: 'pe',
      weeks: '第 1 - 16 周',
      color: 'var(--ev-brand-100)',
      weekdays: [2, 5]
    }
  },
  // 每天的课程安排：{ weekday: [{courseId, start, end, period}] }
  schedule: {
    1: [ // 周一
      { courseId: 'math_a', start: '08:00', end: '09:35', period: '01-02节' },
      { courseId: 'english_iii', start: '10:00', end: '11:35', period: '03-04节' },
      { courseId: 'data_structure', start: '14:00', end: '15:35', period: '05-06节' },
      { courseId: 'marxism', start: '16:00', end: '17:35', period: '07-08节' }
    ],
    2: [ // 周二
      { courseId: 'physics', start: '08:00', end: '09:35', period: '01-02节' },
      { courseId: 'pe', start: '10:00', end: '11:35', period: '03-04节' },
      { courseId: 'english_iii', start: '14:00', end: '15:35', period: '05-06节' }
    ],
    3: [ // 周三 (Today)
      { courseId: 'math_a', start: '08:00', end: '09:35', period: '01-02节' },
      { courseId: 'english_iii', start: '10:00', end: '11:35', period: '03-04节' },
      { courseId: 'data_structure', start: '14:00', end: '15:35', period: '05-06节' }
    ],
    4: [ // 周四
      { courseId: 'data_structure', start: '08:00', end: '09:35', period: '01-02节' },
      { courseId: 'physics', start: '10:00', end: '11:35', period: '03-04节' },
      { courseId: 'marxism', start: '14:00', end: '15:35', period: '05-06节' }
    ],
    5: [ // 周五
      { courseId: 'english_iii', start: '08:00', end: '09:35', period: '01-02节' },
      { courseId: 'pe', start: '10:00', end: '11:35', period: '03-04节' },
      { courseId: 'data_structure', start: '14:00', end: '15:35', period: '05-06节' }
    ]
  },
  weekdayLabels: [
    { label: '周一', date: '9/1' },
    { label: '周二', date: '9/2' },
    { label: '周三', date: '9/3' },
    { label: '周四', date: '9/4' },
    { label: '周五', date: '9/5' }
  ]
};

/* ---------- App State ---------- */
const state = {
  currentView: 'today',   // today, week, detail, settings
  previousView: 'today',
  currentWeekday: 3,      // 1-5, 3 = Wednesday (today)
  currentCourseId: null,
  theme: 'light',         // light, dark
  deviceMode: 'watch',    // watch, mobile, full
  settings: {
    beforeClassReminder: true,
    reminderMinutes: 15,
    lastSync: '2025-09-03 08:30'
  }
};

/* ---------- Utilities ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Add ripple effect
function addRipple(el, e) {
  if (!el.classList.contains('ripple')) {
    el.classList.add('ripple');
  }
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (e?.clientX ?? (rect.left + rect.width / 2)) - rect.left - size / 2;
  const y = (e?.clientY ?? (rect.top + rect.height / 2)) - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// Parse time "HH:MM" to minutes since midnight
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Format minutes remaining into natural Chinese
function formatRemaining(mins) {
  if (mins <= 0) return '即将下课';
  if (mins < 60) return `剩余 ${mins} 分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `剩余 ${h} 小时 ${m} 分钟` : `剩余 ${h} 小时`;
}

/* ---------- Status Bar Clock ---------- */
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  $$('.status-clock').forEach(el => { el.textContent = timeStr; });
  updateActiveClassProgress();
}

/* ---------- Active Class Calculation ---------- */
function getActiveClassInfo() {
  // Simulated "now" = Wednesday 08:00 + progress (for demo purposes, use real clock but day fixed to Wednesday)
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // For demo: pretend it's around 09:17 (18 min remaining from 08:00-09:35 => 95 min total, ~77 min elapsed)
  // Actually let's just use a fixed reference: 09:17 => 9*60+17 = 557 minutes
  // Class math_a runs 08:00 (480) to 09:35 (575)
  // We want to show 18 min remaining => current should be 575 - 18 = 557
  const demoMinutes = 557;

  const todaySchedule = courseData.schedule[state.currentWeekday] || [];
  for (const slot of todaySchedule) {
    const startM = timeToMinutes(slot.start);
    const endM = timeToMinutes(slot.end);
    if (demoMinutes >= startM && demoMinutes < endM) {
      const total = endM - startM;
      const elapsed = demoMinutes - startM;
      const remaining = endM - demoMinutes;
      const progress = Math.min(100, (elapsed / total) * 100);
      return { slot, remaining, progress, total };
    }
  }
  // Find next upcoming
  for (const slot of todaySchedule) {
    if (timeToMinutes(slot.start) > demoMinutes) {
      return { slot, next: true, remaining: timeToMinutes(slot.start) - demoMinutes };
    }
  }
  return null;
}

function updateActiveClassProgress() {
  const info = getActiveClassInfo();
  const fill = $('#class-progress-fill');
  if (fill && info && !info.next) {
    fill.style.width = `${info.progress.toFixed(1)}%`;
  }
  const remainEl = $('#class-remaining');
  if (remainEl && info) {
    remainEl.textContent = formatRemaining(info.remaining);
  }
}

/* ---------- Rendering: Today View ---------- */
function renderToday() {
  const todaySchedule = courseData.schedule[state.currentWeekday] || [];
  const activeInfo = getActiveClassInfo();

  // Current/Active class
  const currentSlot = activeInfo && !activeInfo.next ? activeInfo.slot : null;
  const currentCourse = currentSlot ? courseData.courses[currentSlot.courseId] : null;

  let nextSlot = null;
  if (currentSlot) {
    const idx = todaySchedule.findIndex(s => s === currentSlot);
    nextSlot = idx >= 0 && idx + 1 < todaySchedule.length ? todaySchedule[idx + 1] : null;
  } else if (activeInfo && activeInfo.next) {
    nextSlot = activeInfo.slot;
  } else if (todaySchedule.length > 0) {
    nextSlot = todaySchedule[0];
  }
  const nextCourse = nextSlot ? courseData.courses[nextSlot.courseId] : null;

  const wrap = $('#view-today .screen-content');
  let html = '';

  // Current class section
  html += `<section class="mb-3">`;
  if (currentCourse) {
    html += `
      <div class="flex items-center gap-1.5 mb-2">
        <span class="pulse-dot"></span>
        <span class="ev-micro text-primary font-medium">正在上课</span>
      </div>
      <article class="course-card active ripple" data-course="${currentCourse.id}" data-slot-start="${currentSlot.start}" data-slot-end="${currentSlot.end}" data-dom-id="class-current-detail">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h2 class="ev-h2 text-foreground truncate">${currentCourse.name}</h2>
            <p class="ev-caption text-muted-foreground mt-0.5 truncate">${currentCourse.teacher} · ${currentCourse.room}</p>
          </div>
          <span class="ev-micro px-2 py-0.5 rounded-md bg-primary text-primary-foreground whitespace-nowrap">${currentSlot.period}</span>
        </div>
        <div class="flex items-center gap-3 mt-2 pt-2 border-t border-primary/10">
          <span class="ev-micro text-foreground"><span class="ev-mono">${currentSlot.start}</span> - <span class="ev-mono">${currentSlot.end}</span></span>
          <span class="ev-micro text-muted-foreground" id="class-remaining">${formatRemaining(activeInfo.remaining)}</span>
        </div>
        <div class="class-progress">
          <div class="class-progress-fill" id="class-progress-fill" style="width: ${activeInfo.progress.toFixed(1)}%"></div>
        </div>
      </article>`;
  } else {
    html += `
      <div class="flex items-center gap-1.5 mb-2">
        <span class="ev-micro text-muted-foreground">· 当前无课 ·</span>
      </div>`;
  }
  html += `</section>`;

  // Next class
  html += `<section class="mb-3">`;
  if (nextCourse) {
    html += `
      <h3 class="ev-caption text-muted-foreground mb-2">接下来</h3>
      <article class="course-card ripple" data-course="${nextCourse.id}" data-dom-id="class-next-detail">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h2 class="ev-h3 text-foreground truncate">${nextCourse.name}</h2>
            <p class="ev-micro text-muted-foreground truncate">${nextCourse.teacher} · ${nextCourse.room}</p>
          </div>
          <span class="ev-micro px-2 py-0.5 rounded-md bg-muted text-foreground whitespace-nowrap">${nextSlot.period}</span>
        </div>
        <p class="ev-micro text-muted-foreground mt-1.5"><span class="ev-mono">${nextSlot.start}</span> - <span class="ev-mono">${nextSlot.end}</span></p>
      </article>`;
  }
  html += `</section>`;

  // Today full list
  html += `<section>`;
  html += `<h3 class="ev-caption text-muted-foreground mb-2">今日全部</h3>`;
  html += `<div class="space-y-2">`;
  todaySchedule.forEach((slot, idx) => {
    const c = courseData.courses[slot.courseId];
    const iconName = courseData.iconMap[c.icon];
    html += `
      <article class="course-card ripple" data-course="${c.id}" data-dom-id="class-list-${idx + 1}">
        <div class="flex items-center gap-3">
          <div class="course-icon-box" style="background: ${idx === 0 ? 'rgba(37,99,235,0.1)' : c.color}">
            <i data-lucide="${iconName}" class="w-4 h-4 text-primary"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="ev-body text-foreground truncate">${c.name}</h4>
            <p class="ev-micro text-muted-foreground truncate">${slot.start} · ${c.room.split(' ').pop()}</p>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-muted-foreground shrink-0"></i>
        </div>
      </article>`;
  });
  if (todaySchedule.length === 0) {
    html += `
      <div class="course-card">
        <div class="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <i data-lucide="calendar-off" class="w-8 h-8 mb-2 opacity-50"></i>
          <p class="ev-caption">今日没有课程安排</p>
        </div>
      </div>`;
  }
  html += `</div></section>`;

  wrap.innerHTML = html;
  lucide.createIcons();
  bindCourseCardClicks(wrap);
  bindRipples(wrap);
}

/* ---------- Rendering: Week View ---------- */
function renderWeek() {
  // Week tabs
  const tabsWrap = $('#week-tabs');
  tabsWrap.innerHTML = courseData.weekdayLabels.map((wd, i) => {
    const day = i + 1;
    const active = day === state.currentWeekday ? 'active' : '';
    return `
      <button class="week-tab ripple ${active}" data-weekday="${day}">
        <span class="ev-micro">${wd.label}</span>
        <span class="ev-micro ev-mono">${wd.date}</span>
      </button>`;
  }).join('');

  // Schedule list
  const schedule = courseData.schedule[state.currentWeekday] || [];
  const listWrap = $('#view-week .screen-content > section');
  listWrap.className = 'space-y-2';

  let html = '';
  schedule.forEach((slot, idx) => {
    const c = courseData.courses[slot.courseId];
    const iconName = courseData.iconMap[c.icon];
    html += `
      <article class="course-card ripple" data-course="${c.id}" data-dom-id="class-week-${idx + 1}">
        <div class="flex items-center gap-3">
          <div class="course-icon-box" style="background: ${idx === 0 ? 'rgba(37,99,235,0.1)' : c.color}">
            <i data-lucide="${iconName}" class="w-4 h-4 text-primary"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="ev-body text-foreground truncate">${c.name}</h4>
            <p class="ev-micro text-muted-foreground truncate">${c.teacher} · ${c.room.split(' ').pop()}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="ev-micro ev-mono text-foreground">${slot.start}</p>
            <p class="ev-micro ev-mono text-muted-foreground">${slot.end}</p>
          </div>
        </div>
      </article>`;
  });
  if (schedule.length === 0) {
    html += `
      <div class="course-card">
        <div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <i data-lucide="coffee" class="w-8 h-8 mb-2 opacity-50"></i>
          <p class="ev-caption">当天没有课程，享受假期！</p>
        </div>
      </div>`;
  }
  listWrap.innerHTML = html;
  lucide.createIcons();

  // Bind week tab clicks
  $$('#week-tabs .week-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      addRipple(tab, e);
      const day = Number(tab.dataset.weekday);
      if (day !== state.currentWeekday) {
        state.currentWeekday = day;
        // Update tabs
        $$('#week-tabs .week-tab').forEach(t => t.classList.toggle('active', Number(t.dataset.weekday) === day));
        // Re-render schedule with small animation
        listWrap.style.opacity = '0';
        listWrap.style.transform = 'translateY(8px)';
        setTimeout(() => {
          renderWeekScheduleOnly();
          listWrap.style.transition = 'none';
          listWrap.style.opacity = '1';
          listWrap.style.transform = '';
          setTimeout(() => { listWrap.style.transition = ''; }, 10);
        }, 120);
      }
    });
  });

  bindCourseCardClicks(listWrap);
  bindRipples(tabsWrap);
}

function renderWeekScheduleOnly() {
  const schedule = courseData.schedule[state.currentWeekday] || [];
  const listWrap = $('#view-week .screen-content > section');
  let html = '';
  schedule.forEach((slot, idx) => {
    const c = courseData.courses[slot.courseId];
    const iconName = courseData.iconMap[c.icon];
    html += `
      <article class="course-card ripple" data-course="${c.id}" data-dom-id="class-week-${idx + 1}">
        <div class="flex items-center gap-3">
          <div class="course-icon-box" style="background: ${idx === 0 ? 'rgba(37,99,235,0.1)' : c.color}">
            <i data-lucide="${iconName}" class="w-4 h-4 text-primary"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h4 class="ev-body text-foreground truncate">${c.name}</h4>
            <p class="ev-micro text-muted-foreground truncate">${c.teacher} · ${c.room.split(' ').pop()}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="ev-micro ev-mono text-foreground">${slot.start}</p>
            <p class="ev-micro ev-mono text-muted-foreground">${slot.end}</p>
          </div>
        </div>
      </article>`;
  });
  if (schedule.length === 0) {
    html += `
      <div class="course-card">
        <div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <i data-lucide="coffee" class="w-8 h-8 mb-2 opacity-50"></i>
          <p class="ev-caption">当天没有课程，享受假期！</p>
        </div>
      </div>`;
  }
  listWrap.innerHTML = html;
  lucide.createIcons();
  bindCourseCardClicks(listWrap);
  bindRipples(listWrap);
}

/* ---------- Rendering: Course Detail ---------- */
function renderDetail(courseId) {
  const c = courseData.courses[courseId];
  if (!c) { navigate('today'); return; }
  state.currentCourseId = courseId;

  const iconName = courseData.iconMap[c.icon];
  const weekdayStr = c.weekdays.map(d => courseData.weekdayLabels[d - 1].label).join('、');

  // Get time from schedule for this weekday
  const schedule = courseData.schedule[state.currentWeekday] || [];
  const slot = schedule.find(s => s.courseId === courseId);
  let timeStr = '';
  if (slot) {
    timeStr = `${courseData.weekdayLabels[state.currentWeekday - 1].label} ${slot.start} - ${slot.end}`;
  } else {
    // fallback to first weekday of the course
    const firstDay = c.weekdays[0];
    const firstSlot = (courseData.schedule[firstDay] || []).find(s => s.courseId === courseId);
    if (firstSlot) {
      timeStr = `${courseData.weekdayLabels[firstDay - 1].label} ${firstSlot.start} - ${firstSlot.end}`;
    } else {
      timeStr = `${weekdayStr} · 详见课表`;
    }
  }

  const wrap = $('#view-detail .screen-content');
  wrap.innerHTML = `
    <section class="detail-card mb-3">
      <div class="detail-hero-icon">
        <i data-lucide="${iconName}" class="w-6 h-6 text-primary"></i>
      </div>
      <h2 class="ev-h1 text-foreground">${c.name}</h2>
      <p class="ev-caption text-muted-foreground mt-1">${c.teacher} · ${c.department}</p>
      <div class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="ev-micro px-2 py-0.5 rounded-md bg-primary/10 text-primary whitespace-nowrap">${c.type}</span>
        <span class="ev-micro px-2 py-0.5 rounded-md bg-muted text-muted-foreground whitespace-nowrap">${c.credits} 学分</span>
      </div>
    </section>

    <section class="detail-card mb-3">
      <div class="info-row">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="clock" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-micro text-muted-foreground">上课时间</p>
          <p class="ev-body text-foreground truncate">${timeStr}</p>
        </div>
      </div>
      <div class="info-row">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-micro text-muted-foreground">上课地点</p>
          <p class="ev-body text-foreground truncate">${c.room}</p>
        </div>
      </div>
      <div class="info-row">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-micro text-muted-foreground">上课周次</p>
          <p class="ev-body text-foreground truncate">${c.weeks}</p>
        </div>
      </div>
    </section>

    <section class="detail-card">
      <div class="flex items-center gap-2 mb-2">
        <i data-lucide="bell" class="w-3.5 h-3.5 text-primary"></i>
        <h3 class="ev-h3 text-foreground">课前提醒</h3>
      </div>
      <p class="ev-body text-foreground">上课前 ${state.settings.reminderMinutes} 分钟震动提醒</p>
      <p class="ev-micro text-muted-foreground mt-1">${state.settings.beforeClassReminder ? '已开启' : '已关闭'}</p>
    </section>
  `;
  lucide.createIcons();
}

/* ---------- Rendering: Settings View ---------- */
function renderSettings() {
  const syncDate = new Date(state.settings.lastSync);
  const syncStr = `已同步 ${syncDate.getMonth() + 1}月${syncDate.getDate()}日`;

  const reminderOn = state.settings.beforeClassReminder;

  const wrap = $('#view-settings .screen-content');
  wrap.innerHTML = `
    <section class="settings-card mb-3">
      <div class="settings-row ripple">
        <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <i data-lucide="user" class="w-4 h-4 text-primary"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">2023 计算机科学</p>
          <p class="ev-micro text-muted-foreground truncate">${syncStr}</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-muted-foreground shrink-0"></i>
      </div>
    </section>

    <section class="settings-card mb-3">
      <div class="settings-row ripple" id="row-reminder-toggle">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="bell" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">课前提醒</p>
        </div>
        <button class="toggle ${reminderOn ? '' : 'off'}" id="toggle-reminder" aria-label="切换课前提醒"></button>
      </div>
      <div class="settings-row ripple" id="row-reminder-time">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="clock" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">提醒时间</p>
        </div>
        <span class="ev-micro text-muted-foreground whitespace-nowrap">${state.settings.reminderMinutes} 分钟</span>
      </div>
    </section>

    <section class="settings-card mb-3">
      <div class="settings-row ripple" id="row-course-manage">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="book-open" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">课程管理</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-muted-foreground shrink-0"></i>
      </div>
      <div class="settings-row ripple" id="row-sync">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-muted-foreground" id="sync-icon"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">同步课表</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-muted-foreground shrink-0"></i>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-row ripple">
        <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <i data-lucide="info" class="w-3.5 h-3.5 text-muted-foreground"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="ev-body text-foreground truncate">关于 Ev课程表</p>
        </div>
        <span class="ev-micro text-muted-foreground whitespace-nowrap">v2.1.0</span>
      </div>
    </section>
  `;
  lucide.createIcons();
  bindSettingsInteractions();
  bindRipples(wrap);
}

/* ---------- Bindings ---------- */
function bindCourseCardClicks(ctx) {
  $$('.course-card', ctx).forEach(card => {
    if (card.__courseBound) return;
    card.__courseBound = true;
    card.addEventListener('click', (e) => {
      addRipple(card, e);
      const courseId = card.dataset.course;
      if (courseId) {
        setTimeout(() => navigate('detail', courseId), 120);
      }
    });
  });
}

function bindRipples(ctx) {
  $$('.ripple', ctx).forEach(el => {
    if (el.__rippleBound) return;
    el.__rippleBound = true;
    el.addEventListener('click', (e) => {
      // Don't double-add if ripple was added via explicit call
      if (!e.target.closest('.ripple-effect')) {
        // handled already at click site for week-tabs, course-cards
      }
    });
  });
}

function bindSettingsInteractions() {
  const toggle = $('#toggle-reminder');
  if (toggle && !toggle.__bound) {
    toggle.__bound = true;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOn = !toggle.classList.contains('off');
      if (isOn) {
        toggle.classList.add('off');
        state.settings.beforeClassReminder = false;
      } else {
        toggle.classList.remove('off');
        state.settings.beforeClassReminder = true;
      }
      // Slight bounce
      toggle.style.transform = 'scale(0.92)';
      setTimeout(() => { toggle.style.transform = ''; }, 120);
    });
  }

  const timeRow = $('#row-reminder-time');
  if (timeRow && !timeRow.__bound) {
    timeRow.__bound = true;
    timeRow.addEventListener('click', () => {
      // Cycle through 5, 10, 15, 20, 30
      const options = [5, 10, 15, 20, 30];
      const idx = options.indexOf(state.settings.reminderMinutes);
      state.settings.reminderMinutes = options[(idx + 1) % options.length];
      const span = timeRow.querySelector('span.ev-micro');
      if (span) span.textContent = `${state.settings.reminderMinutes} 分钟`;
    });
  }

  const syncRow = $('#row-sync');
  if (syncRow && !syncRow.__bound) {
    syncRow.__bound = true;
    syncRow.addEventListener('click', () => {
      const icon = $('#sync-icon');
      if (icon) {
        icon.style.transition = 'transform 0.6s ease-in-out';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          icon.style.transition = 'none';
          icon.style.transform = '';
        }, 650);
      }
      state.settings.lastSync = new Date().toISOString().slice(0, 16).replace('T', ' ');
    });
  }
}

/* ---------- Navigation ---------- */
function navigate(viewName, courseId = null) {
  state.previousView = state.currentView;
  state.currentView = viewName;

  // Update bottom nav active state
  const navMap = { today: 'nav-today', week: 'nav-week', settings: 'nav-settings', detail: null };
  const activeNav = navMap[viewName];
  $$('.bottom-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.domId === activeNav);
  });

  // Show/hide views
  const viewElMap = {
    today: '#view-today',
    week: '#view-week',
    detail: '#view-detail',
    settings: '#view-settings'
  };

  // Determine transition direction
  const isBack = (viewName === 'today' && state.previousView === 'detail') ||
                 (viewName === 'week' && state.previousView === 'detail') ||
                 (viewName === 'settings' && state.previousView === 'detail');

  Object.entries(viewElMap).forEach(([name, sel]) => {
    const el = $(sel);
    if (name === viewName) {
      el.classList.remove('hidden');
      el.classList.toggle('back-transition', isBack);
      // Restart animation
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    } else {
      el.classList.add('hidden');
    }
  });

  // Render view content
  if (viewName === 'today') renderToday();
  else if (viewName === 'week') renderWeek();
  else if (viewName === 'detail') renderDetail(courseId);
  else if (viewName === 'settings') renderSettings();

  // Scroll content to top
  const activeView = $(viewElMap[viewName]);
  const content = activeView?.querySelector('.screen-content');
  if (content) content.scrollTop = 0;
}

/* ---------- Bottom Nav Bindings ---------- */
function bindBottomNav() {
  $$('.bottom-nav .nav-item').forEach(btn => {
    if (btn.__navBound) return;
    btn.__navBound = true;
    btn.addEventListener('click', (e) => {
      addRipple(btn, e);
      const id = btn.dataset.domId;
      if (id === 'nav-today') navigate('today');
      else if (id === 'nav-week') navigate('week');
      else if (id === 'nav-settings') navigate('settings');
    });
  });
}

/* ---------- Back Button ---------- */
function bindBackButton() {
  const backBtn = $('#back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Return to previous main view
      const prev = state.previousView && state.previousView !== 'detail'
        ? state.previousView : 'today';
      navigate(prev);
    });
  }
}

/* ---------- Theme Toggle ---------- */
function applyTheme(theme) {
  state.theme = theme;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
    html.setAttribute('data-theme', 'dark');
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    html.setAttribute('data-theme', 'light');
  }
  // Update theme button icon
  const icon = $('#theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    lucide.createIcons();
  }
  localStorage.setItem('ev-theme', theme);
}

function bindThemeToggle() {
  const btn = $('#theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
  }
}

/* ---------- Device Mode Toggle ---------- */
function applyDeviceMode(mode) {
  state.deviceMode = mode;
  const shell = $('#app-shell');
  shell.classList.remove('watch-mode', 'mobile-mode', 'full-mode');
  shell.classList.add(`${mode}-mode`);

  $$('.device-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.device === mode);
  });

  localStorage.setItem('ev-device-mode', mode);
}

function bindDeviceButtons() {
  $$('.device-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      addRipple(btn, e);
      const mode = btn.dataset.device;
      applyDeviceMode(mode);
    });
  });
}

/* ---------- Auto Responsive (small screen auto switch) ---------- */
function setupAutoResponsive() {
  const shell = $('#app-shell');
  const mq = window.matchMedia('(max-width: 480px)');
  const handle = () => {
    if (mq.matches) {
      shell.classList.add('auto-responsive');
    } else {
      shell.classList.remove('auto-responsive');
    }
  };
  handle();
  mq.addEventListener('change', handle);
}

/* ---------- Init ---------- */
function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('ev-theme');
  if (savedTheme) applyTheme(savedTheme);
  else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  // Restore device mode
  const savedDevice = localStorage.getItem('ev-device-mode');
  if (savedDevice) applyDeviceMode(savedDevice);

  // Bind navigation
  bindBottomNav();
  bindBackButton();
  bindThemeToggle();
  bindDeviceButtons();

  // Start clock
  updateClock();
  setInterval(updateClock, 30000); // every 30s

  // Render initial view
  navigate('today');

  // Auto responsive for small screens
  setupAutoResponsive();

  // Support hash routing
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (['today', 'week', 'settings', 'detail'].includes(hash)) {
      navigate(hash);
    }
  });
}

// Boot
document.addEventListener('DOMContentLoaded', init);
