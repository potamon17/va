document.addEventListener('DOMContentLoaded', ()=>{
  const RSVP_TARGET_EMAIL = 'tancorov.andriy@gmail.com';
  const RSVP_SECONDARY_EMAIL = 'kivaa1998@gmail.com';
  const WEB3FORMS_ACCESS_KEY = '465fb021-0642-48b7-8665-834a7b3b6b75';
  const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
  const WEB3FORMS_TIMEOUT_MS = 12000;
  const introOverlay = document.getElementById('intro-video-overlay');
  const introVideo = document.getElementById('intro-video-player');
  const introSong = document.getElementById('intro-song');
  const musicToggle = document.getElementById('music-toggle');
  const siteContent = document.getElementById('site-content');

  const syncMusicToggleState = () => {
    if (!musicToggle || !introSong) return;
    const isPlaying = !introSong.paused && !introSong.ended;
    musicToggle.classList.toggle('is-playing', isPlaying);
    musicToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    musicToggle.setAttribute('aria-label', isPlaying ? 'Поставити музику на паузу' : 'Увімкнути музику');
    musicToggle.textContent = isPlaying ? '♫ Музика: Увімк.' : '♪ Музика: Вимк.';
  };

  const unlockContent = () => {
    document.body.classList.remove('intro-active');
    document.body.classList.remove('intro-reveal');
    if (siteContent) {
      siteContent.removeAttribute('hidden');
      siteContent.removeAttribute('inert');
      siteContent.removeAttribute('aria-hidden');
    }
  };

  const startIntroReveal = () => {
    document.body.classList.add('intro-reveal');
  };

  const goToFirstSection = () => {
    const firstSection = document.querySelector('.hero.page-section') || document.querySelector('.page-section');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (firstSection) {
      firstSection.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  };

  const finishIntro = () => {
    if (!introOverlay) {
      unlockContent();
      goToFirstSection();
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
    goToFirstSection();
  };

  if (introVideo) {
    introVideo.load();
    introVideo.addEventListener('ended', finishIntro);
    introVideo.addEventListener('timeupdate', () => {
      if (!Number.isFinite(introVideo.duration) || introVideo.duration <= 0) return;
      const remaining = introVideo.duration - introVideo.currentTime;
      if (remaining <= 1.2) {
        startIntroReveal();
      }
    });

    let introStarted = false;
    let songStarted = false;
    const tapHint = document.getElementById('intro-tap-hint');

    const startSongPlayback = () => {
      if (!introSong) return Promise.resolve(songStarted);
      if (songStarted && !introSong.paused) return Promise.resolve(songStarted);
      const songPromise = introSong.play();
      if (songPromise && typeof songPromise.catch === 'function') {
        return songPromise
          .then(() => {
            songStarted = true;
            syncMusicToggleState();
            return songStarted;
          })
          .catch(() => {
            songStarted = false;
            syncMusicToggleState();
            return songStarted;
          });
      } else {
        songStarted = true;
        syncMusicToggleState();
        return Promise.resolve(songStarted);
      }
    };

    if (introSong) {
      introSong.addEventListener('play', () => {
        songStarted = true;
        syncMusicToggleState();
      });
      introSong.addEventListener('pause', () => {
        songStarted = false;
        syncMusicToggleState();
      });
      introSong.addEventListener('ended', () => {
        songStarted = false;
        syncMusicToggleState();
      });
    }

    introVideo.addEventListener('play', () => {
      introStarted = true;
      if (tapHint) {
        tapHint.classList.add('is-hidden');
      }
      startSongPlayback();
    });

    const startIntroPlayback = () => {
      if (!introStarted) {
        introStarted = true;
        const playPromise = introVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            introStarted = false;
            if (tapHint) tapHint.classList.remove('is-hidden');
          });
        }
      }

      startSongPlayback();
    };

    if (tapHint) {
      tapHint.addEventListener('pointerdown', startIntroPlayback);
      tapHint.addEventListener('click', startIntroPlayback);
      tapHint.addEventListener('touchstart', startIntroPlayback, { passive: true });
    } else if (introOverlay) {
      introOverlay.addEventListener('pointerdown', startIntroPlayback);
      introOverlay.addEventListener('click', startIntroPlayback);
      introOverlay.addEventListener('touchstart', startIntroPlayback, { passive: true });
    }

    introVideo.addEventListener('pointerdown', startIntroPlayback);
    introVideo.addEventListener('click', startIntroPlayback);
    introVideo.addEventListener('touchstart', startIntroPlayback, { passive: true });

    if (musicToggle) {
      musicToggle.addEventListener('click', () => {
        if (!introSong) return;
        if (introSong.paused) {
          startSongPlayback();
          return;
        }
        introSong.pause();
      });
      syncMusicToggleState();
    }
  } else {
    unlockContent();
    goToFirstSection();
  }

  const form = document.getElementById('rsvp-form');
  const result = document.getElementById('rsvp-result');
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');
  const countdownNote = document.getElementById('countdown-note');

  const withTimeout = async (promise, timeoutMs, timeoutMessage = 'Request timeout') => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const isWeb3FormsConfigured = () => {
    return Boolean(WEB3FORMS_ACCESS_KEY) && !WEB3FORMS_ACCESS_KEY.includes('PASTE_WEB3FORMS_ACCESS_KEY_HERE');
  };

  const sendRsvpViaWeb3Forms = async ({ name, attendingLabel, guests, note, submittedAt }) => {
    if (!isWeb3FormsConfigured()) {
      throw new Error('Web3Forms access key is not configured');
    }

    const response = await withTimeout(
      fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: 'Нове підтвердження присутності на весілля',
          from_name: 'Wedding RSVP',
          name,
          attending: attendingLabel,
          guests: String(guests),
          note: note || '—',
          submitted_at: submittedAt,
          email: 'no-reply@andriy-viktoriia.com',
          botcheck: ''
        })
      }),
      WEB3FORMS_TIMEOUT_MS,
      'Web3Forms request timed out'
    );

    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.message || `Web3Forms HTTP ${response.status}`);
    }

    if (!payload || !payload.success) {
      throw new Error(payload?.message || 'Web3Forms rejected request');
    }
  };

  const sendRsvpViaClassicPost = async ({ name, attendingLabel, guests, note, submittedAt }) => {
    const iframeName = `rsvp-frame-${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';

    const fallbackForm = document.createElement('form');
    fallbackForm.method = 'POST';
    fallbackForm.action = `https://formsubmit.co/${RSVP_TARGET_EMAIL}`;
    fallbackForm.target = iframeName;
    fallbackForm.style.display = 'none';

    const fields = {
      _subject: 'Нове підтвердження присутності на весілля',
      _template: 'table',
      _captcha: 'false',
      _cc: RSVP_SECONDARY_EMAIL,
      "Ім\'я": name,
      'Приходить': attendingLabel,
      'Кількість гостей': String(guests),
      'Повідомлення': note || '—',
      'Час відправки': submittedAt
    };

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      fallbackForm.appendChild(input);
    });

    document.body.appendChild(iframe);
    document.body.appendChild(fallbackForm);

    const submitPromise = new Promise((resolve, reject) => {
      let submitted = false;

      iframe.addEventListener('load', () => {
        if (!submitted) return;
        resolve(true);
      });

      iframe.addEventListener('error', () => {
        reject(new Error('RSVP iframe submission failed'));
      });

      submitted = true;
      fallbackForm.submit();
    });

    await withTimeout(submitPromise, 15000, 'RSVP submit timed out');

    fallbackForm.remove();
    iframe.remove();
  };

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

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const submitBtn = form.querySelector('.btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Відправляємо...';
    }

    const data = {
      name: document.getElementById('name').value.trim(),
      attending: document.getElementById('attending').value,
      guests: Number(document.getElementById('guests').value || 0),
      note: document.getElementById('note').value.trim(),
      ts: Date.now()
    };

    const attendingLabel = data.attending === 'yes' ? 'Так, буду' : 'Нажаль, ні';
    const submittedAt = new Date(data.ts).toLocaleString('uk-UA');

    let sent = false;
    let lastError = null;

    if (isWeb3FormsConfigured()) {
      try {
        await sendRsvpViaWeb3Forms({
          name: data.name,
          attendingLabel,
          guests: data.guests,
          note: data.note,
          submittedAt
        });
        sent = true;
      } catch (error) {
        lastError = error;
        console.warn('RSVP web3forms send error:', error);
      }
    }

    if (!sent) {
      try {
        await sendRsvpViaClassicPost({
          name: data.name,
          attendingLabel,
          guests: data.guests,
          note: data.note,
          submittedAt
        });
        sent = true;
      } catch (error) {
        lastError = error;
      }
    }

    if (!sent) {
      if (result) {
        result.textContent = 'Не вдалося надіслати на пошту. Спробуйте ще раз.';
        result.style.color = '#b42318';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Надіслати відповідь';
      }
      console.warn('RSVP email send error:', lastError);
      return;
    }

    localStorage.setItem('rsvp', JSON.stringify(data));
    if (result) {
      result.textContent = data.attending === 'yes' ? `Дякуємо, ${data.name}! Повідомлення відправлено на пошту.` : `Дякуємо за відповідь, ${data.name}. Повідомлення відправлено на пошту.`;
      result.style.color = 'green';
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Збережено';
    }
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

    const revealGroups = [
      '.announcement p',
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

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, {
      threshold: 0.4
    });

    sections.forEach((section) => observer.observe(section));

    const blockObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, {
      threshold: 0.22,
      rootMargin: '0px 0px -8% 0px'
    });

    revealBlocks.forEach((block) => blockObserver.observe(block));
  }
});
