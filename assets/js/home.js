/**
 * REDA HMOUD - DIGITAL MARKETING CONSULTING (UMBRELLA PLATFORM)
 * Main Logic: assets/js/home.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileNav();
  initContactForm();
});

/**
 * 1. Navbar Glassmorphism Scroll Effect
 */
function initNavbarScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * 2. Mobile Nav Toggle
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileNavDrawer');

  const hamburgerSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const closeSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>';

  toggleBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = hamburgerSvg;
    } else {
      drawer.classList.add('open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.innerHTML = closeSvg;
    }
  });

  // Close mobile drawer when clicking a link
  drawer.querySelectorAll('.nav-link, .nav-cta-btn').forEach((link) => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = hamburgerSvg;
    });
  });
}

/**
 * 3. Consulting Lead Form Handler
 */
function initContactForm() {
  const form = document.getElementById('consultingForm');
  const alertBox = document.getElementById('formAlert');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullName = document.getElementById('clientName')?.value.trim() || '';
    const businessName = document.getElementById('businessName')?.value.trim() || '';
    const sector = document.getElementById('businessSector')?.value.trim() || '';
    const phone = document.getElementById('clientPhone')?.value.trim() || '';
    const details = document.getElementById('clientNotes')?.value.trim() || '';

    // Validation
    if (!fullName || !businessName || !sector || !phone) {
      showAlert('يرجى ملء جميع الحقول الإلزامية المطلوبة للطلب.', 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      showAlert('يرجى إدخال رقم هاتف واتساب مغربي صحيح (مثال: 0612345678).', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'جاري المعالجة...';
    }

    // Save lead inquiry locally
    try {
      const inquiryData = {
        fullName,
        businessName,
        sector,
        phone: cleanPhone,
        details,
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem('hmoud_consulting_inquiry', JSON.stringify(inquiryData));
    } catch (err) {
      console.warn('Storage warning:', err);
    }

    // Construct WhatsApp direct message
    const waNumber = '212600000000'; // Default Moroccan contact line
    const textMsg = encodeURIComponent(
      `سلام أستاذ رضا حمود،\n` +
      `أنا مهتم باستشارة تسويقية للمقاولة ديالي:\n` +
      `الاسم: ${fullName}\n` +
      `المقاولة / الشركة: ${businessName}\n` +
      `القطاع: ${sector}\n` +
      `الهاتف: ${phone}\n` +
      (details ? `التفاصيل: ${details}\n` : '') +
      `بغيت نعرف كفاش نقدرو نخدمو معاً لتطوير واكتساب الزبناء.`
    );

    const waUrl = `https://wa.me/${waNumber}?text=${textMsg}`;

    showAlert('تم تسجيل طلبك بنجاح! سنقوم بفتح محادثة الواتساب الآن...', 'success');

    setTimeout(() => {
      window.open(waUrl, '_blank');
      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'إرسال طلب الاستشارة المجانية';
      }
    }, 1200);
  });

  function showAlert(msg, type) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `form-alert-message ${type}`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
