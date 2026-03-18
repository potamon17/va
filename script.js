document.addEventListener('DOMContentLoaded', ()=>{
  const introOverlay = document.getElementById('intro-video-overlay');
  const introVideo = document.getElementById('intro-video-player');
  const siteContent = document.getElementById('site-content');

  const unlockContent = () => {
    document.body.classList.remove('intro-active');
    document.body.classList.remove('intro-reveal');
    if (siteContent) {
      siteContent.removeAttribute('inert');
      siteContent.removeAttribute('aria-hidden');
    }
  };

  const startIntroReveal = () => {
    document.body.classList.add('intro-reveal');
  };

  const finishIntro = () => {
    if (!introOverlay) {
      unlockContent();
      return;
    }
    introOverlay.classList.add('is-hidden');
    const removeOverlay = () => {
      if (introOverlay.isConnected) {
        introOverlay.remove();
      }
    };
    introOverlay.addEventListener('transitionend', () => {
      removeOverlay();
    }, { once: true });
    setTimeout(removeOverlay, 1300);
    unlockContent();
  };

  if (introVideo) {
    introVideo.addEventListener('ended', finishIntro);
    introVideo.addEventListener('timeupdate', () => {
      if (!Number.isFinite(introVideo.duration) || introVideo.duration <= 0) return;
      const remaining = introVideo.duration - introVideo.currentTime;
      if (remaining <= 1.2) {
        startIntroReveal();
      }
    });
    const playPromise = introVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        introVideo.controls = true;
      });
    }
  } else {
    unlockContent();
  }

  const form = document.getElementById('rsvp-form');
  const result = document.getElementById('rsvp-result');
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  const countdownNote = document.getElementById('countdown-note');

  // Load saved RSVP if present
  const saved = localStorage.getItem('rsvp');
  if(saved){
    try{
      const data = JSON.parse(saved);
      document.getElementById('name').value = data.name || '';
      document.getElementById('attending').value = data.attending || 'yes';
      document.getElementById('guests').value = data.guests || 0;
      document.getElementById('note').value = data.note || '';
      result.textContent = 'Ви вже підтвердили — дякуємо!';
    }catch(e){console.warn(e)}
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = {
      name: document.getElementById('name').value.trim(),
      attending: document.getElementById('attending').value,
      guests: Number(document.getElementById('guests').value || 0),
      note: document.getElementById('note').value.trim(),
      ts: Date.now()
    };
    localStorage.setItem('rsvp', JSON.stringify(data));
    result.textContent = data.attending === 'yes' ? `Дякуємо, ${data.name}! Чекаємо на вас на весіллі Андрія і Вікторії.` : `Дякуємо за відповідь, ${data.name}.`;
    form.querySelector('.btn').textContent = 'Збережено';
  });

  const targetDate = new Date(2026, 5, 20, 0, 0, 0);
  const setCountdown = () => {
    if(!daysEl || !hoursEl || !minutesEl || !secondsEl) return;
    const diff = targetDate.getTime() - Date.now();
    if(diff <= 0){
      daysEl.textContent = '0';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      if(countdownNote) countdownNote.textContent = 'Сьогодні наш особливий день!';
      return false;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
    if(countdownNote) countdownNote.textContent = '';
    return true;
  };

  setCountdown();
  const timerId = setInterval(() => {
    const shouldContinue = setCountdown();
    if(!shouldContinue) clearInterval(timerId);
  }, 1000);

  const scheduleButtons = document.querySelectorAll('.schedule-btn');
  const escapeICS = (value = '') => value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const toICSDateTime = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const buildICS = ({ title, start, end, description, location }) => {
    const uid = `wedding-${Date.now()}@invite`;
    const now = new Date();
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding Invite//UA//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toICSDateTime(now)}`,
      `DTSTART:${toICSDateTime(start)}`,
      `DTEND:${toICSDateTime(end)}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      `LOCATION:${escapeICS(location)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Нагадування про подію',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  };

  const downloadICS = (fileContent, fileName) => {
    const blob = new Blob([fileContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
    return blob;
  };

  scheduleButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const title = button.dataset.title || 'Подія';
      const start = new Date(button.dataset.start || '2026-06-20T16:00:00');
      const end = new Date(button.dataset.end || '2026-06-20T17:00:00');
      const description = button.dataset.description || 'Подія із запрошення';
      const location = button.dataset.location || 'Локація події';

      const ics = buildICS({ title, start, end, description, location });
      const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.ics`;
      const blob = downloadICS(ics, fileName);

      try {
        if (navigator.canShare && navigator.share && typeof File !== 'undefined') {
          const file = new File([blob], fileName, { type: 'text/calendar' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title,
              text: 'Додайте подію в календар'
            });
          }
        }
      } catch (error) {
        console.warn('Не вдалося відкрити меню поширення:', error);
      }
    });
  });

  const sections = document.querySelectorAll('.page-section');
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (sections.length && !prefersReducedMotion) {
    document.body.classList.add('scroll-animated');
    sections[0].classList.add('is-visible');

    const revealGroups = [
      '.message h2',
      '.message p',
      '.countdown-item',
      '.schedule-item',
      '.dresscode-image-wrap',
      '.rsvp',
      '.map-side',
      '.contact p'
    ];

    revealGroups.forEach((selector) => {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((node, index) => {
        node.classList.add('reveal-block');
        node.style.setProperty('--reveal-delay', `${index * 90}ms`);
      });
    });

    const revealBlocks = document.querySelectorAll('.reveal-block');

    let currentSectionIndex = 0;
    let isTransitioning = false;
    let touchStartY = 0;

    const goToSection = (nextIndex) => {
      const bounded = Math.max(0, Math.min(nextIndex, sections.length - 1));
      if (bounded === currentSectionIndex || isTransitioning) return;
      isTransitioning = true;
      sections[bounded].scrollIntoView({ behavior: 'smooth', block: 'start' });
      currentSectionIndex = bounded;
      setTimeout(() => {
        isTransitioning = false;
      }, 700);
    };

    const onWheel = (event) => {
      if (isTransitioning) {
        event.preventDefault();
        return;
      }
      if (Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      if (event.deltaY > 0) {
        goToSection(currentSectionIndex + 1);
      } else {
        goToSection(currentSectionIndex - 1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', (event) => {
      touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', (event) => {
      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaY) < 35 || isTransitioning) return;
      if (deltaY > 0) {
        goToSection(currentSectionIndex + 1);
      } else {
        goToSection(currentSectionIndex - 1);
      }
    }, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          const index = Array.from(sections).indexOf(entry.target);
          if (index >= 0) currentSectionIndex = index;
        }
      });
    }, {
      threshold: 0.55
    });

    sections.forEach((section) => observer.observe(section));

    const blockObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        blockObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.22,
      rootMargin: '0px 0px -8% 0px'
    });

    revealBlocks.forEach((block) => blockObserver.observe(block));
  }
});
