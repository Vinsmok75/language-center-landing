/**
 * Najah Media - CRO B2B Multi-Step Qualification Form Logic (6 Steps)
 * Features:
 * 1. 6-Step Intuitive Interactive Funnel with Progress Bar & Milestones.
 * 2. Instant visual highlight (.selected) and silky auto-advance on selection.
 * 3. Conditional reveal for "Autre" field (Center Type).
 * 4. Step 5 Call Timing & Step 6 Contact Info with City restrictions (Meknès, Fès, Rabat, Casablanca).
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
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const alertBox = document.getElementById('formAlertBox');

  // Conditional "Autre" Elements for Center Type
  const centerTypeRadios = document.querySelectorAll('input[name="center_type"]');
  const centerTypeAutreWrap = document.getElementById('centerTypeAutreWrap');
  const centerTypeAutreInput = document.getElementById('centerTypeAutreInput');

  const citySelect = document.getElementById('citySelect');
  const cityAutreWrap = document.getElementById('cityAutreWrap');
  const cityAutreInput = document.getElementById('cityAutreInput');

  /**
   * Display inline alert message
   */
  function showAlert(message) {
    if (!alertBox) {
      alert(message);
      return;
    }
    alertBox.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>${message}</span>
    `;
    alertBox.classList.add('visible');

    const rect = alertBox.getBoundingClientRect();
    if (rect.top < 40) {
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setTimeout(() => {
      alertBox.classList.remove('visible');
    }, 4500);
  }

  /**
   * Update visual .selected class on option cards
   */
  function updateCardSelectionState(radioInput) {
    const groupName = radioInput.name;
    document.querySelectorAll(`input[name="${groupName}"]`).forEach((r) => {
      const card = r.closest('.option-card');
      if (card) {
        if (r.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });
  }

  // Bind selection styling on all radio cards
  document.querySelectorAll('.option-card input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      updateCardSelectionState(radio);
    });
    if (radio.checked) {
      const card = radio.closest('.option-card');
      if (card) card.classList.add('selected');
    }
  });

  /**
   * Update Progress Bar, Milestones & Step Visibility
   */
  function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;

    currentStep = stepNumber;

    if (alertBox) alertBox.classList.remove('visible');

    // Update active step DOM classes
    steps.forEach((stepElem) => {
      const stepIdx = parseInt(stepElem.getAttribute('data-step'), 10);
      if (stepIdx === currentStep) {
        stepElem.classList.add('active');
      } else {
        stepElem.classList.remove('active');
      }
    });

    // Update progress percentage
    const progressPercent = Math.round((currentStep / totalSteps) * 100);
    if (stepIndicatorText) {
      stepIndicatorText.innerHTML = `<span>Étape ${currentStep} sur ${totalSteps}</span>`;
    }
    if (stepPercentageText) {
      stepPercentageText.textContent = `${progressPercent}%`;
    }
    if (progressBarFill) {
      progressBarFill.style.width = `${progressPercent}%`;
    }

    // Update Milestones Stepper
    const milestones = document.querySelectorAll('.milestone-item');
    milestones.forEach((item) => {
      const mStep = parseInt(item.getAttribute('data-milestone'), 10);
      item.classList.remove('active', 'completed');
      const numElem = item.querySelector('.milestone-num');

      if (mStep === currentStep) {
        item.classList.add('active');
        if (numElem) numElem.textContent = mStep;
      } else if (mStep < currentStep) {
        item.classList.add('completed');
        if (numElem) numElem.innerHTML = '✓';
      } else {
        if (numElem) numElem.textContent = mStep;
      }
    });

    // Smooth scroll to form top
    const formSection = document.getElementById('bookingSection');
    if (formSection) {
      const rect = formSection.getBoundingClientRect();
      if (rect.top < 20 || rect.top > 250) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /**
   * Trigger Shake animation on invalid step attempt
   */
  function triggerStepError(stepElem) {
    stepElem.classList.remove('step-error-shake');
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
        showAlert('Veuillez sélectionner votre type de centre.');
        return false;
      }
      if (checkedRadio.value === 'Autre') {
        const val = centerTypeAutreInput ? centerTypeAutreInput.value.trim() : '';
        if (!val) {
          triggerStepError(stepElem);
          showAlert('Veuillez préciser votre type d\'activité.');
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
        showAlert('Veuillez indiquer depuis combien de temps votre centre est actif.');
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      const checkedRadio = stepElem.querySelector('input[name="students_per_month"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        showAlert('Veuillez sélectionner le nombre moyen d\'élèves inscrits par mois.');
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      const checkedRadio = stepElem.querySelector('input[name="ad_experience"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        showAlert('Veuillez indiquer votre expérience avec la publicité.');
        return false;
      }
      return true;
    }

    if (stepNumber === 5) {
      const checkedRadio = stepElem.querySelector('input[name="call_timing"]:checked');
      if (!checkedRadio) {
        triggerStepError(stepElem);
        showAlert('Veuillez choisir le meilleur moment pour échanger.');
        return false;
      }
      return true;
    }

    if (stepNumber === 6) {
      const fullName = document.getElementById('fullName');
      const phone = document.getElementById('phone');
      const email = document.getElementById('email');
      const city = document.getElementById('citySelect');

      if (!fullName || !fullName.value.trim()) {
        triggerStepError(stepElem);
        showAlert('Veuillez saisir le nom du propriétaire ou du décideur.');
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
        showAlert('Veuillez saisir un numéro de téléphone valide (ex: 06 12 34 56 78).');
        phone.focus();
        return false;
      }

      if (!email || !email.value.trim()) {
        triggerStepError(stepElem);
        showAlert('Veuillez saisir votre adresse email.');
        if (email) email.focus();
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        triggerStepError(stepElem);
        showAlert('Veuillez saisir une adresse email valide.');
        email.focus();
        return false;
      }

      if (!city || !city.value) {
        triggerStepError(stepElem);
        showAlert('Veuillez sélectionner votre ville.');
        if (city) city.focus();
        return false;
      }

      if (city.value === 'Autre') {
        const customCity = cityAutreInput ? cityAutreInput.value.trim() : '';
        if (!customCity) {
          triggerStepError(stepElem);
          showAlert('Veuillez préciser le nom de votre ville.');
          if (cityAutreInput) cityAutreInput.focus();
          return false;
        }
      }

      return true;
    }

    return true;
  }

  /**
   * Question 6: City select "Autre" reveal
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
   * Question 1: Handling "Autre" reveal & auto-advance
   */
  centerTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateCardSelectionState(radio);
      if (radio.value === 'Autre') {
        if (centerTypeAutreWrap) {
          centerTypeAutreWrap.style.display = 'block';
          if (centerTypeAutreInput) centerTypeAutreInput.focus();
        }
      } else {
        if (centerTypeAutreWrap) {
          centerTypeAutreWrap.style.display = 'none';
        }
        setTimeout(() => {
          if (currentStep === 1) {
            goToStep(2);
          }
        }, 260);
      }
    });
  });

  /**
   * Questions 2, 3, 4, 5: Auto-advance on radio selection
   */
  const radioGroups = [
    { name: 'active_duration', nextStep: 3 },
    { name: 'students_per_month', nextStep: 4 },
    { name: 'ad_experience', nextStep: 5 },
    { name: 'call_timing', nextStep: 6 }
  ];

  radioGroups.forEach((group) => {
    const radios = document.querySelectorAll(`input[name="${group.name}"]`);
    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        updateCardSelectionState(radio);
        setTimeout(() => {
          goToStep(group.nextStep);
        }, 260);
      });
    });
  });

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

    if (!validateStep(6)) {
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

    const callTimingRadio = document.querySelector('input[name="call_timing"]:checked');
    const callTimingVal = callTimingRadio ? callTimingRadio.value : '';

    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    let cityVal = citySelect ? citySelect.value : '';
    if (cityVal === 'Autre' && cityAutreInput && cityAutreInput.value.trim()) {
      cityVal = `Autre (${cityAutreInput.value.trim()})`;
    }

    // Update submit button UI to loading state
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.75';
      submitBtn.innerHTML = '<span>Envoi en cours...</span>';
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
      callTiming: callTimingVal,
      phone: cleanPhone,
      email: email,
      city: cityVal,
      // Fallback fields for CRM Google Sheet columns:
      centerName: centerTypeVal,
      formationType: centerTypeVal,
      etape: "Nouveau Lead",
      probabilite: "20%",
      meetLink: "",
      notes: `[Email: ${email}] [Ancienneté: ${activeDurationVal}] [Élèves/mois: ${studentsVal}] [Publicité: ${adVal}] [Créneau: ${callTimingVal}]`
    };

    // Store in localStorage & sessionStorage for Thank-You page display
    try {
      localStorage.setItem('prospectBooking', JSON.stringify(payload));
      localStorage.setItem('najah_last_booking', JSON.stringify(payload));
      sessionStorage.setItem('najah_current_lead', JSON.stringify(payload));
      localStorage.setItem('lastLeadSource', 'langue');
      localStorage.setItem('leadFormReturnPage', 'centre-de-langue.html');
    } catch (storageErr) {
      console.warn('Storage error:', storageErr);
    }

    // Post to Google Apps Script with 900ms safety timeout fallback
    const fetchPromise = fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 900));

    try {
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Google Script fetch warning:', err);
    }

    // Redirect cleanly
    window.location.href = 'thank-you.html?source=langue';
  });
}
