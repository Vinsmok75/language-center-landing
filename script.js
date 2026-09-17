/**
 * Najah Media - CRO B2B Landing Page Logic
 * Features:
 * 1. Strict 48h Calendar Availability (اليوم & غداً).
 * 2. Sunday Morning Lockout (10:00, 11:00, 12:00 locked with opacity-40 & "غير متاح" tag).
 * 3. Dynamic Conflict Detection (Google Sheets doGet sync, disabled state with "محجوز / ممتلئ" tag).
 * 4. Resilient Form Submission & Concurrency Protection.
 */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymyQ9KXOA9tTmUfqqpAi2KjZVbUj-ruIsFQtFDWuPXFugJzhY9lyGQ8NUDiNlb_vus/exec";

// Global cache for taken slots fetched from Google Sheets
let bookedSlotsCache = [];
let isFetchingSlots = false;

document.addEventListener('DOMContentLoaded', () => {
  initInteractiveScheduler();
  initFormHandler();
  initFastJumpCta();
});

function initFastJumpCta() {
  const jumpBtn = document.querySelector('.fast-jump-cta-btn');
  if (!jumpBtn) return;

  jumpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('bookingSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const nameInput = document.getElementById('fullName');
        if (nameInput) nameInput.focus();
      }, 600);
    }
  });
}

function initInteractiveScheduler() {
  const daysCardsGrid = document.getElementById('daysCardsGrid');
  const timeChipsGrid = document.getElementById('timeChipsGrid');
  const selectedDateInput = document.getElementById('selectedDateInput');
  const selectedTimeInput = document.getElementById('selectedTimeInput');
  const selectedSlotPreview = document.getElementById('selectedSlotPreview');
  const slotSyncStatus = document.getElementById('slotSyncStatus');

  if (!daysCardsGrid || !timeChipsGrid) return;

  const daysMap = [
    { fr: 'DIM', ar: 'الأحد' },
    { fr: 'LUN', ar: 'الإثنين' },
    { fr: 'MAR', ar: 'الثلاثاء' },
    { fr: 'MER', ar: 'الأربعاء' },
    { fr: 'JEU', ar: 'الخميس' },
    { fr: 'VEN', ar: 'الجمعة' },
    { fr: 'SAM', ar: 'السبت' }
  ];

  const monthsMap = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
    'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'
  ];

  // 1. STRICT DATE AVAILABILITY LOGIC:
  // Only 2 days are selectable: Day 0 (اليوم) and Day 1 (غداً)
  // Subsequent days (Day 2 onwards) are locked/disabled
  const baseDate = new Date();
  const scheduleDays = [];

  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(baseDate.getDate() + i);

    const dayIndex = d.getDay(); // 0 is Sunday (DIM / الأحد)
    const dayInfo = daysMap[dayIndex];
    const dateNum = d.getDate();
    const monthName = monthsMap[d.getMonth()];
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;

    let badgeText = '';
    let isAvailable = false;

    if (i === 0) {
      badgeText = 'اليوم';
      isAvailable = true;
    } else if (i === 1) {
      badgeText = 'غداً';
      isAvailable = true;
    } else {
      badgeText = 'ممتلئ 🔒';
      isAvailable = false;
    }

    scheduleDays.push({
      index: i,
      dayIndex: dayIndex,
      isSunday: dayIndex === 0,
      frDay: dayInfo.fr,
      arDay: dayInfo.ar,
      dateNum: dateNum,
      monthName: monthName,
      badgeText: badgeText,
      isAvailable: isAvailable,
      isoDate: isoDate,
      fullLabel: `${badgeText} (${dayInfo.ar} ${dateNum} ${monthName})`
    });
  }

  // Active Selected Day (Defaults to Day 0: اليوم)
  let currentSelectedDay = scheduleDays[0];
  selectedDateInput.value = currentSelectedDay.fullLabel;

  // Render Day Cards
  daysCardsGrid.innerHTML = '';
  scheduleDays.forEach((dayItem, idx) => {
    const card = document.createElement('div');
    card.className = `day-card ${idx === 0 ? 'active' : ''} ${!dayItem.isAvailable ? 'disabled' : ''}`;
    card.setAttribute('data-full-date', dayItem.fullLabel);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', dayItem.isAvailable ? '0' : '-1');

    card.innerHTML = `
      <span class="day-pill-status">${dayItem.badgeText}</span>
      <span class="day-name-top" style="margin-top: 4px;">${dayItem.frDay}</span>
      <span class="day-num-big">${dayItem.dateNum}</span>
      <span class="day-month-bottom">${dayItem.monthName}</span>
    `;

    if (dayItem.isAvailable) {
      card.addEventListener('click', () => {
        document.querySelectorAll('.day-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        currentSelectedDay = dayItem;
        selectedDateInput.value = dayItem.fullLabel;

        // Re-render time slots reflecting Sunday lockout and booked slots for this day
        renderTimeSlots();

        // Refresh bookings from Google Sheet asynchronously
        fetchBookedSlots();
      });
    }

    daysCardsGrid.appendChild(card);
  });

  // 2. TIME SLOTS DEFINITION
  // Morning slots: 10:00, 11:00, 12:00 (locked on Sunday)
  // Afternoon/Evening slots: 15:00, 15:50, 17:20, 18:10
  const timeSlots = [
    '10:00',
    '11:00',
    '12:00',
    '15:00',
    '15:50',
    '17:20',
    '18:10'
  ];

  const sundayMorningSlots = ['10:00', '11:00', '12:00'];

  // Helper: Conflict matching against Google Sheet booked slots
  function isSlotBooked(dayItem, timeStr, bookedSlots) {
    if (!Array.isArray(bookedSlots) || bookedSlots.length === 0) return false;

    const cleanTime = timeStr.trim();

    return bookedSlots.some((raw) => {
      if (!raw) return false;
      const item = String(raw).trim();
      if (!item) return false;

      // Must contain this specific time
      if (!item.includes(cleanTime)) return false;

      // Check match with full label: e.g. "اليوم (الخميس 17 شتنبر) (10:00)"
      if (item.includes(dayItem.fullLabel)) {
        return true;
      }

      // Check shorthand prompt formats: e.g. "اليوم (10:00)" vs "غداً (15:00)"
      if (dayItem.badgeText === 'اليوم') {
        if (item.includes('اليوم') && !item.includes('غداً')) {
          return true;
        }
      } else if (dayItem.badgeText === 'غداً') {
        if (item.includes('غداً')) {
          return true;
        }
      }

      // Check ISO format: e.g. "2026-09-17 (11:00)"
      if (dayItem.isoDate && item.includes(dayItem.isoDate)) {
        return true;
      }

      // Check day number & month name match: e.g. "17 شتنبر"
      if (item.includes(`${dayItem.dateNum} ${dayItem.monthName}`)) {
        return true;
      }

      return false;
    });
  }

  // 3. RENDER TIME CHIPS WITH SUNDAY LOCKOUT & CONFLICT DETECTION
  function renderTimeSlots() {
    timeChipsGrid.innerHTML = '';
    const isSunday = currentSelectedDay.isSunday;

    timeSlots.forEach((timeStr) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.setAttribute('data-time', timeStr);

      const isSundayMorningLocked = isSunday && sundayMorningSlots.includes(timeStr);
      const isBooked = isSlotBooked(currentSelectedDay, timeStr, bookedSlotsCache);

      if (isSundayMorningLocked) {
        // Business Rule 1: Sunday Morning Lockout
        chip.className = 'time-chip-btn disabled-sunday';
        chip.disabled = true;
        chip.setAttribute('aria-disabled', 'true');
        chip.setAttribute('title', 'غير متاح صبيحة يوم الأحد');
        chip.innerHTML = `
          <span class="time-main-text">${timeStr}</span>
          <span class="time-tag-badge badge-unavailable">غير متاح</span>
        `;
      } else if (isBooked) {
        // Business Rule 2: Dynamic Conflict Detection (Already Booked)
        chip.className = 'time-chip-btn is-booked';
        chip.disabled = true;
        chip.setAttribute('aria-disabled', 'true');
        chip.setAttribute('title', 'هذا التوقيت محجوز مسبقاً');
        chip.innerHTML = `
          <span class="time-main-text">${timeStr}</span>
          <span class="time-tag-badge badge-booked">محجوز / ممتلئ</span>
        `;
      } else {
        // Available slot
        chip.className = 'time-chip-btn';
        chip.disabled = false;
        chip.innerHTML = `<span class="time-main-text">${timeStr}</span>`;

        chip.addEventListener('click', () => {
          document.querySelectorAll('.time-chip-btn').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedTimeInput.value = timeStr;
          updatePreview();
        });
      }

      timeChipsGrid.appendChild(chip);
    });

    // Auto-Selection Logic:
    // If the current selected time is either locked (Sunday morning) or already booked,
    // automatically fallback to the first available slot for this day.
    const currentVal = selectedTimeInput.value;
    const isCurrentValSundayLocked = isSunday && sundayMorningSlots.includes(currentVal);
    const isCurrentValBooked = isSlotBooked(currentSelectedDay, currentVal, bookedSlotsCache);

    let finalSelectedTime = currentVal;

    if (!finalSelectedTime || isCurrentValSundayLocked || isCurrentValBooked) {
      const firstAvailable = timeSlots.find(t => {
        const locked = isSunday && sundayMorningSlots.includes(t);
        const booked = isSlotBooked(currentSelectedDay, t, bookedSlotsCache);
        return !locked && !booked;
      });

      finalSelectedTime = firstAvailable || '';
    }

    selectedTimeInput.value = finalSelectedTime;

    // Apply active class to the selected chip
    if (finalSelectedTime) {
      const activeBtn = timeChipsGrid.querySelector(`button[data-time="${finalSelectedTime}"]`);
      if (activeBtn && !activeBtn.disabled) {
        activeBtn.classList.add('active');
      }
    }

    updatePreview();
  }

  function updatePreview() {
    if (!selectedSlotPreview) return;

    if (selectedTimeInput.value) {
      selectedSlotPreview.textContent = `${selectedDateInput.value} • على الساعة ${selectedTimeInput.value}`;
    } else {
      selectedSlotPreview.textContent = `${selectedDateInput.value} • (يرجى اختيار توقيت متاح)`;
    }
  }

  // 4. DYNAMIC CONFLICT SYNC (GET REQUEST TO GOOGLE APPS SCRIPT)
  async function fetchBookedSlots() {
    if (isFetchingSlots) return;
    isFetchingSlots = true;

    if (slotSyncStatus) {
      slotSyncStatus.innerHTML = `
        <span class="sync-live-status syncing">
          <span class="sync-dot"></span>
          <span>جاري التحقق من التوفر...</span>
        </span>
      `;
    }

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        const rawSlots = Array.isArray(data)
          ? data
          : (data.bookedSlots || data.slots || []);

        bookedSlotsCache = rawSlots.map(s => String(s).trim());

        if (slotSyncStatus) {
          slotSyncStatus.innerHTML = `
            <span class="sync-live-status">
              <span class="sync-dot"></span>
              <span>CRÉNEAUX DISPONIBLES</span>
            </span>
          `;
        }
      }
    } catch (err) {
      // Graceful fallback if offline or during initial setup
      console.warn('[Sync] Could not fetch Google Sheet slots:', err);
      if (slotSyncStatus) {
        slotSyncStatus.textContent = 'CRÉNEAUX DISPONIBLES';
      }
    } finally {
      isFetchingSlots = false;
      renderTimeSlots();
    }
  }

  // Initial render with default slot (e.g. 15:00)
  selectedTimeInput.value = currentSelectedDay.isSunday ? '15:00' : '15:00';
  renderTimeSlots();

  // Trigger real-time sync on load
  fetchBookedSlots();
}

function initFormHandler() {
  const form = document.getElementById('consultationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    // Prevent default form submission
    e.preventDefault();

    // Collect inputs
    const fullName = document.getElementById('fullName').value.trim();
    const city = document.getElementById('citySelect').value.trim();
    const centerName = document.getElementById('centerName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const selectedDate = document.getElementById('selectedDateInput').value;
    const selectedTime = document.getElementById('selectedTimeInput').value;

    if (!fullName || !city || !centerName || !phone) {
      alert('المرجو ملء جميع الخانات المطلوبة بما فيها المدينة واسم المركز.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 9) {
      alert('المرجو إدخال رقم واتساب مغربي صحيح (مثال: 0612345678).');
      return;
    }

    if (!selectedTime) {
      alert('المرجو اختيار توقيت متاح للاستشارة.');
      return;
    }

    // Client-side Business Rule Validation
    const isSundaySelected = selectedDate.includes('الأحد');
    const sundayMorningSlots = ['10:00', '11:00', '12:00'];
    if (isSundaySelected && sundayMorningSlots.includes(selectedTime)) {
      alert('فترة الصباح ليوم الأحد غير متاحة. المرجو اختيار توقيت بعد الزوال (ابتداءً من 15:00).');
      return;
    }

    // Disable submit button and update status text
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.75';
      submitBtn.innerHTML = '<span>جاري تأكيد الموعد... ⏳</span>';
    }

    // Package payload matching commercial tracking sheet schema
    const combinedDateTime = `${selectedDate} (${selectedTime})`;
    const payload = {
      fullName,
      centerName,
      phone: cleanPhone,
      city,
      selectedDate,
      selectedTime,
      // Mapped sheet columns:
      // A: Name of the prospect, B: Business name, C: Numéro de téléphone, D: City,
      // E: Étape, F: Date/Time, G: Probabilité, H: Meet Link, I: Notes
      dateTime: combinedDateTime,
      etape: "Nouveau Lead",
      probabilite: "20%",
      meetLink: "",
      notes: new Date().toISOString()
    };

    // Save payload to local and session storage
    localStorage.setItem('prospectBooking', JSON.stringify(payload));
    localStorage.setItem('najah_last_booking', JSON.stringify(payload));
    sessionStorage.setItem('najah_current_lead', JSON.stringify(payload));


    // Send data using text/plain to prevent CORS preflight block, with 800ms safety timeout fallback
    const fetchPromise = fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 800));

    try {
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Google Script fetch warning:', err);
    }

    // Redirect cleanly without .html extension (preserves file:// compatibility for local testing)
    const targetUrl = window.location.protocol === 'file:' ? 'thank-you.html' : 'thank-you';
    window.location.href = targetUrl;
  });
}
