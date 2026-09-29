/**
 * B2B CCTV SECURITY INSTALLER FUNNEL
 * Script: assets/js/security-b2b.js
 * Multi-Step Qualification Wizard (6 Steps) + FAQ Accordion
 */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-fb-pWi5QWenrnpIqwTQ1_uKFoXZfOGsGB8GId1ATpmdNiZb2n_3ZJCVOMykScSCU/exec";

document.addEventListener('DOMContentLoaded', () => {
  initMultiStepSecurityForm();
  initFaqAccordion();
});

/**
 * 1. Multi-Step Form Logic (4 Steps)
 */
function initMultiStepSecurityForm() {
  const form = document.getElementById('securityAppForm');
  if (!form) return;

  const steps = Array.from(document.querySelectorAll('.form-step'));
  const totalSteps = steps.length;
  let currentStep = 1;

  const stepIndicatorText = document.getElementById('stepIndicatorText');
  const stepPercentageText = document.getElementById('stepPercentageText');
  const progressBarFill = document.getElementById('progressBarFill');
  const submitBtn = document.getElementById('btnSubmitForm');
  const alertBox = document.getElementById('formAlertBox');

  // Conditional Autre Elements
  const autreCheckbox = document.getElementById('projectAutreCheckbox');
  const autreProjectWrap = document.getElementById('autreProjectWrap');
  const autreProjectInput = document.getElementById('autreProjectInput');

  const cityCoverageAutreCheckbox = document.getElementById('cityCoverageAutreCheckbox');
  const cityCoverageAutreWrap = document.getElementById('cityCoverageAutreWrap');
  const cityCoverageAutreInput = document.getElementById('cityCoverageAutreInput');

  const installerCity = document.getElementById('installerCity');
  const cityAutreWrap = document.getElementById('cityAutreWrap');
  const cityAutreInput = document.getElementById('cityAutreInput');

  // Step 1: Autre Project Checkbox Toggle
  if (autreCheckbox && autreProjectWrap) {
    autreCheckbox.addEventListener('change', () => {
      autreProjectWrap.style.display = autreCheckbox.checked ? 'block' : 'none';
      if (autreCheckbox.checked && autreProjectInput) autreProjectInput.focus();
    });
  }

  // Step 3: Autre Coverage City Checkbox Toggle
  if (cityCoverageAutreCheckbox && cityCoverageAutreWrap) {
    cityCoverageAutreCheckbox.addEventListener('change', () => {
      cityCoverageAutreWrap.style.display = cityCoverageAutreCheckbox.checked ? 'block' : 'none';
      if (cityCoverageAutreCheckbox.checked && cityCoverageAutreInput) cityCoverageAutreInput.focus();
    });
  }

  // Step 6: City Dropdown Autre Toggle
  if (installerCity && cityAutreWrap) {
    installerCity.addEventListener('change', () => {
      cityAutreWrap.style.display = installerCity.value === 'مدينة أخرى' ? 'block' : 'none';
      if (installerCity.value === 'مدينة أخرى' && cityAutreInput) cityAutreInput.focus();
    });
  }

  // Handle Radio and Checkbox selection reliably via native <label> interaction
  const allOptionInputs = form.querySelectorAll('.option-card input');

  function updateAllOptionVisuals() {
    allOptionInputs.forEach((input) => {
      const card = input.closest('.option-card');
      if (card) {
        if (input.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });
  }

  allOptionInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateAllOptionVisuals();
    });
  });

  // Initial check on load
  updateAllOptionVisuals();

  /**
   * Navigate to Specific Step
   */
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;
    currentStep = stepNumber;

    steps.forEach((stepElem) => {
      const stepIdx = parseInt(stepElem.getAttribute('data-step'), 10);
      if (stepIdx === currentStep) {
        stepElem.classList.add('active');
      } else {
        stepElem.classList.remove('active');
      }
    });

    // Update Progress Indicator
    const progressPercent = Math.round((currentStep / totalSteps) * 100);
    if (stepIndicatorText) {
      stepIndicatorText.textContent = `المرحلة ${currentStep} من ${totalSteps}`;
    }
    if (stepPercentageText) {
      stepPercentageText.textContent = `${progressPercent}%`;
    }
    if (progressBarFill) {
      progressBarFill.style.width = `${progressPercent}%`;
    }

    // Smooth scroll into form
    const formRect = form.getBoundingClientRect();
    if (formRect.top < 40 || formRect.bottom > window.innerHeight) {
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Shake Animation on Validation Error
   */
  function triggerStepError(stepElem, message) {
    stepElem.classList.remove('step-error-shake');
    void stepElem.offsetWidth; // Force reflow
    stepElem.classList.add('step-error-shake');

    if (alertBox && message) {
      alertBox.textContent = message;
      alertBox.className = 'form-status-alert error';
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setTimeout(() => {
      stepElem.classList.remove('step-error-shake');
    }, 450);
  }

  function clearAlert() {
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.className = 'form-status-alert';
    }
  }

  /**
   * Validate Each Step
   */
  function validateStep(stepNumber) {
    clearAlert();
    const stepElem = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (!stepElem) return true;

    // Step 1: Project Selection
    if (stepNumber === 1) {
      const checkedProjects = stepElem.querySelectorAll('input[name="project_focus"]:checked');
      if (checkedProjects.length === 0) {
        triggerStepError(stepElem, 'يرجى تحديد تخصص واحد على الأقل من نوعية المشاريع التي تركز عليها شركتكم.');
        return false;
      }
      if (autreCheckbox && autreCheckbox.checked) {
        const customVal = autreProjectInput ? autreProjectInput.value.trim() : '';
        if (!customVal) {
          triggerStepError(stepElem, 'يرجى كتابة نوع المشروع الآخر في الحقل المخصص.');
          if (autreProjectInput) autreProjectInput.focus();
          return false;
        }
      }
      return true;
    }

    // Step 2: Operational Capacity
    if (stepNumber === 2) {
      const checkedCapacity = stepElem.querySelector('input[name="team_capacity"]:checked');
      if (!checkedCapacity) {
        triggerStepError(stepElem, 'يرجى تحديد عدد فرق التركيب والتقنيين المتوفرة لديكم.');
        return false;
      }
      return true;
    }

    // Step 3: Geographic Coverage (Multi-Select Cities)
    if (stepNumber === 3) {
      const checkedCities = stepElem.querySelectorAll('input[name="coverage_cities"]:checked');
      if (checkedCities.length === 0) {
        triggerStepError(stepElem, 'يرجى اختيار مدينة واحدة على الأقل من مناطق التغطية والمعاينة الميدانية.');
        return false;
      }
      if (cityCoverageAutreCheckbox && cityCoverageAutreCheckbox.checked) {
        const customCities = cityCoverageAutreInput ? cityCoverageAutreInput.value.trim() : '';
        if (!customCities) {
          triggerStepError(stepElem, 'يرجى كتابة أسماء المدن الأخرى في الحقل المخصص.');
          if (cityCoverageAutreInput) cityCoverageAutreInput.focus();
          return false;
        }
      }
      return true;
    }

    // Step 4: Social Media Ads Experience
    if (stepNumber === 4) {
      const checkedAds = stepElem.querySelector('input[name="social_ads"]:checked');
      if (!checkedAds) {
        triggerStepError(stepElem, 'يرجى تحديد ما إذا كنتم قد استخدمتم الإعلانات الممولة على مواقع التواصل الاجتماعي من قبل.');
        return false;
      }
      return true;
    }

    // Step 5: Ad Budget
    if (stepNumber === 5) {
      const checkedBudget = stepElem.querySelector('input[name="ad_budget"]:checked');
      if (!checkedBudget) {
        triggerStepError(stepElem, 'يرجى تحديد الميزانية الإعلانية الشهرية المقترحة لمشروعكم.');
        return false;
      }
      return true;
    }

    // Step 6: Sales Process Alignment
    if (stepNumber === 6) {
      const checkedSales = stepElem.querySelector('input[name="sales_process"]:checked');
      if (!checkedSales) {
        triggerStepError(stepElem, 'يرجى تحديد مدى جاهزية فريقكم للتواصل وإجراء المعاينة فـ أقل من ساعتين.');
        return false;
      }
      return true;
    }

    return true;
  }

  // Next Buttons Event Listeners
  document.querySelectorAll('.step-btn.next-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.getAttribute('data-next'), 10);
      if (validateStep(currentStep)) {
        goToStep(targetStep);
      }
    });
  });

  // Previous Buttons Event Listeners
  document.querySelectorAll('.step-btn.prev-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.getAttribute('data-prev'), 10);
      clearAlert();
      goToStep(targetStep);
    });
  });

  /**
   * Final Form Submission (Step 7)
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const step7Elem = document.querySelector('.form-step[data-step="7"]') || document.querySelector('.form-step[data-step="6"]');
    const fullName = document.getElementById('installerName')?.value.trim() || '';
    const businessName = document.getElementById('installerCompany')?.value.trim() || '';
    const phone = document.getElementById('installerPhone')?.value.trim() || '';
    const email = document.getElementById('installerEmail')?.value.trim() || '';
    let primaryCity = installerCity ? installerCity.value : '';

    if (primaryCity === 'مدينة أخرى' && cityAutreInput && cityAutreInput.value.trim()) {
      primaryCity = cityAutreInput.value.trim();
    }

    // Validate Required Fields in Step 7
    if (!fullName || !businessName || !phone || !primaryCity) {
      triggerStepError(step7Elem, 'يرجى ملء جميع معلومات المسؤول والشركة لاكتمال الطلب.');
      return;
    }

    // Optional Email Validation (validates format only if user typed an email)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      triggerStepError(step7Elem, 'يرجى إدخال بريد إلكتروني صحيح (مثال: exemple@gmail.com) أو تركه فارغاً.');
      const emailInput = document.getElementById('installerEmail');
      if (emailInput) emailInput.focus();
      return;
    }

    // Validate Moroccan Phone Number (^(?:0|\+212)[5-7]\d{8}$)
    const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    let normalizedPhone = cleanPhone;
    if (/^[5-7]\d{8}$/.test(cleanPhone)) {
      normalizedPhone = '0' + cleanPhone;
    }
    const moroccanPhoneRegex = /^(?:0|\+212)[5-7]\d{8}$/;

    if (!moroccanPhoneRegex.test(normalizedPhone)) {
      triggerStepError(step7Elem, 'يرجى إدخال رقم واتساب مغربي مهني صحيح (مثال: 0661000000 أو 0700000000).');
      const phoneInput = document.getElementById('installerPhone');
      if (phoneInput) phoneInput.focus();
      return;
    }

    // Step 1: projectTypes (Array of checked values) and projectTypesOther
    const projectTypes = [];
    document.querySelectorAll('input[name="project_focus"]:checked').forEach((cb) => {
      projectTypes.push(cb.value);
    });
    const projectTypesOther = (autreCheckbox && autreCheckbox.checked && autreProjectInput) ? autreProjectInput.value.trim() : '';

    // Step 2: teamCapacity (Selected radio value)
    const teamCapacity = document.querySelector('input[name="team_capacity"]:checked')?.value || 'غير محدد';

    // Step 3: coverageCities (Array of checked city checkboxes) and citiesOther
    const coverageCities = [];
    document.querySelectorAll('input[name="coverage_cities"]:checked').forEach((cb) => {
      coverageCities.push(cb.value);
    });
    const citiesOther = (cityCoverageAutreCheckbox && cityCoverageAutreCheckbox.checked && cityCoverageAutreInput) ? cityCoverageAutreInput.value.trim() : '';

    // Step 4: socialAds (Selected radio value)
    const socialAds = document.querySelector('input[name="social_ads"]:checked')?.value || 'غير محدد';

    // Step 5: adBudget (Selected radio value)
    const adBudget = document.querySelector('input[name="ad_budget"]:checked')?.value || 'غير محدد';

    // Step 6: responseTime (Selected radio value)
    const responseTime = document.querySelector('input[name="sales_process"]:checked')?.value || 'غير محدد';

    // Exact Payload Structure according to Data Extraction Contract
    const payload = {
      projectTypes,
      projectTypesOther,
      teamCapacity,
      coverageCities,
      citiesOther,
      socialAds,
      adExperience: socialAds,
      adBudget,
      responseTime,
      fullName,
      businessName,
      companyName: businessName,
      phone: normalizedPhone,
      email: email,
      primaryCity,
      city: primaryCity,
      projectFocus: projectTypes,
      projectFocusText: projectTypes.join('، ') + (projectTypesOther ? ` (${projectTypesOther})` : ''),
      coverageCitiesText: coverageCities.join('، ') + (citiesOther ? ` (${citiesOther})` : ''),
      salesAlignment: responseTime,
      source: 'camera',
      sourceLabel: 'أنظمة كاميرات المراقبة B2B',
      notes: `[كاميرات B2B] [البريد: ${email || 'غير محدد'}] [إعلانات سابقة: ${socialAds}] [الميزانية: ${adBudget}] [الفرق: ${teamCapacity}] [التغطية: ${coverageCities.join(', ')}] [المتابعة: ${responseTime}]`,
      submittedAt: new Date().toISOString()
    };

    // Save complete submission object into localStorage
    try {
      localStorage.setItem('cctvLeadData', JSON.stringify(payload));
      localStorage.setItem('securityLeadData', JSON.stringify(payload));
      localStorage.setItem('lastLeadSource', 'camera');
      localStorage.setItem('leadFormReturnPage', 'camera-securite.html');
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    // Update submit button to loading state: "جاري تأكيد وتسجيل الطلب..."
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>جاري تأكيد وتسجيل الطلب...</span>';
    }

    if (alertBox) {
      alertBox.textContent = 'تم تسجيل طلبك وتأهيله بنجاح! جاري توجيهك إلى صفحة التأكيد...';
      alertBox.className = 'form-status-alert success';
    }

    // Send payload via fetch to Google Apps Script endpoint
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

    // Redirect cleanly to thank-you.html?source=camera
    window.location.href = 'thank-you.html?source=camera';
  });
}

/**
 * 2. FAQ Accordion Handler
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item-card');
  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-question-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close other items
      faqItems.forEach((other) => {
        if (other !== item) other.classList.remove('open');
      });
      // Toggle current item
      if (isOpen) {
        item.classList.remove('open');
      } else {
        item.classList.add('open');
      }
    });
  });
}
