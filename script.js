$.getScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js", function () {
  $.getScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js", function () {
    $.getScript("https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js", function () {
      $.getScript("https://unpkg.com/split-type", function () {

        gsap.registerPlugin(ScrollTrigger);

        /* ── Lenis ── */
        const lenis = new Lenis({
          duration          : 1.4,
          easing            : (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation       : "vertical",
          gestureOrientation: "vertical",
          smoothWheel       : true,
          smoothTouch       : true,
          touchMultiplier   : 2,
          wheelMultiplier   : 1,
          infinite          : false,
        });

        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.on("scroll", ScrollTrigger.update);

        ScrollTrigger.scrollerProxy(document.body, {
          scrollTop(value) {
            if (arguments.length) lenis.scrollTo(value, { immediate: true });
            return lenis.scroll;
          },
          getBoundingClientRect() {
            return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
          },
        });

        ScrollTrigger.addEventListener("refresh", () => lenis.resize());
        ScrollTrigger.refresh();

        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
          anchor.addEventListener("click", (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute("href"));
            if (target) lenis.scrollTo(target, { offset: -80, duration: 1.6 });
          });
        });

        window.lenisStop  = () => lenis.stop();
        window.lenisStart = () => lenis.start();

        const TOGGLE   = "play none none reverse";
        const isFirstMobile = () => window.innerWidth < 991;
        const isMobile = () => window.innerWidth < 768;
        const isSmMobile = () => window.innerWidth < 576;

        /* ══════════════════════════════════════════════════════
           HERO IMAGE
           ─ Clear ALL CSS transforms first so GSAP is the only
             source of truth for position/scale/rotate.
           ─ Use gsap.set (from-state) → gsap.to (animate in).
             Never gsap.from() — it applies the hidden state early.
        ══════════════════════════════════════════════════════ */

        const heroImg = document.querySelector(".headerImg img");

        // Wipe conflicting CSS transforms so getBoundingClientRect()
        // returns the real layout position (no CSS rotate/scale offset)
        heroImg.style.transform       = "none";
        heroImg.style.transformOrigin = "bottom left";

        // Explicitly set the FROM state, then animate TO visible
        gsap.set(heroImg, { y: 70, opacity: 0, scale: 1 , rotate: isMobile() ? 0 : -15,
   bottom: isSmMobile() ? 25 : 0});
        gsap.to(heroImg, {
          y: 0, opacity: 1, scale: 1,
          duration: 1.3, ease: "power3.out", delay: 0.15,
        });

        /* Arrow + Button entrance */
        gsap.set([".headerSection .arrowImg", ".headerContent .orderBtn"], { opacity: 0 });
        gsap.fromTo(".headerSection .arrowImg",
          { x: 60, opacity: 0 },
          { x: 0,  opacity: 1, duration: 0.8, delay: 0.9, ease: "power3.out" }
        );
        gsap.fromTo(".headerContent .orderBtn",
          { y: 12, opacity: 0, scale: 0.85 },
          { y: 0,  opacity: 1, scale: 1, duration: 0.6, delay: 1.2, ease: "back.out(1.7)" }
        );

        /* ══════════════════════════════════════════════════════
           ALL HEADINGS — SplitType char animation
        ══════════════════════════════════════════════════════ */

        document.querySelectorAll("h1, h2, h3").forEach((el) => {
          el.style.overflow = "hidden";
        });

        const allHeadings    = gsap.utils.toArray("h1, h2, h3");
        const splitInstances = [];

        allHeadings.forEach((el) => {
          const split = new SplitType(el, { types: "chars" });
          splitInstances.push(split);

          split.chars.forEach((char) => {
            char.style.display    = "inline-block";
            char.style.willChange = "transform, opacity";
          });

          gsap.set(split.chars, { y: 120, opacity: 0 });

          const isHeader = !!el.closest(".headerSection");

          function playHeading() {
            gsap.fromTo(split.chars,
              { y: 120, opacity: 0 },
              { y: 0, opacity: 1, stagger: 0.025, duration: 0.75, ease: "power4.out", overwrite: true }
            );
          }
          function reverseHeading() {
            gsap.to(split.chars, {
              y: -80, opacity: 0, stagger: 0.015, duration: 0.45, ease: "power3.in", overwrite: true,
            });
          }

          if (isHeader) {
            gsap.delayedCall(0.2, playHeading);
            ScrollTrigger.create({
              trigger: el, start: "top top", end: "bottom top",
              onLeave: reverseHeading, onEnterBack: playHeading,
            });
          } else {
            ScrollTrigger.create({
              trigger: el, start: "top 85%", end: "bottom top",
              onEnter: playHeading, onEnterBack: playHeading,
              onLeave: reverseHeading, onLeaveBack: reverseHeading,
            });
          }
        });

        /* ── Wave letters ── */
        gsap.to(".wave-letter", {
          y: -12, rotation: 2, duration: 0.5, ease: "sine.inOut",
          stagger: { each: 0.03, repeat: -1, yoyo: true }, force3D: true,
        });

        /* ══════════════════════════════════════════════════════
           FLYING IMAGE
           ─ Clone is position:fixed, hidden on load.
           ─ Uses left/top/width/height (NOT gsap x/y transforms)
             so CSS transform conflicts are impossible.
           ─ heroSnapRect captured ONCE in onEnter (after load
             animation finished, before hero scrolls off screen).
           ─ cardRect re-measured every onUpdate so it tracks
             the card's real viewport position while scrolling.
           ─ Fly fades out in sync with step-icon-wrap img fade-in.
        ══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   FLYING IMAGE — fixed version
   Bugs fixed:
   1. Missing onLeave → fly persisted into About section
   2. heroSnapRect measured too early (0.5s < 1.45s anim)
   3. Math.max(0,top) clamp caused wrong start pos on mobile
   4. Mobile bypass: if hero is off-screen, reveal directly
══════════════════════════════════════════════════════ */

const cards       = document.querySelectorAll(".step-card");
const card1       = cards[0];
const cardImgWrap = card1.querySelector(".step-icon-wrap");
const cardImg     = card1.querySelector(".step-icon-wrap img");

  const flyImg = heroImg.cloneNode(true);
          Object.assign(flyImg.style, {
            position      : "fixed",
            top           : "0",
            left          : "0",
            margin        : "0",
            pointerEvents : "none",
            zIndex        : "9998",
            transformOrigin: "top left",
            willChange    : "transform, width, height, opacity",
            objectFit     : "contain",
            borderRadius  : "0px",
            opacity       : "0",
          });
          document.body.appendChild(flyImg);
  
          let heroRect = heroImg.getBoundingClientRect();
          window.addEventListener("resize", () => {
            setTimeout(() => { heroRect = heroImg.getBoundingClientRect(); }, 260);
          });
  
    ScrollTrigger.create({
  trigger : ".paymentSection",
  // start: isMobile() ? "top 52%" : "top 96%",
  start: isFirstMobile() ? "top 52%" : "top 96%",
    end   : isFirstMobile() ? "top 10%" : "top 35%",
    scrub : isFirstMobile() ? 0.5 : 1.5,
  // start   : "top 96%",
  // end     : "top 35%",
  // scrub   : 1.5,

  onEnter() { 
    const hr = heroImg.getBoundingClientRect();
    gsap.set(flyImg, {
      x: hr.left, y: hr.top,
      width: hr.width, height: hr.height,
      opacity: 1, scale: 1.2, borderRadius: "0px",
    });
  },

 

  onUpdate(self) {
    const p  = self.progress;
    const ep = gsap.parseEase("power2.inOut")(p);

    // ✅ Use cardImgWrap as destination, not card1
    const cr = cardImgWrap.getBoundingClientRect();
    const hr = heroRect;
    const lerp = (a, b, t) => a + (b - a) * t;

    // ✅ Scale stays at 1 — size is driven by width/height interpolation
   const START_BUFFER = 0.04;
const END_BUFFER   = 0.96;

/* Flying image movement */
gsap.set(flyImg, {
  x            : lerp(hr.left,   cr.left,   ep),
  y            : lerp(hr.top,    cr.top,    ep),
  width        : lerp(hr.width,  cr.width,  ep),
  height       : lerp(hr.height, cr.height, ep),
  borderRadius : lerp(0, 18, ep) + "px",
  scale        : 1,
  transformOrigin: "top left",
  force3D      : true,
});

/* Visibility control */
if (ep <= START_BUFFER) {

  gsap.set(heroImg, {
    opacity: 1,
    visibility: "visible"
  });

  gsap.set(flyImg, {
    opacity: 0,
    visibility: "hidden"
  });

}
else if (ep > START_BUFFER && ep < END_BUFFER) {

  gsap.set(heroImg, {
    opacity: 0,
    visibility: "hidden"
  });

  gsap.set(flyImg, {
    opacity: 1,
    visibility: "visible"
  });

}
else {

  gsap.set(flyImg, {
    opacity: 0,
    visibility: "hidden"
  });

}

    // ✅ Reveal the card's static .step-image as flyImg arrives
    const revealStart    = 0.72;
    const revealProgress = ep > revealStart
      ? gsap.utils.clamp(0, 1, (ep - revealStart) / (1 - revealStart))
      : 0;

    gsap.set(".step-card .step-image", {
      scale  : gsap.utils.interpolate(0.82, 1, revealProgress),
      opacity: revealProgress,
    });

    // ✅ Swap: show static image, hide flyImg at the very end
    if (ep > 0.96) {
      gsap.set(cardImg, { autoAlpha: 1 });
    } else {
      gsap.set(cardImg, { autoAlpha: 0 });
    }
  },
});

        /* ══════════════════════════════════════════════════════
           STEP CARDS
        ══════════════════════════════════════════════════════ */

        gsap.from(cards[0], {
          scrollTrigger: { trigger: cards[0], start: "top 80%", toggleActions: TOGGLE },
          x: -150, opacity: 0, rotateY: -45, duration: 1.5, ease: "power3.out",
        });
        gsap.from(cards[1], {
          scrollTrigger: { trigger: cards[1], start: "top 82%", toggleActions: TOGGLE },
          y: -120, opacity: 0, scale: 0.6, duration: 1, ease: "back.out(1.8)", delay: 0.12,
        });
        gsap.from(cards[2], {
          scrollTrigger: { trigger: cards[2], start: "top 82%", toggleActions: TOGGLE },
          x: 150, opacity: 0, rotateY: 45, duration: 0.9, ease: "power3.out", delay: 0.24,
        });

        document.querySelectorAll(".step-num").forEach((el, i) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: "top 85%", toggleActions: TOGGLE },
            scale: 0, opacity: 0, duration: 0.6, delay: i * 0.12, ease: "back.out(2.5)",
            rotate: i === 0 ? -90 : i === 1 ? 180 : 90,
          });
        });

        const iconEases = ["elastic.out(1, 0.4)", "bounce.out", "elastic.out(1.2, 0.3)"];
        document.querySelectorAll(".step-icon-wrap").forEach((el, i) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: "top 85%", toggleActions: TOGGLE },
            scale: 0, opacity: 0, duration: 0.75, delay: 0.3 + i * 0.1, ease: iconEases[i],
          });
        });

        cards.forEach((card, i) => {
          gsap.from([card.querySelector(".step-title"), card.querySelector(".step-desc")], {
            scrollTrigger: { trigger: card, start: "top 82%", toggleActions: TOGGLE },
            y: 20, opacity: 0, duration: 0.55, stagger: 0.1,
            delay: 0.5 + i * 0.12, ease: "power2.out",
          });
        });

        /* ══════════════════════════════════════════════════════
           ABOUT
        ══════════════════════════════════════════════════════ */

        gsap.from(".aboutContent p", {
          scrollTrigger: { trigger: ".aboutContent p", start: "top 88%", toggleActions: TOGGLE },
          y: 40, opacity: 0, duration: 0.8, ease: "power2.out", delay: 0.2,
        });
        gsap.from(".aboutContent .orderBtn", {
          scrollTrigger: { trigger: ".aboutContent .orderBtn", start: "top 92%", toggleActions: TOGGLE },
          y: 30, opacity: 0, scale: 0.8, duration: 0.7, ease: "back.out(1.7)",
        });
        gsap.from(".mask", {
          scrollTrigger: { trigger: ".mask", start: "top 85%", toggleActions: TOGGLE },
          x: 80, opacity: 0, duration: 1.1, ease: "power3.out",
        });
        gsap.to(".mask img", {
          scrollTrigger: { trigger: ".aboutSection", start: "top bottom", end: "bottom top", scrub: 1.5 },
          y: -40,
        });

        /* ══════════════════════════════════════════════════════
           BANNER
        ══════════════════════════════════════════════════════ */

        gsap.from(".wrapsImg", {
          scrollTrigger: { trigger: ".bannerSection", start: "top 80%", toggleActions: TOGGLE },
          y: 80, opacity: 0, scale: 0.85, duration: 1.2, ease: "power4.out",
        });
        gsap.from(".rightTxtContent p", {
          scrollTrigger: { trigger: ".rightTxtContent p", start: "top 88%", toggleActions: TOGGLE },
          x: 50, opacity: 0, duration: 0.85, ease: "power2.out", delay: 0.3,
        });

        /* ══════════════════════════════════════════════════════
           MENU
        ══════════════════════════════════════════════════════ */

        gsap.from(".manImg", {
          scrollTrigger: { trigger: ".menuSection", start: "top 80%", toggleActions: TOGGLE },
          x: -100, opacity: 0, duration: 1.2, ease: "power3.out",
        });
        gsap.from(".friesImg", {
          scrollTrigger: { trigger: ".menuSection", start: "top 80%", toggleActions: TOGGLE },
          x: 120, rotate: 30, opacity: 0, duration: 1.2, ease: "power3.out",
        });

        ScrollTrigger.create({
          trigger: ".menuSection", start: "top 80%", once: true,
          onEnter() {
            gsap.to(".manImg",   { y: -18, duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
            gsap.to(".friesImg", { y:  18, duration:   3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.5 });
          },
        });

        /* ══════════════════════════════════════════════════════
           GALLERY
        ══════════════════════════════════════════════════════ */

        const galleryImgs = gsap.utils.toArray(".galleryParent img");
        gsap.from(galleryImgs, {
          scrollTrigger: { trigger: ".galleryGrid", start: "top 85%", toggleActions: TOGGLE },
          scale: 0.82, opacity: 0, y: 50, duration: 0.85,
          stagger: { amount: 0.5, from: "start" }, ease: "power3.out",
        });
        galleryImgs.forEach((img) => {
          gsap.to(img, {
            scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: 1.2 },
            y: -25,
          });
        });

        /* ── Button hover ── */
        document.querySelectorAll(".orderBtn").forEach((btn) => {
          btn.addEventListener("mouseenter", () =>
            gsap.to(btn, { scale: 1.06, duration: 0.25, ease: "power2.out" }));
          btn.addEventListener("mouseleave", () =>
            gsap.to(btn, { scale: 1, duration: 0.3, ease: "power2.inOut" }));
        });

        /* ── Resize ── */
        let resizeTimer;
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            /* Re-split headings */
            splitInstances.forEach((s) => s.revert());
            splitInstances.length = 0;
            allHeadings.forEach((el) => {
              const split = new SplitType(el, { types: "chars" });
              splitInstances.push(split);
              split.chars.forEach((c) => {
                c.style.display    = "inline-block";
                c.style.willChange = "transform, opacity";
              });
              gsap.set(split.chars, { y: 0, opacity: 1 });
            });
            /* Reset fly snapshot so next onEnter re-measures */
            heroSnapRect = null;
            lenis.resize();
            ScrollTrigger.refresh();
          }, 250);
        });

      }); // split-type
    }); // lenis
  }); // ScrollTrigger
}); // gsap
