// ── Loading Screen ────────────────────────────────────────────────────────────
(function(){
  var screen = document.getElementById('loading-screen');
  var bar    = document.getElementById('loading-bar-fill');
  var content = screen ? screen.querySelector('.loading-content') : null;
  if(!screen) return;

  var dismissed = false;
  var readyShown = false;
  var currentPct = 0;
  var startBtn = document.getElementById('loading-start-btn');
  var loadStartedAt = Date.now();
  var minimumLoadMs = 500;
  var minimumLoadTimer = null;

  function setProgress(p){
    var v = Math.min(100, Math.max(0, Math.round(p)));
    if(v <= currentPct) return;
    currentPct = v;
    if(bar) bar.style.width = v + '%';
  }

  function dismiss(){
    if(dismissed) return;
    dismissed = true;
    screen.classList.add('hidden');
    setTimeout(function(){ if(screen.parentNode) screen.parentNode.removeChild(screen); }, 750);
  }

  function showStartButton(){
    if(readyShown) return;

    var elapsed = Date.now() - loadStartedAt;
    if(elapsed < minimumLoadMs){
      if(minimumLoadTimer) return;
      minimumLoadTimer = setTimeout(function(){
        minimumLoadTimer = null;
        showStartButton();
      }, minimumLoadMs - elapsed);
      return;
    }

    readyShown = true;
    setProgress(100);
    if(content) content.classList.add('ready');
    if(startBtn){
      startBtn.classList.add('visible');
      startBtn.addEventListener('click', dismiss, { once: true });
    }
  }

  // Warm-up: animate 0→8% immediately to show activity
  var warmup = 0;
  var warmupTimer = setInterval(function(){
    warmup += 2;
    setProgress(warmup);
    if(warmup >= 8) clearInterval(warmupTimer);
  }, 60);

  function trackImages(){
    // Gather all <img> elements present in the DOM now (static; excludes dynamic gallery)
    var imgEls = Array.from(document.querySelectorAll('img:not([src=""])[src]'));

    // Also probe bg images set via inline style on sections
    var bgSrcs = [];
    document.querySelectorAll('[style*="background-image"]').forEach(function(el){
      var m = el.getAttribute('style').match(/url\(['"]?([^'"\)]+)['"]?\)/);
      if(m && m[1]) bgSrcs.push(m[1]);
    });

    var trackedSrcs = new Set();
    var allImages = [];

    imgEls.forEach(function(img){
      if(!trackedSrcs.has(img.src)){ trackedSrcs.add(img.src); allImages.push(img); }
    });

    bgSrcs.forEach(function(src){
      if(!trackedSrcs.has(src)){
        trackedSrcs.add(src);
        var probe = new Image();
        probe.src = src;
        allImages.push(probe);
      }
    });

    if(!allImages.length){ showStartButton(); return; }

    var total  = allImages.length;
    var loaded = 0;
    var baseProgress = 8; // warm-up already got us here

    function onOne(){
      loaded++;
      // Map loaded/total → 8%→100% range
      var p = baseProgress + ((100 - baseProgress) * loaded / total);
      setProgress(p);
      if(loaded >= total) showStartButton();
    }

    allImages.forEach(function(img){
      if(img.complete && img.naturalWidth !== undefined && img.naturalWidth >= 0){
        onOne();
      } else {
        img.addEventListener('load',  onOne, { once: true });
        img.addEventListener('error', onOne, { once: true });
      }
    });
  }

  // Safety timeout: never block the user more than 9 seconds
  var safetyTimer = setTimeout(showStartButton, 9000);
  screen.addEventListener('transitionend', function(){ clearTimeout(safetyTimer); }, { once: true });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', trackImages);
  } else {
    trackImages();
  }
})();

// Prevent browser from restoring scroll position on refresh
if('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const invitationUiState = {
  opened: false,
  musicToggleBound: false
};

function setMusicToggleUi(audio){
  const musicBtn = document.getElementById('music-toggle-btn');
  const iconOn = document.getElementById('music-icon-on');
  const iconOff = document.getElementById('music-icon-off');
  if(!musicBtn || !audio) return;

  const isMuted = audio.muted;
  musicBtn.classList.add('visible');
  musicBtn.setAttribute('aria-label', isMuted ? 'Unmute music' : 'Mute music');
  if(iconOn) iconOn.style.display = isMuted ? 'none' : 'block';
  if(iconOff) iconOff.style.display = isMuted ? 'block' : 'none';
}

function bindMusicToggle(){
  const musicBtn = document.getElementById('music-toggle-btn');
  if(!musicBtn || invitationUiState.musicToggleBound) return;

  invitationUiState.musicToggleBound = true;
  musicBtn.addEventListener('click', () => {
    const audio = document.getElementById('bg-music');
    if(!audio) return;

    if(audio.muted){
      audio.muted = false;
      if(audio.paused) audio.play().catch(() => {});
    } else {
      audio.muted = true;
    }

    setMusicToggleUi(audio);
  });
}

function startBackgroundMusic(){
  const bgMusic = document.getElementById('bg-music');
  if(!bgMusic) return;

  bgMusic.volume = 1;
  bgMusic.muted = false;
  bgMusic.play().catch(() => {});
  setMusicToggleUi(bgMusic);
  bindMusicToggle();
}

function scrollToHeroSection(){
  const heroSection = document.getElementById('hero');
  if(!heroSection) return;

  const heroTop = Math.max(0, Math.round(heroSection.getBoundingClientRect().top + window.pageYOffset));

  try{
    window.scrollTo({ top: heroTop, behavior: 'smooth' });
  }catch(error){
    window.scrollTo(0, heroTop);
  }

  window.setTimeout(() => {
    if(Math.abs(window.pageYOffset - heroTop) > 4){
      window.scrollTo(0, heroTop);
    }
  }, 450);
}

function openInvitation(){
  invitationUiState.opened = true;
  document.body.classList.add('scroll-unlocked');
  document.documentElement.classList.add('scroll-unlocked');
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';

  startBackgroundMusic();

  if(typeof requestAnimationFrame === 'function'){
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToHeroSection);
    });
  } else {
    window.setTimeout(scrollToHeroSection, 16);
  }
}

function bindInvitationOpenButton(){
  const invitationOpenBtnEl = document.getElementById('invitation-open-btn');
  if(!invitationOpenBtnEl || invitationOpenBtnEl.dataset.bound === 'true') return;

  invitationOpenBtnEl.dataset.bound = 'true';
  invitationOpenBtnEl.addEventListener('click', openInvitation);
}

bindInvitationOpenButton();

// Yield to browser main thread so it can paint before next section loads
function yieldToMain(){ return new Promise(resolve => setTimeout(resolve, 0)); }

async function loadContent(){
  try{
    // Fetch content.json and prewedding index in parallel
    const [res, idxRes] = await Promise.all([
      fetch('assets/data/content.json'),
      fetch('assets/images/prewedding/index.json').catch(() => null)
    ]);
    const data = await res.json();

    const preweddingData = data.preweding || {};

    function normalizeGalleryList(input){
      if(!Array.isArray(input)) return [];
      return Array.from(new Set(
        input
          .map((name) => String(name || '').trim())
          .filter(Boolean)
      ));
    }

    function flattenGalleryGroups(groups){
      if(!Array.isArray(groups)) return [];
      const names = [];
      groups.forEach((group) => {
        if(!Array.isArray(group)) return;
        group.forEach((name) => names.push(name));
      });
      return names;
    }

    // try to load prewedding index for images
    let imgs = [];
    try{
      if(idxRes && idxRes.ok){
        const idxPayload = await idxRes.json();
        if(Array.isArray(idxPayload)) imgs = idxPayload;
        else if(idxPayload && Array.isArray(idxPayload.images)) imgs = idxPayload.images;
        else if(idxPayload && Array.isArray(idxPayload.files)) imgs = idxPayload.files;
      }
    }catch(e){ /* no index.json, ignore */ }

    const fallbackGalleryNames = normalizeGalleryList([
      ...flattenGalleryGroups(preweddingData.sameColumnGroups),
      ...(Array.isArray(preweddingData.sameColumnPhotos) ? preweddingData.sameColumnPhotos : []),
      ...(Array.isArray(preweddingData.imagesList) ? preweddingData.imagesList : [])
    ]);

    imgs = normalizeGalleryList(imgs);
    if(!imgs.length && fallbackGalleryNames.length){
      imgs = fallbackGalleryNames;
    }

    const imagesBase = preweddingData.images ? preweddingData.images : 'assets/images/prewedding/';

    // ── 1. INVITATION ──────────────────────────────────────────────────────
    const invitationData = data.invitation || {};
    const invitationEl = document.getElementById('invitation');
    const invitationEyebrowEl = document.getElementById('invitation-eyebrow');
    const invitationTitleEl = document.getElementById('invitation-title');
    const invitationGuestPrefixEl = document.getElementById('invitation-guest-prefix');
    const invitationGuestNameEl = document.getElementById('invitation-guest-name');
    const invitationOpenBtnEl = document.getElementById('invitation-open-btn');

    if(invitationEyebrowEl) invitationEyebrowEl.textContent = invitationData.eyebrow || data.hero.eyebrow || invitationEyebrowEl.textContent || '';
    if(invitationTitleEl) invitationTitleEl.textContent = invitationData.title || data.hero.title || invitationTitleEl.textContent || '';
    if(invitationGuestPrefixEl) invitationGuestPrefixEl.textContent = invitationData.guestPrefix || invitationGuestPrefixEl.textContent || '';

    const inviteParams = new URLSearchParams(window.location.search);
    const guestFromQuery = inviteParams.get('to');
    const guestName = guestFromQuery
      ? decodeURIComponent(guestFromQuery.replace(/\+/g, ' ')).trim()
      : (invitationData.guestDefault || (invitationGuestNameEl ? invitationGuestNameEl.textContent : '') || '');
    if(invitationGuestNameEl) invitationGuestNameEl.textContent = guestName;

    function parseBooleanFlag(value, fallback = true){
      if(typeof value === 'boolean') return value;
      if(typeof value === 'number') return value !== 0;
      if(typeof value === 'string'){
        const normalized = value.trim().toLowerCase();
        if(['true', '1', 'yes', 'y', 'show', 'tampil'].includes(normalized)) return true;
        if(['false', '0', 'no', 'n', 'hide', 'sembunyikan'].includes(normalized)) return false;
      }
      return fallback;
    }

    function normalizeGuestKey(value){
      return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    async function loadGuestEventVisibilitySettings(){
      const detailsSettings = data.details && data.details.guestVisibility ? data.details.guestVisibility : {};
      const settingsEnabled = parseBooleanFlag(detailsSettings.enabled, false);
      const configuredDefaultMax = Number(data.rsvp && data.rsvp.maxAttendance);
      const fallbackMaxAttendance = Number.isFinite(configuredDefaultMax) && configuredDefaultMax >= 1
        ? Math.floor(configuredDefaultMax)
        : 2;
      const settings = { showAkad: false, maxAttendance: fallbackMaxAttendance };
      const defaultGuestKey = normalizeGuestKey(invitationData.guestDefault || '');
      const currentGuestKey = normalizeGuestKey(guestName);
      const hasExplicitGuestParam = Boolean(guestFromQuery && String(guestFromQuery).trim());

      if(!hasExplicitGuestParam || (defaultGuestKey && currentGuestKey === defaultGuestKey)) return settings;
      if(!settingsEnabled) return settings;

      const readUrlValue = (detailsSettings.googleSheetReadUrl || (data.rsvp && data.rsvp.googleSheetReadUrl) || '').trim();
      const actionValue = (detailsSettings.action || 'guest').trim();
      const guestParamName = (detailsSettings.nameParam || 'name').trim();

      if(!readUrlValue || !guestName) return settings;

      try{
        const url = new URL(readUrlValue);
        if(actionValue && !url.searchParams.has('action')) url.searchParams.set('action', actionValue);
        if(guestParamName) url.searchParams.set(guestParamName, guestName);

        const response = await fetch(url.toString(), {
          method: 'GET',
          cache: 'no-store'
        });
        if(!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const source = payload && typeof payload === 'object'
          ? (payload.guest || payload.data || payload.row || payload)
          : {};
        const rawShowAkad = source && typeof source === 'object'
          ? (source.showAkad ?? source.show_akad ?? source.akad ?? source.showAkadSection)
          : undefined;
        const rawMaxAttendance = source && typeof source === 'object'
          ? (source.maxAttendance ?? source.max_attendance ?? source.attendanceMax ?? source.maxHadir ?? source.max_hadir)
          : undefined;

        if(typeof rawShowAkad !== 'undefined'){
          settings.showAkad = parseBooleanFlag(rawShowAkad, false);
        }

        if(typeof rawMaxAttendance !== 'undefined'){
          const parsedMax = Number(rawMaxAttendance);
          if(Number.isFinite(parsedMax) && parsedMax >= 1){
            settings.maxAttendance = Math.floor(parsedMax);
          }
        }
      }catch(error){
        console.error('Failed loading guest visibility settings from Google Sheet', error);
      }

      return settings;
    }

    const heroFallbackPath = (data.hero && data.hero.background)
      ? data.hero.background
      : (imgs.length ? imagesBase + imgs[0] : '');
    const invitationPath = invitationData.background || heroFallbackPath;
    if(invitationEl && invitationPath){
      invitationEl.style.backgroundImage = `url("${invitationPath}")`;
      invitationEl.style.backgroundSize = 'cover';
      invitationEl.style.backgroundPosition = 'center';
    }

    bindInvitationOpenButton();

    await yieldToMain();

    // ── 2. HERO ────────────────────────────────────────────────────────────
    const heroEyebrowEl = document.getElementById('hero-eyebrow');
    const heroTitleEl = document.getElementById('hero-title');
    const heroDateEl = document.getElementById('hero-date');
    if(heroEyebrowEl) heroEyebrowEl.textContent = data.hero.eyebrow || heroEyebrowEl.textContent || '';
    if(heroTitleEl) heroTitleEl.textContent = data.hero.title || heroTitleEl.textContent || '';
    if(heroDateEl) heroDateEl.textContent = data.hero.date || heroDateEl.textContent || '';

    const heroVideoEl = document.getElementById('hero-video');
    const heroVideoSrcEl = document.getElementById('hero-video-src');
    const heroVideoPath = (data.hero && data.hero.video) ? data.hero.video : '';
    if(heroVideoEl && heroVideoSrcEl && heroVideoPath){
      heroVideoSrcEl.src = heroVideoPath;
      heroVideoEl.load();
    }

    await yieldToMain();

    // ── 3. SURAH / COUNTDOWN ───────────────────────────────────────────────
    const surahTextEl = document.getElementById('surah-text');
    const surahCitationEl = document.getElementById('surah-citation');
    if(surahTextEl) surahTextEl.textContent = (data.surah && data.surah.text) ? data.surah.text : '';
    if(surahCitationEl) surahCitationEl.textContent = (data.surah && data.surah.citation) ? data.surah.citation : '';

    // floral image override: if `data.surah.floral` is set, use it and hide the SVG fallback
    const surahFloralImg = document.getElementById('surah-floral-img');
    const floralSvg = document.querySelector('.surah .floral svg');
    if(surahFloralImg){
      if(data.surah && data.surah.floral){
        surahFloralImg.src = data.surah.floral;
        surahFloralImg.style.display = 'block';
        if(floralSvg) floralSvg.style.display = 'none';

        // Determine whether to invert the image colors.
        // `data.surah.floralInvert` may be true|false|'auto'. Default: 'auto'.
        const invertSetting = (data.surah && typeof data.surah.floralInvert !== 'undefined') ? data.surah.floralInvert : 'auto';

        function parseRGB(str){
          const nums = str.replace(/rgba?\(|\s|\)/g,'').split(',').map(n=>parseFloat(n)||0);
          return {r: nums[0], g: nums[1], b: nums[2]};
        }

        function luminance(c){
          // sRGB luminance
          const r = c.r/255, g = c.g/255, b = c.b/255;
          const Rs = r<=0.03928 ? r/12.92 : Math.pow((r+0.055)/1.055,2.4);
          const Gs = g<=0.03928 ? g/12.92 : Math.pow((g+0.055)/1.055,2.4);
          const Bs = b<=0.03928 ? b/12.92 : Math.pow((b+0.055)/1.055,2.4);
          return 0.2126*Rs + 0.7152*Gs + 0.0722*Bs;
        }

        function decideInvert(setting){
          if(setting === true || setting === 'true') return true;
          if(setting === false || setting === 'false') return false;
          // auto: try to parse background colors from computed style
          try{
            const el = document.querySelector('.surah');
            if(!el) return false;
            const bg = getComputedStyle(el).backgroundImage || getComputedStyle(el).background;
            // find rgb(...) occurrences
            const matches = String(bg).match(/rgb(a)?\([^\)]+\)/g);
            let colors = [];
            if(matches && matches.length){
              colors = matches.map(m => parseRGB(m));
            } else {
              // fallback to backgroundColor
              const bgc = getComputedStyle(el).backgroundColor;
              if(bgc && bgc.indexOf('rgb')!==-1) colors = [parseRGB(bgc)];
            }
            if(!colors.length) return false;
            const lums = colors.map(c => luminance(c));
            const avg = lums.reduce((a,b)=>a+b,0)/lums.length;
            // luminance ranges 0..1, threshold 0.5 (lower => dark background)
            return avg < 0.5;
          }catch(e){
            return false;
          }
        }

        const shouldInvert = decideInvert(invertSetting);
        if(shouldInvert) surahFloralImg.classList.add('invert'); else surahFloralImg.classList.remove('invert');

      } else {
        surahFloralImg.style.display = 'none';
        if(floralSvg) floralSvg.style.display = '';
      }
    }

    // Countdown to eventDate (if provided)
    function pad(n){ return String(n).padStart(2,'0'); }
    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMinutes = document.getElementById('cd-minutes');
    const cdSeconds = document.getElementById('cd-seconds');

    function updateCountdown(){
      if(!data.details || !data.details.eventDate) return;
      const target = new Date(data.details.eventDate);
      const now = new Date();
      let diff = Math.max(0, target - now);
      const s = Math.floor(diff/1000);
      const days = Math.floor(s/86400);
      const hours = Math.floor((s%86400)/3600);
      const minutes = Math.floor((s%3600)/60);
      const seconds = s%60;
      if(cdDays) cdDays.textContent = days;
      if(cdHours) cdHours.textContent = pad(hours);
      if(cdMinutes) cdMinutes.textContent = pad(minutes);
      if(cdSeconds) cdSeconds.textContent = pad(seconds);
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);

    await yieldToMain();

    // ── 4. COUPLE ──────────────────────────────────────────────────────────
    const coupleData = data.couple || {};
    const coupleTitleEl = document.querySelector('.couple-title');
    if(coupleTitleEl && coupleData.title){
      coupleTitleEl.textContent = coupleData.title;
    }

    const groomNameEl = document.getElementById('groom-name');
    const groomSubEl = document.getElementById('groom-sub');
    const groomDescEl = document.getElementById('groom-desc');
    const groomBtnEl = document.getElementById('groom-button');
    const groomBtnLabelEl = groomBtnEl ? groomBtnEl.querySelector('.ig-label') : null;
    if(groomNameEl) groomNameEl.textContent = data.groom.name || groomNameEl.textContent || '';
    if(groomSubEl) groomSubEl.textContent = data.groom.sub || groomSubEl.textContent || '';
    if(groomDescEl) groomDescEl.textContent = data.groom.desc || groomDescEl.textContent || '';
    if(groomBtnLabelEl) groomBtnLabelEl.textContent = data.groom.button || groomBtnLabelEl.textContent || '';
    if(groomBtnEl && data.groom.instagram) groomBtnEl.href = data.groom.instagram;

    const brideNameEl = document.getElementById('bride-name');
    const brideSubEl = document.getElementById('bride-sub');
    const brideDescEl = document.getElementById('bride-desc');
    const brideBtnEl = document.getElementById('bride-button');
    const brideBtnLabelEl = brideBtnEl ? brideBtnEl.querySelector('.ig-label') : null;
    if(brideNameEl) brideNameEl.textContent = data.bride.name || brideNameEl.textContent || '';
    if(brideSubEl) brideSubEl.textContent = data.bride.sub || brideSubEl.textContent || '';
    if(brideDescEl) brideDescEl.textContent = data.bride.desc || brideDescEl.textContent || '';
    if(brideBtnLabelEl) brideBtnLabelEl.textContent = data.bride.button || brideBtnLabelEl.textContent || '';
    if(brideBtnEl && data.bride.instagram) brideBtnEl.href = data.bride.instagram;

    // Avatars (use second/third images when available)
    const groomAvatar = document.getElementById('groom-avatar');
    const brideAvatar = document.getElementById('bride-avatar');
    const groomPhoto = data.groom && data.groom.photo ? data.groom.photo : '';
    const bridePhoto = data.bride && data.bride.photo ? data.bride.photo : '';
    if(groomPhoto || bridePhoto){
      if(groomAvatar && groomPhoto) groomAvatar.src = groomPhoto;
      if(brideAvatar && bridePhoto) brideAvatar.src = bridePhoto;
      if(groomAvatar && !groomPhoto) groomAvatar.style.display = 'none';
      if(brideAvatar && !bridePhoto) brideAvatar.style.display = 'none';
    } else if(imgs.length >= 2){
      groomAvatar.src = imagesBase + (imgs[1] || imgs[0]);
      brideAvatar.src = imagesBase + (imgs[2] || imgs[1] || imgs[0]);
    } else if(imgs.length === 1){
      groomAvatar.src = imagesBase + imgs[0];
      brideAvatar.src = imagesBase + imgs[0];
    } else {
      // hide avatars if none
      if(groomAvatar) groomAvatar.style.display = 'none';
      if(brideAvatar) brideAvatar.style.display = 'none';
    }

    await yieldToMain();

    // ── 5. EVENT DETAILS ───────────────────────────────────────────────────
    // Clear static HTML immediately to prevent akad flashing before async check resolves
    const detailsSection = document.getElementById('event-details');
    if(detailsSection) detailsSection.innerHTML = '';
    const guestEventVisibility = await loadGuestEventVisibilitySettings();
    if(detailsSection){
      const details = data.details || {};
      const allEvents = Array.isArray(details.events) ? details.events : [];
      const events = allEvents.filter((event, idx) => {
        const eventType = String(event && event.type ? event.type : '').trim().toLowerCase();
        const eventTitle = String(event && event.title ? event.title : '').trim().toLowerCase();
        const isAkadEvent = eventType === 'akad' || (!eventType && (idx === 0 || eventTitle.includes('akad')));
        // Akad is hidden by default; only shown when Google Sheet explicitly returns showAkad = true
        if(isAkadEvent && !guestEventVisibility.showAkad) return false;
        return true;
      });
      const defaultBadgeText = '';
      const defaultMapHeading = events[0]?.locationTitle || '';
      const defaultMapLocation = events.find(event => event?.location)?.location || '';
      const fallbackAlt = details.photoAlt || detailsSection.querySelector('.event-photo-main img')?.getAttribute('alt') || '';
      const fallbackMapEmbed = details.mapEmbed || events.find(event => event?.mapEmbed)?.mapEmbed || detailsSection.querySelector('.event-map-frame')?.getAttribute('src') || '';
      const badgeText = details.badgeText || defaultBadgeText;
      const mapHeadingText = details.mapHeading || defaultMapHeading;
      const mapLocationText = details.mapLocation || defaultMapLocation;

      detailsSection.innerHTML = '';

      events.forEach((event, idx) => {
        const card = document.createElement('article');
        const isFeatureEvent = idx === 0;
        const variantClass = idx === 0 ? 'event-card-feature' : 'event-card-standard';
        card.className = `event-card ${variantClass}`;

        const photoWrap = document.createElement('div');
        photoWrap.className = 'event-photo-wrap';

        if(isFeatureEvent){
          const badge = document.createElement('div');
          badge.className = 'event-badge';
          badge.textContent = badgeText;
          photoWrap.appendChild(badge);
        }

        const mainPhoto = document.createElement('div');
        mainPhoto.className = 'event-photo-main';
        const mainImg = document.createElement('img');
        mainImg.src = event.photo || '';
        mainImg.alt = event.photoAlt || fallbackAlt;
        mainPhoto.appendChild(mainImg);
        photoWrap.appendChild(mainPhoto);

        card.appendChild(photoWrap);

        const content = document.createElement('div');
        content.className = 'event-content';

        const title = document.createElement('h3');
        title.className = 'event-title';
        title.textContent = event.title || '';

        const date = document.createElement('p');
        date.className = 'event-date';
        date.textContent = event.date || '';

        const time = document.createElement('p');
        time.className = 'event-time';
        time.textContent = event.time || '';

        content.appendChild(title);
        content.appendChild(date);
        content.appendChild(time);

        card.appendChild(content);
        detailsSection.appendChild(card);
      });

      if(fallbackMapEmbed){
        const sharedMap = document.createElement('div');
        sharedMap.className = 'event-map-shared';

        if(mapHeadingText){
          const mapHeading = document.createElement('p');
          mapHeading.className = 'event-map-heading';
          mapHeading.textContent = mapHeadingText;
          sharedMap.appendChild(mapHeading);
        }

        if(mapLocationText){
          const mapLocation = document.createElement('p');
          mapLocation.className = 'event-map-location-name';
          mapLocation.textContent = mapLocationText;
          sharedMap.appendChild(mapLocation);
        }

        const mapFrameWrap = document.createElement('div');
        mapFrameWrap.className = 'event-map-frame-wrap';

        const mapFrame = document.createElement('iframe');
        mapFrame.className = 'event-map-frame';
        mapFrame.src = fallbackMapEmbed;
        mapFrame.title = 'Google Maps lokasi acara';
        mapFrame.loading = 'lazy';
        mapFrame.referrerPolicy = 'no-referrer-when-downgrade';
        mapFrame.allowFullscreen = true;

        mapFrameWrap.appendChild(mapFrame);
        sharedMap.appendChild(mapFrameWrap);
        detailsSection.appendChild(sharedMap);
      }
    }

    await yieldToMain();

    // ── 6. WEDDING GIFT ────────────────────────────────────────────────────
    const giftData = data.gift || {};
    const giftTitleEl = document.getElementById('gift-title');
    const giftDescEl = document.getElementById('gift-desc');
    const giftButtonEl = document.getElementById('gift-button');
    const giftButtonLabelEl = giftButtonEl ? giftButtonEl.querySelector('.gift-button-label') : null;
    const giftModalEl = document.getElementById('gift-modal');
    const giftModalCloseEl = document.getElementById('gift-modal-close');
    const giftModalTitleEl = document.getElementById('gift-modal-title');
    const giftModalDescEl = document.getElementById('gift-modal-desc');
    const giftModalAccountsEl = document.getElementById('gift-modal-accounts');
    const giftModalBodyEl = giftModalEl ? giftModalEl.querySelector('.gift-modal-body') : null;

    if(giftTitleEl) giftTitleEl.textContent = giftData.title || giftTitleEl.textContent || '';
    if(giftDescEl) giftDescEl.textContent = giftData.desc || giftDescEl.textContent || '';

    if(giftButtonLabelEl){
      giftButtonLabelEl.textContent = giftData.buttonText || giftButtonLabelEl.textContent || '';
    } else if(giftButtonEl){
      giftButtonEl.textContent = giftData.buttonText || giftButtonEl.textContent || '';
    }

    if(giftModalTitleEl) giftModalTitleEl.textContent = giftData.title || giftModalTitleEl.textContent || '';
    if(giftModalDescEl) giftModalDescEl.textContent = giftData.desc || giftModalDescEl.textContent || '';

    function normalizeGiftAccount(item){
      if(!item || typeof item !== 'object') return null;
      const bank = String(item.bank || item.bankName || '').trim();
      const account = String(item.account || item.accountNumber || '').trim();
      const owner = String(item.owner || item.holder || '').trim();
      const logo = String(item.logo || item.logoUrl || '').trim();
      const copyLabel = String(item.copyLabel || '').trim();
      if(!bank && !account && !owner) return null;
      return { bank, account, owner, logo, copyLabel };
    }

    function getGiftAccounts(){
      const configuredAccounts = Array.isArray(giftData.accounts)
        ? giftData.accounts.map(normalizeGiftAccount).filter(Boolean)
        : [];

      if(configuredAccounts.length) return configuredAccounts;

      const fallbackAccount = normalizeGiftAccount({
        bank: giftData.bank,
        account: giftData.account,
        owner: giftData.owner,
        logo: giftData.logo,
        copyLabel: giftData.copyLabel
      });

      return fallbackAccount ? [fallbackAccount] : [];
    }

    function extractCopyValue(value){
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    async function writeTextToClipboard(text){
      const value = String(text || '');
      if(!value) return false;

      if(navigator.clipboard && window.isSecureContext){
        try{
          await navigator.clipboard.writeText(value);
          return true;
        }catch(error){
          // fallback below
        }
      }

      try{
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.setAttribute('readonly', 'readonly');
        helper.style.position = 'fixed';
        helper.style.top = '-9999px';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.focus();
        helper.select();
        helper.setSelectionRange(0, helper.value.length);
        const copied = document.execCommand('copy');
        helper.remove();
        return Boolean(copied);
      }catch(error){
        return false;
      }
    }

    async function copyGiftAccountNumber(accountNumber, triggerEl){
      const numberToCopy = extractCopyValue(accountNumber);
      if(!numberToCopy || !triggerEl) return;

      const initialLabel = triggerEl.textContent;
      try{
        const copied = await writeTextToClipboard(numberToCopy);
        if(!copied) throw new Error('copy-failed');
        triggerEl.textContent = 'Tersalin';
      }catch(error){
        triggerEl.textContent = 'Gagal';
      }finally{
        window.setTimeout(() => {
          triggerEl.textContent = initialLabel;
        }, 1400);
      }
    }

    function createGiftCard(accountData){
      const card = document.createElement('article');
      card.className = 'gift-bank-card';

      const cardTop = document.createElement('div');
      cardTop.className = 'gift-bank-card-top';

      if(accountData.logo){
        const logo = document.createElement('img');
        logo.className = 'gift-bank-logo-image';
        logo.src = accountData.logo;
        logo.alt = accountData.bank ? `${accountData.bank} logo` : 'Bank logo';
        cardTop.appendChild(logo);
      }else if(accountData.bank){
        const bankTag = document.createElement('p');
        bankTag.className = 'gift-bank-name';
        bankTag.textContent = accountData.bank;
        cardTop.appendChild(bankTag);
      }

      card.appendChild(cardTop);

      const ownerText = String(accountData.owner || '').trim() || '-';

      const owner = document.createElement('p');
      owner.className = 'gift-bank-owner';
      owner.textContent = ownerText;
      card.appendChild(owner);

      const number = document.createElement('p');
      number.className = 'gift-bank-number';
      number.textContent = accountData.account || '-';
      card.appendChild(number);

      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'gift-bank-copy';
      copyButton.textContent = accountData.copyLabel || 'Salin Nomor';
      copyButton.addEventListener('click', () => {
        copyGiftAccountNumber(accountData.account, copyButton);
      });
      card.appendChild(copyButton);

      return card;
    }

    function renderGiftAccounts(){
      if(!giftModalAccountsEl) return;
      giftModalAccountsEl.innerHTML = '';

      const accounts = getGiftAccounts();
      if(!accounts.length) return;

      accounts.forEach((accountData) => {
        giftModalAccountsEl.appendChild(createGiftCard(accountData));
      });

      updateGiftModalLayout();
    }

    function updateGiftModalLayout(){
      if(!giftModalBodyEl) return;

      const hasAccounts = !!(giftModalAccountsEl && giftModalAccountsEl.childElementCount);
      const giftModalAddressEl = document.getElementById('gift-modal-address');
      const hasAddress = !!(giftModalAddressEl && giftModalAddressEl.childElementCount);

      giftModalBodyEl.classList.toggle('is-single-column', hasAccounts && !hasAddress);
    }

    function createGiftAddressCard(addressData){
      const card = document.createElement('article');
      card.className = 'gift-bank-card gift-address-card';

      const iconWrap = document.createElement('div');
      iconWrap.className = 'gift-address-icon';
      iconWrap.setAttribute('aria-hidden', 'true');
      iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12V22H4V12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 7H2V12H22V7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      card.appendChild(iconWrap);

      const title = document.createElement('p');
      title.className = 'gift-address-title';
      title.textContent = 'Kirim Hadiah';
      card.appendChild(title);

      const recipient = document.createElement('p');
      recipient.className = 'gift-address-recipient';
      recipient.textContent = addressData.recipient || '';
      recipient.style.display = (addressData.recipient || '').trim() ? '' : 'none';
      card.appendChild(recipient);

      const address = document.createElement('p');
      address.className = 'gift-address-text';
      address.textContent = addressData.text || '-';
      card.appendChild(address);

      return card;
    }

    function renderGiftAddress(){
      const giftModalAddressEl = document.getElementById('gift-modal-address');
      if(!giftModalAddressEl) return;
      giftModalAddressEl.innerHTML = '';

      const addressData = giftData.address;
      if(!addressData || (!addressData.recipient && !addressData.text)){
        updateGiftModalLayout();
        return;
      }

      giftModalAddressEl.appendChild(createGiftAddressCard(addressData));
      updateGiftModalLayout();
    }

    renderGiftAccounts();
    renderGiftAddress();

    function openGiftModal(){
      if(!giftModalEl) return;
      giftModalEl.classList.add('is-open');
      giftModalEl.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeGiftModal(){
      if(!giftModalEl) return;
      giftModalEl.classList.remove('is-open');
      giftModalEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if(giftButtonEl){
      giftButtonEl.addEventListener('click', (event) => {
        event.preventDefault();
        openGiftModal();
      });
    }

    if(giftModalCloseEl){
      giftModalCloseEl.addEventListener('click', closeGiftModal);
    }

    if(giftModalEl){
      giftModalEl.addEventListener('click', (event) => {
        if(event.target === giftModalEl) closeGiftModal();
      });
    }

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && giftModalEl && giftModalEl.classList.contains('is-open')){
        closeGiftModal();
      }
    });

    await yieldToMain();

    // ── 7. RSVP / WISHES ───────────────────────────────────────────────────
    const rsvpData = data.rsvp || {};
    const rsvpHeadingEl = document.getElementById('rsvp-heading');
    const rsvpNoteEl = document.getElementById('rsvp-note');
    const rsvpCoverEl = document.getElementById('rsvp-cover');
    const rsvpCommentsEl = document.getElementById('rsvp-comments');
    const rsvpFormEl = document.getElementById('rsvp-form');
    const rsvpNameEl = document.getElementById('rsvp-name');
    const rsvpMessageEl = document.getElementById('rsvp-message');
    const rsvpAttendanceEl = document.getElementById('rsvp-attendance');
    const rsvpAttendanceCountEl = document.getElementById('rsvp-attendance-count');
    const rsvpSubmitEl = document.getElementById('rsvp-button');
    const rsvpFeedbackEl = document.getElementById('rsvp-feedback');
    const rsvpModalEl = document.getElementById('rsvp-modal');
    const rsvpModalCloseEl = document.getElementById('rsvp-modal-close');
    const rsvpModalLoadingEl = document.getElementById('rsvp-modal-loading');
    const rsvpModalResultEl = document.getElementById('rsvp-modal-result');
    const rsvpModalTitleEl = document.getElementById('rsvp-modal-title');
    const rsvpModalMessageEl = document.getElementById('rsvp-modal-message');
    const rsvpModalIconEl = document.getElementById('rsvp-modal-icon');
    const rsvpSheetWebhook = (rsvpData.googleSheetWebhook || '').trim();
    const rsvpSheetReadUrl = (rsvpData.googleSheetReadUrl || rsvpSheetWebhook || '').trim();
    const rsvpSuccessText = rsvpData.successText || '';
    const rsvpSheetFailText = rsvpData.sheetFailText || '';
    const guestMaxAttendance = Number.isFinite(Number(guestEventVisibility && guestEventVisibility.maxAttendance))
      ? Math.max(1, Math.floor(Number(guestEventVisibility.maxAttendance)))
      : 2;

    if(rsvpHeadingEl) rsvpHeadingEl.textContent = rsvpData.heading || rsvpHeadingEl.textContent || '';
    if(rsvpNoteEl) rsvpNoteEl.textContent = rsvpData.note || rsvpNoteEl.textContent || '';
    if(rsvpSubmitEl) rsvpSubmitEl.textContent = rsvpData.buttonText || rsvpSubmitEl.textContent || '';
    if(rsvpNameEl && guestFromQuery){
      rsvpNameEl.value = guestName || '';
    }
    if(rsvpAttendanceCountEl){
      rsvpAttendanceCountEl.max = String(guestMaxAttendance);
      rsvpAttendanceCountEl.placeholder = `Jumlah Kehadiran (maks. ${guestMaxAttendance})`;
    }

    const fallbackCover = (imgs.length && data.preweding && data.preweding.images)
      ? `${data.preweding.images}${imgs[0]}`
      : '';
    if(rsvpCoverEl){
      const cover = rsvpData.cover || fallbackCover;
      if(cover){
        rsvpCoverEl.src = cover;
      } else {
        rsvpCoverEl.style.display = 'none';
      }
    }

    const commentsState = Array.isArray(rsvpData.comments) ? [...rsvpData.comments] : [];
    const guestFallbackName = invitationData.guestDefault || (invitationGuestNameEl ? invitationGuestNameEl.textContent : '') || '';
    let commentsCurrentPage = 1;
    let commentsPagerEl = null;
    let commentsPrevBtnEl = null;
    let commentsNextBtnEl = null;
    let commentsPageInfoEl = null;

    if(rsvpCommentsEl){
      const configuredCommentsFrameHeight = Number(rsvpData.commentsFrameHeight);
      if(Number.isFinite(configuredCommentsFrameHeight) && configuredCommentsFrameHeight >= 180){
        rsvpCommentsEl.style.setProperty('--rsvp-comments-frame-height', `${Math.floor(configuredCommentsFrameHeight)}px`);
      }

      commentsPagerEl = document.createElement('div');
      commentsPagerEl.className = 'rsvp-comments-pagination';

      commentsPrevBtnEl = document.createElement('button');
      commentsPrevBtnEl.type = 'button';
      commentsPrevBtnEl.className = 'rsvp-comments-page-btn';
      const commentsPrevIconEl = document.createElement('span');
      commentsPrevIconEl.className = 'rsvp-comments-page-icon';
      commentsPrevIconEl.textContent = '<';
      commentsPrevBtnEl.appendChild(commentsPrevIconEl);

      commentsPageInfoEl = document.createElement('p');
      commentsPageInfoEl.className = 'rsvp-comments-page-info';

      commentsNextBtnEl = document.createElement('button');
      commentsNextBtnEl.type = 'button';
      commentsNextBtnEl.className = 'rsvp-comments-page-btn';
      const commentsNextIconEl = document.createElement('span');
      commentsNextIconEl.className = 'rsvp-comments-page-icon';
      commentsNextIconEl.textContent = '>';
      commentsNextBtnEl.appendChild(commentsNextIconEl);

      commentsPagerEl.appendChild(commentsPrevBtnEl);
      commentsPagerEl.appendChild(commentsPageInfoEl);
      commentsPagerEl.appendChild(commentsNextBtnEl);

      if(rsvpCommentsEl.parentNode){
        rsvpCommentsEl.parentNode.insertBefore(commentsPagerEl, rsvpCommentsEl.nextSibling);
      }
    }

    function normalizeSheetComment(item){
      if(!item) return null;

      if(Array.isArray(item)){
        const name = String(item[2] || item[0] || '').trim();
        const message = String(item[3] || item[1] || '').trim();
        const attendance = String(item[4] || '').trim();
        const attendanceCount = String(item[5] || '').trim();
        if(!name && !message) return null;
        return { name: name || guestFallbackName, message, attendance, attendanceCount };
      }

      const name = String(item.name || item.nama || '').trim();
      const message = String(item.message || item.ucapan || '').trim();
      const attendance = String(item.attendance || item.kehadiran || '').trim();
      const attendanceCount = String(item.attendance_count || item.attendanceCount || item.jumlah || '').trim();
      if(!name && !message) return null;
      return { name: name || guestFallbackName, message, attendance, attendanceCount };
    }

    function normalizeSheetComments(payload){
      let source = [];
      if(Array.isArray(payload)) source = payload;
      else if(payload && Array.isArray(payload.comments)) source = payload.comments;
      else if(payload && Array.isArray(payload.data)) source = payload.data;
      else if(payload && Array.isArray(payload.rows)) source = payload.rows;

      return source
        .map(normalizeSheetComment)
        .filter(Boolean);
    }

    function buildRsvpCommentItem(comment){
      const item = document.createElement('article');
      item.className = 'rsvp-comment-item';

      const name = document.createElement('h4');
      name.className = 'rsvp-comment-name';
      name.textContent = comment.name || guestFallbackName;

      const message = document.createElement('p');
      message.className = 'rsvp-comment-message';
      message.textContent = comment.message || '';

      item.appendChild(name);
      item.appendChild(message);
      return item;
    }

    function getRsvpCommentsMaxHeight(){
      if(!rsvpCommentsEl) return 320;

      const computedMaxHeight = parseFloat(getComputedStyle(rsvpCommentsEl).maxHeight);
      if(Number.isFinite(computedMaxHeight) && computedMaxHeight > 0) return computedMaxHeight;

      const rawMax = getComputedStyle(rsvpCommentsEl).getPropertyValue('--rsvp-comments-frame-height');
      const parsed = parseFloat(String(rawMax || '').replace('px', '').trim());
      if(Number.isFinite(parsed) && parsed > 0) return parsed;

      return 320;
    }

    function paginateRsvpComments(frameHeight){
      if(!rsvpCommentsEl || !commentsState.length) return [];

      const safeFrameHeight = Number(frameHeight);
      if(!Number.isFinite(safeFrameHeight) || safeFrameHeight <= 0){
        return [commentsState.slice()];
      }

      const pages = [];
      let currentPage = [];

      rsvpCommentsEl.innerHTML = '';

      commentsState.forEach((comment) => {
        const item = buildRsvpCommentItem(comment);
        rsvpCommentsEl.appendChild(item);

        if(rsvpCommentsEl.scrollHeight <= safeFrameHeight){
          currentPage.push(comment);
          return;
        }

        item.remove();

        if(!currentPage.length){
          pages.push([comment]);
          rsvpCommentsEl.innerHTML = '';
          return;
        }

        pages.push(currentPage);
        currentPage = [comment];

        rsvpCommentsEl.innerHTML = '';
        const carryItem = buildRsvpCommentItem(comment);
        rsvpCommentsEl.appendChild(carryItem);
        if(rsvpCommentsEl.scrollHeight > safeFrameHeight){
          pages.push(currentPage);
          currentPage = [];
          rsvpCommentsEl.innerHTML = '';
        }
      });

      if(currentPage.length){
        pages.push(currentPage);
      }

      rsvpCommentsEl.innerHTML = '';
      return pages;
    }

    function updateRsvpCommentsPager(totalPages){
      if(!commentsPagerEl || !commentsPrevBtnEl || !commentsNextBtnEl || !commentsPageInfoEl) return;
      const hasMultiplePages = totalPages > 1;
      commentsPagerEl.style.display = hasMultiplePages ? 'flex' : 'none';
      commentsPageInfoEl.textContent = `${commentsCurrentPage}/${totalPages}`;
      commentsPrevBtnEl.disabled = commentsCurrentPage <= 1;
      commentsNextBtnEl.disabled = commentsCurrentPage >= totalPages;
    }

    function renderRsvpComments(options = {}){
      if(!rsvpCommentsEl) return;
      if(options.resetPage) commentsCurrentPage = 1;
      rsvpCommentsEl.innerHTML = '';

      if(!commentsState.length){
        rsvpCommentsEl.classList.add('is-empty');
        rsvpCommentsEl.style.height = '0px';
        updateRsvpCommentsPager(1);
        return;
      }

      rsvpCommentsEl.classList.remove('is-empty');

      const maxFrameHeight = getRsvpCommentsMaxHeight();
      const commentPages = paginateRsvpComments(maxFrameHeight);
      const totalPages = Math.max(1, commentPages.length || 1);
      if(commentsCurrentPage > totalPages) commentsCurrentPage = totalPages;

      rsvpCommentsEl.innerHTML = '';
      const visibleComments = commentPages[commentsCurrentPage - 1] || [];

      visibleComments.forEach((comment) => {
        rsvpCommentsEl.appendChild(buildRsvpCommentItem(comment));
      });

      rsvpCommentsEl.style.height = `${maxFrameHeight}px`;

      updateRsvpCommentsPager(totalPages);
    }

    let rsvpCommentsResizeRaf = null;
    function queueRsvpCommentsRender(){
      if(rsvpCommentsResizeRaf !== null) cancelAnimationFrame(rsvpCommentsResizeRaf);
      rsvpCommentsResizeRaf = requestAnimationFrame(() => {
        rsvpCommentsResizeRaf = null;
        renderRsvpComments();
      });
    }

    if(commentsPrevBtnEl){
      commentsPrevBtnEl.addEventListener('click', () => {
        if(commentsCurrentPage <= 1) return;
        commentsCurrentPage -= 1;
        renderRsvpComments();
      });
    }

    if(commentsNextBtnEl){
      commentsNextBtnEl.addEventListener('click', () => {
        commentsCurrentPage += 1;
        renderRsvpComments();
      });
    }

    window.addEventListener('resize', queueRsvpCommentsRender);

    if(typeof ResizeObserver !== 'undefined' && rsvpCommentsEl && rsvpCommentsEl.parentElement){
      const rsvpCommentsFrameObserver = new ResizeObserver(() => {
        queueRsvpCommentsRender();
      });
      rsvpCommentsFrameObserver.observe(rsvpCommentsEl.parentElement);
    }

    renderRsvpComments({ resetPage: true });

    async function loadRsvpCommentsFromGoogleSheet(){
      if(!rsvpSheetReadUrl) return;

      try{
        const readUrl = new URL(rsvpSheetReadUrl);
        if(!readUrl.searchParams.has('action')) readUrl.searchParams.set('action', 'list');
        if(!readUrl.searchParams.has('limit')) readUrl.searchParams.set('limit', '50');

        const response = await fetch(readUrl.toString(), {
          method: 'GET',
          cache: 'no-store'
        });

        if(!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const remoteComments = normalizeSheetComments(payload);
        if(!remoteComments.length) return;

        commentsState.splice(0, commentsState.length, ...remoteComments);
        renderRsvpComments({ resetPage: true });
      }catch(error){
        console.error('Failed reading RSVP comments from Google Sheet', error);
      }
    }

    await loadRsvpCommentsFromGoogleSheet();

    function setRsvpFeedback(type, text){
      if(!rsvpFeedbackEl) return;
      rsvpFeedbackEl.textContent = text || '';
      rsvpFeedbackEl.classList.remove('is-success', 'is-error');
      if(type === 'success') rsvpFeedbackEl.classList.add('is-success');
      if(type === 'error') rsvpFeedbackEl.classList.add('is-error');
    }

    function countWords(value){
      const text = String(value || '').trim();
      if(!text) return 0;
      return text.split(/\s+/).length;
    }

    function trimToMaxWords(value, maxWords){
      const words = String(value || '').trim().split(/\s+/).filter(Boolean);
      return words.slice(0, maxWords).join(' ');
    }

    function syncAttendanceCountField(){
      if(!rsvpAttendanceEl || !rsvpAttendanceCountEl) return;
      const attendance = rsvpAttendanceEl.value;

      if(attendance === 'Hadir'){
        rsvpAttendanceCountEl.disabled = false;
        rsvpAttendanceCountEl.required = true;
        rsvpAttendanceCountEl.min = '1';
        rsvpAttendanceCountEl.max = String(guestMaxAttendance);
        if(!rsvpAttendanceCountEl.value || Number(rsvpAttendanceCountEl.value) < 1){
          rsvpAttendanceCountEl.value = '1';
        }
        if(Number(rsvpAttendanceCountEl.value) > guestMaxAttendance){
          rsvpAttendanceCountEl.value = String(guestMaxAttendance);
        }
        return;
      }

      if(attendance === 'Tidak Hadir'){
        rsvpAttendanceCountEl.value = '0';
      } else {
        rsvpAttendanceCountEl.value = '';
      }
      rsvpAttendanceCountEl.disabled = true;
      rsvpAttendanceCountEl.required = false;
    }

    async function submitRsvpToGoogleSheet(payload){
      if(!rsvpSheetWebhook) return true;
      try{
        const body = new URLSearchParams(payload).toString();
        await fetch(rsvpSheetWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body
        });
        return true;
      }catch(error){
        console.error('Failed sending RSVP to Google Sheet', error);
        return false;
      }
    }

    if(rsvpAttendanceEl && rsvpAttendanceCountEl){
      syncAttendanceCountField();
      rsvpAttendanceEl.addEventListener('change', syncAttendanceCountField);
    }

    let rsvpModalCanClose = false;

    function openRsvpModal(state, titleText, messageText){
      if(!rsvpModalEl) return;
      rsvpModalCanClose = state !== 'loading';
      if(rsvpModalCloseEl) rsvpModalCloseEl.style.display = rsvpModalCanClose ? '' : 'none';
      if(rsvpModalLoadingEl) rsvpModalLoadingEl.style.display = state === 'loading' ? '' : 'none';
      if(rsvpModalResultEl) rsvpModalResultEl.style.display = state !== 'loading' ? '' : 'none';
      if(state !== 'loading'){
        if(rsvpModalIconEl) rsvpModalIconEl.className = 'rsvp-modal-icon' + (state === 'success' ? ' is-success' : ' is-error');
        if(rsvpModalTitleEl) rsvpModalTitleEl.textContent = titleText || '';
        if(rsvpModalMessageEl) rsvpModalMessageEl.textContent = messageText || '';
      }
      rsvpModalEl.classList.add('is-open');
      rsvpModalEl.setAttribute('aria-hidden', 'false');
    }

    function closeRsvpModal(){
      if(!rsvpModalEl || !rsvpModalCanClose) return;
      rsvpModalEl.classList.remove('is-open');
      rsvpModalEl.setAttribute('aria-hidden', 'true');
    }

    if(rsvpModalCloseEl) rsvpModalCloseEl.addEventListener('click', closeRsvpModal);
    if(rsvpModalEl) rsvpModalEl.addEventListener('click', (e) => { if(e.target === rsvpModalEl) closeRsvpModal(); });

    if(rsvpMessageEl){
      rsvpMessageEl.addEventListener('input', () => {
        const trimmed = trimToMaxWords(rsvpMessageEl.value, 50);
        if(trimmed !== rsvpMessageEl.value.trim()){
          rsvpMessageEl.value = trimmed;
        }
      });
    }

    if(rsvpFormEl && rsvpNameEl && rsvpMessageEl && rsvpAttendanceEl){
      rsvpFormEl.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = rsvpNameEl.value.trim();
        const message = rsvpMessageEl.value.trim();
        const attendance = rsvpAttendanceEl.value;
        if(!name || !message || !attendance) return;

        const messageWordCount = countWords(message);
        if(messageWordCount > 50){
          setRsvpFeedback('error', 'Ucapan maksimal 50 kata.');
          return;
        }

        let attendanceCount = 0;
        if(attendance === 'Hadir'){
          attendanceCount = parseInt(rsvpAttendanceCountEl ? rsvpAttendanceCountEl.value : '', 10);
          if(Number.isNaN(attendanceCount) || attendanceCount < 1 || attendanceCount > guestMaxAttendance){
            setRsvpFeedback('error', `Jumlah kehadiran harus antara 1 sampai ${guestMaxAttendance}.`);
            return;
          }
        }

        setRsvpFeedback('', '');
        if(rsvpSubmitEl) rsvpSubmitEl.disabled = true;
        openRsvpModal('loading');

        const submittedAt = new Date().toISOString();
        const invitedGuestName = guestName || '';
        const sheetSaved = await submitRsvpToGoogleSheet({
          timestamp: submittedAt,
          name,
          message,
          attendance,
          attendance_count: String(attendanceCount),
          guest_name: invitedGuestName,
          invited_to: invitedGuestName,
          page: window.location.href,
          user_agent: navigator.userAgent
        });

        commentsState.unshift({
          name,
          message,
          attendance,
          attendanceCount,
          time: 'Baru saja'
        });

        rsvpFormEl.reset();
        syncAttendanceCountField();
        renderRsvpComments({ resetPage: true });

        if(rsvpSubmitEl) rsvpSubmitEl.disabled = false;

        if(rsvpSheetWebhook && !sheetSaved){
          setRsvpFeedback('error', rsvpSheetFailText);
          openRsvpModal('error', 'Oops!', rsvpSheetFailText || 'Gagal mengirim. Silakan coba lagi.');
          return;
        }

        setRsvpFeedback('success', rsvpSuccessText);
        openRsvpModal('success', 'Terima Kasih!', rsvpSuccessText || 'Ucapan dan konfirmasi kehadiran Anda telah kami terima.');
      });
    }

    await yieldToMain();

    // ── 8. PREWEDDING GALLERY ──────────────────────────────────────────────
    document.getElementById('prewedding-title').textContent = data.preweding.title || document.getElementById('prewedding-title').textContent || '';
    const videoSrc = data.preweding.video || '';
    const videoPoster = data.preweding.videoPoster || '';
    const v = document.getElementById('prewedding-video');
    const s = document.getElementById('prewedding-video-src');
    const overlayPlayBtn = document.getElementById('prewedding-video-overlay');
    let galleryVideoHasStarted = false;
    const overlayPlayIcon = '▶';
    const galleryPrevIcon = (data.preweding && data.preweding.prevIcon) ? data.preweding.prevIcon : '‹';
    const galleryNextIcon = (data.preweding && data.preweding.nextIcon) ? data.preweding.nextIcon : '›';
    if(v) v.preload = 'none';

    function setOverlayPlayVisibility(show, pulse){
      if(!overlayPlayBtn) return;
      overlayPlayBtn.classList.toggle('is-hidden', !show);
      overlayPlayBtn.classList.toggle('is-pulsing', Boolean(show && pulse));
      overlayPlayBtn.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    function setOverlayPlayIcon(){
      if(!overlayPlayBtn) return;
      const iconEl = overlayPlayBtn.querySelector('.prewedding-video-overlay-icon');
      if(iconEl){
        iconEl.textContent = overlayPlayIcon;
      } else {
        overlayPlayBtn.textContent = overlayPlayIcon;
      }
    }

    function syncGalleryVideoUi(){
      if(!v) return;
      const showOverlay = !galleryVideoHasStarted;
      v.controls = galleryVideoHasStarted;
      setOverlayPlayVisibility(showOverlay, showOverlay);
    }

    function ensureGalleryVideoLoaded(){
      if(!videoSrc || !v || !s) return false;
      if(s.dataset.loaded === 'true') return false;
      s.src = videoSrc;
      s.dataset.loaded = 'true';
      v.load();
      return true;
    }

    if(v && s && videoSrc){
      syncGalleryVideoUi();

      function playGalleryVideo(){
        const playPromise = v.play();
        if(playPromise && typeof playPromise.catch === 'function'){
          playPromise.catch(() => {});
        }
      }

      v.addEventListener('click', () => {
        if(s.dataset.loaded !== 'true') return;
        if(!v.paused && !v.ended){
          v.pause();
          return;
        }
        playGalleryVideo();
      });

      if(overlayPlayBtn){
        overlayPlayBtn.addEventListener('click', () => {
          ensureGalleryVideoLoaded();
          playGalleryVideo();
        });
      }

      v.addEventListener('play', () => {
        galleryVideoHasStarted = true;
        setOverlayPlayIcon();
        syncGalleryVideoUi();
        // Pause background music while gallery video plays
        const bgMusic = document.getElementById('bg-music');
        if(bgMusic && !bgMusic.paused) bgMusic.pause();
      });
      v.addEventListener('pause', () => {
        setOverlayPlayIcon();
        syncGalleryVideoUi();
        // Resume background music when gallery video is paused (unless muted)
        const bgMusic = document.getElementById('bg-music');
        if(bgMusic && bgMusic.paused && !bgMusic.muted) bgMusic.play().catch(() => {});
      });
      v.addEventListener('ended', () => {
        setOverlayPlayIcon();
        syncGalleryVideoUi();
        // Resume background music when gallery video ends (unless muted)
        const bgMusic = document.getElementById('bg-music');
        if(bgMusic && bgMusic.paused && !bgMusic.muted) bgMusic.play().catch(() => {});
      });

      setOverlayPlayIcon();
      syncGalleryVideoUi();
    } else {
      setOverlayPlayVisibility(false, false);
    }

    if(videoPoster && v){ v.setAttribute('poster', videoPoster); }

    // Gallery
    let galleryLightbox = document.getElementById('gallery-lightbox');
    let galleryLightboxImage = document.getElementById('gallery-lightbox-image');
    let galleryItems = [];
    let galleryCurrentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    if(!galleryLightbox){
      galleryLightbox = document.createElement('div');
      galleryLightbox.id = 'gallery-lightbox';
      galleryLightbox.className = 'gallery-lightbox';
      galleryLightbox.setAttribute('aria-hidden', 'true');

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'gallery-lightbox-close';
      closeBtn.setAttribute('aria-label', 'Tutup foto');
      closeBtn.textContent = '×';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'gallery-lightbox-nav gallery-lightbox-prev';
      prevBtn.setAttribute('aria-label', 'Foto sebelumnya');
      const prevBtnIcon = document.createElement('span');
      prevBtnIcon.className = 'gallery-lightbox-nav-icon';
      prevBtnIcon.textContent = galleryPrevIcon;
      prevBtn.appendChild(prevBtnIcon);

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'gallery-lightbox-nav gallery-lightbox-next';
      nextBtn.setAttribute('aria-label', 'Foto berikutnya');
      const nextBtnIcon = document.createElement('span');
      nextBtnIcon.className = 'gallery-lightbox-nav-icon';
      nextBtnIcon.textContent = galleryNextIcon;
      nextBtn.appendChild(nextBtnIcon);

      galleryLightboxImage = document.createElement('img');
      galleryLightboxImage.id = 'gallery-lightbox-image';
      galleryLightboxImage.className = 'gallery-lightbox-image';
      galleryLightboxImage.alt = '';

      galleryLightbox.appendChild(closeBtn);
      galleryLightbox.appendChild(prevBtn);
      galleryLightbox.appendChild(nextBtn);
      galleryLightbox.appendChild(galleryLightboxImage);
      document.body.appendChild(galleryLightbox);

      function closeGalleryLightbox(){
        galleryLightbox.classList.remove('is-open');
        galleryLightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      function showGalleryItem(index){
        if(!galleryItems.length || !galleryLightboxImage) return;
        const max = galleryItems.length;
        galleryCurrentIndex = ((index % max) + max) % max;
        const current = galleryItems[galleryCurrentIndex];
        galleryLightboxImage.src = current.src;
        galleryLightboxImage.alt = current.alt || '';
      }

      closeBtn.addEventListener('click', () => {
        closeGalleryLightbox();
      });

      prevBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        showGalleryItem(galleryCurrentIndex - 1);
      });

      nextBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        showGalleryItem(galleryCurrentIndex + 1);
      });

      galleryLightbox.addEventListener('click', (event) => {
        if(event.target === galleryLightbox){
          closeGalleryLightbox();
        }
      });

      galleryLightbox.addEventListener('touchstart', (event) => {
        if(!event.changedTouches || !event.changedTouches.length) return;
        touchStartX = event.changedTouches[0].clientX;
      }, { passive: true });

      galleryLightbox.addEventListener('touchend', (event) => {
        if(!event.changedTouches || !event.changedTouches.length) return;
        touchEndX = event.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        const swipeThreshold = 40;
        if(Math.abs(deltaX) < swipeThreshold) return;
        if(deltaX < 0) showGalleryItem(galleryCurrentIndex + 1);
        if(deltaX > 0) showGalleryItem(galleryCurrentIndex - 1);
      }, { passive: true });

      document.addEventListener('keydown', (event) => {
        if(event.key === 'Escape' && galleryLightbox.classList.contains('is-open')){
          closeGalleryLightbox();
        }
        if(event.key === 'ArrowLeft' && galleryLightbox.classList.contains('is-open')){
          showGalleryItem(galleryCurrentIndex - 1);
        }
        if(event.key === 'ArrowRight' && galleryLightbox.classList.contains('is-open')){
          showGalleryItem(galleryCurrentIndex + 1);
        }
      });

      galleryLightbox.showGalleryItem = showGalleryItem;
    }

    function openGalleryLightbox(index){
      if(!galleryLightbox || !galleryLightboxImage || !galleryItems.length) return;
      galleryCurrentIndex = index;
      if(typeof galleryLightbox.showGalleryItem === 'function'){
        galleryLightbox.showGalleryItem(index);
      }
      galleryLightbox.classList.add('is-open');
      galleryLightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    const gallery = document.getElementById('gallery');
    if(gallery && imgs.length){
      gallery.innerHTML = '';
      const galleryColumns = Array.from({ length: 3 }, () => {
        const column = document.createElement('div');
        column.className = 'gallery-column';
        gallery.appendChild(column);
        return column;
      });

      function getGalleryFrameMetrics(){
        const sampleColumn = galleryColumns[0];
        if(!sampleColumn) return {
          portraitWeight: 4 / 3,
          landscapeWeight: 2 / 3,
          portraitHeight: 0,
          landscapeHeight: 0
        };

        const columnStyles = getComputedStyle(sampleColumn);
        const rowGap = parseFloat(columnStyles.rowGap || columnStyles.gap || '0') || 0;
        const columnWidth = sampleColumn.clientWidth || sampleColumn.getBoundingClientRect().width || 0;
        const portraitWeight = 4 / 3;
        const portraitHeight = columnWidth * portraitWeight;
        const landscapeHeight = Math.max(0, (portraitHeight - rowGap) / 2);
        const landscapeWeight = columnWidth > 0 ? (landscapeHeight / columnWidth) : (2 / 3);

        return {
          portraitWeight,
          landscapeWeight,
          portraitHeight,
          landscapeHeight
        };
      }

      function applyGalleryFrameHeights(){
        const metrics = getGalleryFrameMetrics();
        gallery.querySelectorAll('.gallery-item-portrait').forEach((item) => {
          item.style.height = `${metrics.portraitHeight}px`;
        });
        gallery.querySelectorAll('.gallery-item-landscape').forEach((item) => {
          item.style.height = `${metrics.landscapeHeight}px`;
        });
      }

      const thumbsBase = (data.preweding && data.preweding.thumbs)
        ? data.preweding.thumbs
        : imagesBase.replace('/prewedding/', '/thumbs/prewedding/');

      const configuredSameColumnGroups = Array.isArray(data.preweding?.sameColumnGroups)
        ? data.preweding.sameColumnGroups
        : [];
      const fallbackSameColumnPhotos = Array.isArray(data.preweding?.sameColumnPhotos)
        ? [data.preweding.sameColumnPhotos]
        : [];
      const sameColumnGroups = configuredSameColumnGroups.length ? configuredSameColumnGroups : fallbackSameColumnPhotos;

      const filenameToGroup = new Map();
      sameColumnGroups.forEach((group, groupIndex) => {
        if(!Array.isArray(group)) return;
        group.forEach((name) => {
          const normalized = String(name || '').trim().toLowerCase();
          if(normalized) filenameToGroup.set(normalized, groupIndex);
        });
      });

      const assignedColumnByGroup = new Map();

      galleryItems = imgs.map(name => ({
        name,
        nameLower: String(name || '').trim().toLowerCase(),
        src: imagesBase + name,
        thumbSrc: thumbsBase + name,
        alt: data.preweding.alt || ''
      }));

      const galleryColumnState = galleryColumns.map((column, columnIndex) => ({
        columnIndex,
        element: column,
        heightScore: 0,
        count: 0
      }));

      const galleryFrameMetrics = getGalleryFrameMetrics();

      function loadGalleryMeta(entry){
        return new Promise((resolve) => {
          const probe = new Image();
          let resolved = false;

          function done(width, height){
            if(resolved) return;
            resolved = true;
            const isLandscape = width > height;
            const heightWeight = isLandscape ? galleryFrameMetrics.landscapeWeight : galleryFrameMetrics.portraitWeight;
            resolve({
              ...entry,
              width,
              height,
              isLandscape,
              heightWeight
            });
          }

          probe.onload = () => done(probe.naturalWidth || 1, probe.naturalHeight || 1);
          probe.onerror = () => done(1, 1);
          probe.src = entry.src;
        });
      }

      function getPlacementColumn(entry){
        const groupId = filenameToGroup.get(entry.nameLower);
        if(typeof groupId === 'number'){
          if(!assignedColumnByGroup.has(groupId)){
            const chosen = galleryColumnState.reduce((best, column) => {
              if(column.heightScore < best.heightScore) return column;
              if(column.heightScore > best.heightScore) return best;
              if(column.count < best.count) return column;
              if(column.count > best.count) return best;
              return column.columnIndex < best.columnIndex ? column : best;
            }, galleryColumnState[0]);
            assignedColumnByGroup.set(groupId, chosen.columnIndex);
          }

          const pinnedColumnIndex = assignedColumnByGroup.get(groupId);
          const pinned = galleryColumnState.find((column) => column.columnIndex === pinnedColumnIndex);
          if(pinned) return pinned;
        }

        return galleryColumnState.reduce((best, column) => {
          if(column.heightScore < best.heightScore) return column;
          if(column.heightScore > best.heightScore) return best;
          if(column.count < best.count) return column;
          if(column.count > best.count) return best;
          return column.columnIndex < best.columnIndex ? column : best;
        }, galleryColumnState[0]);
      }

      for(let index = 0; index < galleryItems.length; index += 1){
        const entry = await loadGalleryMeta(galleryItems[index]);
        const altText = entry.alt || '';

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'gallery-item';
        item.classList.add('is-loading');
        item.classList.add(entry.isLandscape ? 'gallery-item-landscape' : 'gallery-item-portrait');

        const img = document.createElement('img');
        img.src = entry.thumbSrc;
        img.alt = altText || img.alt || '';
        img.loading = 'lazy';
        img.addEventListener('load', () => {
          item.classList.remove('is-loading');
          item.classList.add('is-loaded');
        }, { once: true });
        img.addEventListener('error', () => {
          if(img.src !== entry.src){
            img.src = entry.src;
            return;
          }
          item.classList.remove('is-loading');
          item.classList.add('is-loaded');
        }, { once: true });

        if(img.complete && img.naturalWidth > 0){
          item.classList.remove('is-loading');
          item.classList.add('is-loaded');
        }

        item.appendChild(img);
        item.addEventListener('click', () => openGalleryLightbox(index));

        const targetColumn = getPlacementColumn(entry);
        targetColumn.element.appendChild(item);
        targetColumn.count += 1;
        targetColumn.heightScore += entry.heightWeight || 1;
      }

      applyGalleryFrameHeights();

      if(typeof ResizeObserver !== 'undefined'){
        const galleryResizeObserver = new ResizeObserver(() => {
          applyGalleryFrameHeights();
        });
        galleryResizeObserver.observe(gallery);
      } else {
        window.addEventListener('resize', applyGalleryFrameHeights);
      }
    }

    await yieldToMain();

    // ── 9. THANK YOU ───────────────────────────────────────────────────────
    const thankyouData = data.thankyou || {};
    const thankyouEl = document.getElementById('thankyou');
    const thankyouTextEl = document.getElementById('thankyou-text');
    const thankyouSignatureEl = document.getElementById('thankyou-signature');

    if(thankyouTextEl){
      const thankyouTextRaw = (thankyouData && typeof thankyouData.text === 'string')
        ? thankyouData.text
        : (thankyouTextEl.textContent || '');
      const normalizedText = thankyouTextRaw.replace(/\\n/g, '\n');
      thankyouTextEl.textContent = normalizedText;
    }
    if(thankyouSignatureEl) thankyouSignatureEl.textContent = thankyouData.signature || thankyouSignatureEl.textContent || '';
    const thankyouBackgroundPath = typeof thankyouData.background === 'string'
      ? thankyouData.background.replace(/\\/g, '/').trim()
      : '';
    if(thankyouEl && thankyouBackgroundPath){
      thankyouEl.style.setProperty('--thankyou-bg-image', `url("${thankyouBackgroundPath}")`);
      thankyouEl.style.backgroundImage = `linear-gradient(180deg, rgba(31,43,51,0.22), rgba(31,43,51,0.62)), url("${thankyouBackgroundPath}")`;
      thankyouEl.style.backgroundSize = 'cover';
      thankyouEl.style.backgroundPosition = 'center';
      thankyouEl.style.backgroundRepeat = 'no-repeat';
    }

  }catch(e){
    console.error('Failed loading content.json', e);
  }
}

window.addEventListener('DOMContentLoaded', loadContent);
