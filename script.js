/**
 * Najah Media - CRO B2B Multi-Step Qualification Form Logic
 * Features:
 * 1. 5-Step Intuitive Interactive Funnel with Progress Bar & Percentage.
 * 2. Instant auto-advance on selection for single-choice questions with smooth micro-transition.
 * 3. Conditional reveal for "Autre" fields (Center Type & City).
 * 4. Robust Moroccan phone (+212) & email validation.
 * 5. Resilient Google Apps Script submission & LocalStorage persistence.
 */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymyQ9KXOA9tTmUfqqpAi2KjZVbUj-ruIsFQtFDWuPXFugJzhY9lyGQ8NUDiNlb_vus/exec";

document.addEventListener('DOMContentLoaded', () => {
  initFastJumpCta();
  initMultiStepForm();
});

/**
 * Fast Jump CTA Smooth Scroll
 */
function initFastJumpCta() {
  const jumpBtn = document.querySelector('.fast-jump-cta-btn');
  if (!jumpBtn) return;

  jumpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('bookingSection');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      // Focus on active step
      setTimeout(() => {
        const activeStep = document.querySelector('.form-step.active');
        if (activeStep) {
          const firstInteractive = activeStep.querySelector('input, button, select');
          if (firstInteractive) firstInteractive.focus();
        }
      }, 500);
    }
  });
}

/**
 * Multi-Step Form Logic
 */
function initMultiStepForm() {
  const form = document.getElementById('consultationForm');
  if (!form) return;

  const steps = Array.from(document.querySelectorAll('.form-step'));
  const totalSteps = steps.length;
  let currentStep = 1;

  const stepIndicatorText = document.getElementById('stepIndicatorText');
  const stepPercentageText = document.getElementById('stepPercentageText');
  const progressBarFill = document.getElementById('progressBarFill');

  // Conditional "Autre" Elements
  const centerTypeRadios = document.querySelectorAll('input[name="center_type"]');
  const centerTypeAutreWrap = document.getElementById('centerTypeAutreWrap');
  const centerTypeAutreInput = document.getElementById('centerTypeAutreInput');

  const citySelect = document.getElementById('citySelect');
  const cityAutreWrap = document.getElementById('cityAutreWrap');
  const cityAutreInput = document.getElementById('cityAutreInput');

  /**
   * Update Progress Bar & Step Visibility
   */
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;

    currentStep = stepNumber;

    // Update active step DOM classes
    steps.forEach((stepElem) => {
      const stepIdx = parseInt(stepElem.getAttribute('data-step'), 10);
      if (stepIdx === currentStep) {
        stepElem.classList.add('active');
      } else {
        stepElem.classList.remove('active');
      }
    });

    // Update progress numbers and bar
    const progressPercent = Math.round((currentStep / totalSteps) * 100);
    if (stepIndicatorText) {
      stepIndicatorText.textContent = `Étape ${currentStep} sur ${totalSteps}`;
    }
    if (stepPercentageText) {
      stepPercentageText.textContent = `${progressPercent}%`;
    }
    if (progressBarFill) {
      progressBarFill.style.width = `${progressPercent}%`;
    }

    // Scroll slightly if form is out of view
    const formRect = form.getBoundingClientRect();
    if (formRect.top < 20 || formRect.bottom > window.innerHeight) {
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Trigger Shake animation on invalid step attempt
   */
  function triggerStepError(stepElem) {
    stepElem.classList.remove('step-error-shake');
    // Force reflow
    void stepElem.offsetWidth;
    stepElem.classList.add('step-error-shake');
    setTimeout(() => {
      stepElem.classList.remove('step-error-shake');
    }, 450);
  }

  /**
   * Validate a specific step before proceeding
   */
  function validateStep(stepNumber) {
    const stepElem = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (!stepElem) return true;

    if (stepNumber === 1) {
      const checkedRadio = stepElem.querySelector('input[name="center_type"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        return false;
      }
      if (checkedRadio.value === 'Autre') {
        const val = centerTypeAutreInput ? centerTypeAutreInput.value.trim() : '';
        if (!val) {
          triggerStepError(stepElem);
          if (centerTypeAutreInput) centerTypeAutreInput.focus();
          return false;
        }
      }
      return true;
    }

    if (stepNumber === 2) {
      const checkedRadio = stepElem.querySelector('input[name="active_duration"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      const checkedRadio = stepElem.querySelector('input[name="students_per_month"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      const checkedRadio = stepElem.querySelector('input[name="ad_experience"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        return false;
      }
      return true;
    }

    if (stepNumber === 5) {
      const fullName = document.getElementById('fullName');
      const phone = document.getElementById('phone');
      const email = document.getElementById('email');
      const city = document.getElementById('citySelect');

      if (!fullName || !fullName.value.trim()) {
        triggerStepError(stepElem);
        if (fullName) fullName.focus();
        return false;
      }

      if (!phone) {
        triggerStepError(stepElem);
        return false;
      }
      const cleanPhone = phone.value.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 9) {
        triggerStepError(stepElem);
        alert('Veuillez saisir un numéro de téléphone valide (ex: 06 12 34 56 78).');
        phone.focus();
        return false;
      }

      if (!email || !email.value.trim()) {
        triggerStepError(stepElem);
        if (email) email.focus();
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        triggerStepError(stepElem);
        alert('Veuillez saisir une adresse email valide.');
        email.focus();
        return false;
      }

      if (!city || !city.value) {
        triggerStepError(stepElem);
        if (city) city.focus();
        return false;
      }

      if (city.value === 'Autre') {
        const customCity = cityAutreInput ? cityAutreInput.value.trim() : '';
        if (!customCity) {
          triggerStepError(stepElem);
          if (cityAutreInput) cityAutreInput.focus();
          return false;
        }
      }

      return true;
    }

    return true;
  }

  /**
   * Question 1: Handling "Autre" reveal
   */
  centerTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.value === 'Autre') {
        if (centerTypeAutreWrap) {
          centerTypeAutreWrap.style.display = 'block';
          if (centerTypeAutreInput) centerTypeAutreInput.focus();
        }
      } else {
        if (centerTypeAutreWrap) {
          centerTypeAutreWrap.style.display = 'none';
        }
        // Auto-advance to step 2 after brief delay
        setTimeout(() => {
          if (currentStep === 1) {
            goToStep(2);
          }
        }, 260);
      }
    });
  });

  /**
   * Questions 2, 3, 4: Auto-advance on radio selection
   */
  const radioGroups = [
    { name: 'active_duration', nextStep: 3 },
    { name: 'students_per_month', nextStep: 4 },
    { name: 'ad_experience', nextStep: 5 }
  ];

  radioGroups.forEach((group) => {
    const radios = document.querySelectorAll(`input[name="${group.name}"]`);
    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        setTimeout(() => {
          goToStep(group.nextStep);
        }, 260);
      });
    });
  });

  /**
   * Question 5: City select "Autre" reveal
   */
  if (citySelect) {
    citySelect.addEventListener('change', () => {
      if (citySelect.value === 'Autre') {
        if (cityAutreWrap) {
          cityAutreWrap.style.display = 'block';
          if (cityAutreInput) cityAutreInput.focus();
        }
      } else {
        if (cityAutreWrap) {
          cityAutreWrap.style.display = 'none';
        }
      }
    });
  }

  /**
   * Navigation Buttons (Suivant / Précédent)
   */
  document.querySelectorAll('.next-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.getAttribute('data-next'), 10);
      if (validateStep(currentStep)) {
        goToStep(targetStep);
      }
    });
  });

  document.querySelectorAll('.prev-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.getAttribute('data-prev'), 10);
      goToStep(targetStep);
    });
  });

  /**
   * Final Form Submission
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateStep(5)) {
      return;
    }

    // Collect values
    const centerTypeRadio = document.querySelector('input[name="center_type"]:checked');
    let centerTypeVal = centerTypeRadio ? centerTypeRadio.value : '';
    if (centerTypeVal === 'Autre' && centerTypeAutreInput && centerTypeAutreInput.value.trim()) {
      centerTypeVal = `Autre (${centerTypeAutreInput.value.trim()})`;
    }

    const activeDurationRadio = document.querySelector('input[name="active_duration"]:checked');
    const activeDurationVal = activeDurationRadio ? activeDurationRadio.value : '';

    const studentsRadio = document.querySelector('input[name="students_per_month"]:checked');
    const studentsVal = studentsRadio ? studentsRadio.value : '';

    const adRadio = document.querySelector('input[name="ad_experience"]:checked');
    const adVal = adRadio ? adRadio.value : '';

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const email = document.getElementById('email').value.trim();

    let cityVal = citySelect.value;
    if (cityVal === 'Autre' && cityAutreInput && cityAutreInput.value.trim()) {
      cityVal = `Autre (${cityAutreInput.value.trim()})`;
    }

    // Update submit button UI
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.75';
      submitBtn.innerHTML = '<span>Envoi en cours... ⏳</span>';
    }

    // Package payload matching Google Sheet schema
    const payload = {
      fullName: fullName,
      prospectName: fullName,
      businessName: centerTypeVal,
      centerType: centerTypeVal,
      activeDuration: activeDurationVal,
      studentsPerMonth: studentsVal,
      adExperience: adVal,
      phone: cleanPhone,
      email: email,
      city: cityVal,
      // Fallback fields for CRM Google Sheet columns:
      centerName: centerTypeVal,
      formationType: centerTypeVal,
      etape: "Nouveau Lead",
      probabilite: "20%",
      meetLink: "",
      notes: `[Email: ${email}] [Ancienneté: ${activeDurationVal}] [Élèves/mois: ${studentsVal}] [Publicité: ${adVal}]`
    };

    // Store in localStorage & sessionStorage for Thank-You page display
    try {
      localStorage.setItem('prospectBooking', JSON.stringify(payload));
      localStorage.setItem('najah_last_booking', JSON.stringify(payload));
      sessionStorage.setItem('najah_current_lead', JSON.stringify(payload));
    } catch (storageErr) {
      console.warn('Storage error:', storageErr);
    }

    // Post to Google Apps Script with 800ms safety timeout fallback
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

    // Redirect cleanly
    const targetUrl = window.location.protocol === 'file:' ? 'thank-you.html' : 'thank-you';
    window.location.href = targetUrl;
  });
}
