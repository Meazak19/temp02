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

        const TOGGLE        = "play none none reverse";
        const isFirstMobile = () => window.innerWidth < 991;
        const isMobile      = () => window.innerWidth < 768;
        const isSmMobile    = () => window.innerWidth < 576;

        /* ══════════════════════════════════════════════════════
           HERO IMAGE
        ══════════════════════════════════════════════════════ */
        const heroImg = document.querySelector(".headerImg img");

        heroImg.style.transform       = "none";
        heroImg.style.transformOrigin = "top left"; /* MUST be top left — matches flyImg */

        gsap.set(heroImg, { y: 50, opacity: 0, scale: 1, bottom: isSmMobile() ? 25 : 0 });
        gsap.to(heroImg, {
          y: 0, opacity: 1, scale: 1,
          duration: 1.3, ease: "power3.out", delay: 1,
        });

        /* ══════════════════════════════════════════════════════
           FLYING IMAGE
        ══════════════════════════════════════════════════════ */
        const cards       = document.querySelectorAll(".step-card");
        const card1       = cards[0];
        const cardImgWrap = card1.querySelector(".step-icon-wrap");
        const cardImg     = card1.querySelector(".step-icon-wrap img");

        /* ── Clone ── */
        const flyImg = heroImg.cloneNode(true);
        Object.assign(flyImg.style, {
          position       : "fixed",
          top            : "0",
          left           : "0",
          margin         : "0",
          pointerEvents  : "none",
          zIndex         : "9998",
          transformOrigin: "top left",
          willChange     : "transform, opacity",
          objectFit      : "contain",
          borderRadius   : "0px",
          opacity        : "0",
          visibility     : "hidden",
        });
        document.body.appendChild(flyImg);

        /* ── State ── */
        let flyActive     = false;
        let heroPageX     = 0;
        let heroPageY     = 0;
        let heroW         = 0;
        let heroH         = 0;
        let cardRectCache = null;
        let rectsReady    = false;

        /* ── ONE captureAllRects — clears GSAP x/y before measuring ── */
        function captureAllRects() {
          /* Temporarily zero out GSAP's x/y so getBoundingClientRect
             returns the true CSS layout position, not the transformed one.
             We restore after measuring so the hero stays visually correct. */
          const prevX = gsap.getProperty(heroImg, "x");
          const prevY = gsap.getProperty(heroImg, "y");
          gsap.set(heroImg, { x: 0, y: 0 });

          const hr = heroImg.getBoundingClientRect();

          /* Restore immediately — hero must not visually jump */
          gsap.set(heroImg, { x: prevX, y: prevY });

          if (hr.width === 0) return; /* not rendered yet */

          heroPageX = hr.left;
          heroPageY = hr.top + lenis.scroll;
          heroW     = hr.width;
          heroH     = hr.height;

          gsap.set(flyImg, { width: heroW, height: heroH });

          const cr = cardImgWrap.getBoundingClientRect();
          cardRectCache = {
            left  : cr.left,
            top   : cr.top + lenis.scroll,
            width : cr.width,
            height: cr.height,
          };

          rectsReady = true;
        }

        /* hero anim: 1.3s duration + 1s delay = 2.3s — capture after it settles */
        gsap.delayedCall(2.4, captureAllRects);

        ScrollTrigger.addEventListener("refresh", () => {
          if (!flyActive) captureAllRects();
        });

        window.addEventListener("resize", () => {
          setTimeout(() => { if (!flyActive) captureAllRects(); }, 300);
        });

        /* Hide cardImg until fly lands */
        gsap.set(cardImg, { autoAlpha: 0 });

        /* ── ScrollTrigger ── */
        ScrollTrigger.create({
          trigger : ".paymentSection",
          start   : isFirstMobile() ? "top 52%" : "top 96%",
          end     : isFirstMobile() ? "top 10%" : "top 35%",
          scrub   : isFirstMobile() ? 1 : 2.9,

              onEnter() {
                flyActive = true;
                gsap.set(heroImg, { autoAlpha: 1, visibility: "visible" });
                gsap.set(flyImg,  { autoAlpha: 0, visibility: "hidden"  }); /* ← hidden until ep > 0.04 */
                gsap.set(cardImg, { autoAlpha: 0 });
              },

          onEnterBack() {
            flyActive = true;
            /* Pre-position flyImg at card so swap at ep>0.95 is seamless */
            if (cardRectCache) {
              const crLeft = cardRectCache.left;
              const crTop  = cardRectCache.top - lenis.scroll;
              const crW    = cardRectCache.width;
              const crH    = cardRectCache.height;
              const ts     = Math.min(crW / heroW, crH / heroH);
              gsap.set(flyImg, {
                x: crLeft + (crW - heroW * ts) / 2,
                y: crTop  + (crH - heroH * ts) / 2,
                scale: ts, borderRadius: "50%",
                transformOrigin: "top left", autoAlpha: 0,
              });
            }
            gsap.set(cardImg, { autoAlpha: 0 });
            gsap.set(heroImg, { autoAlpha: 0, visibility: "hidden" });
          },

          onLeave() {
            flyActive = false;
            gsap.set(flyImg,  { autoAlpha: 0 });
            gsap.set(heroImg, { autoAlpha: 0, visibility: "hidden" });
            gsap.set(cardImg, { autoAlpha: 1 });
          },

          onLeaveBack() {
            flyActive = false;

            /* Pre-position flyImg exactly at hero viewport position
               so when it hides and heroImg shows there is zero jump */
            const heroViewX = heroPageX;
            const heroViewY = heroPageY - lenis.scroll;

            gsap.set(flyImg, {
              x: heroViewX, y: heroViewY,
              scale: 0, borderRadius: "0%",
              transformOrigin: "top left", autoAlpha: 0,
            });

            gsap.set(heroImg, { autoAlpha: 1, x: 0, y: 0, scale: 1, visibility: "visible" });
            gsap.set(cardImg, { autoAlpha: 0 });

            /* Re-capture now that heroImg is at natural position */
            gsap.delayedCall(0.05, captureAllRects);
          },

            onUpdate(self) {
              if (!flyActive)  return;
              if (!rectsReady) return;

              const p    = self.progress;
              const ep   = gsap.parseEase("power1.inOut")(p);
              const lerp = (a, b, t) => a + (b - a) * t;

              const heroViewX = heroPageX;
              const heroViewY = heroPageY - lenis.scroll;

              const crLeft = cardRectCache.left;
              const crTop  = cardRectCache.top - lenis.scroll;
              const crW    = cardRectCache.width;
              const crH    = cardRectCache.height;

              const targetScale = Math.min(crW / heroW, crH / heroH);
              const targetX     = crLeft + (crW - heroW * targetScale) / 2;
              const targetY     = crTop  + (crH - heroH * targetScale) / 2;

              /* Always update position/scale every frame regardless of visibility */
              gsap.set(flyImg, {
                x              : lerp(heroViewX, targetX, ep),
                y              : lerp(heroViewY, targetY, ep),
                scale          : lerp(1, targetScale, ep),
                borderRadius   : lerp(0, 50, ep) + "%",
                transformOrigin: "top left",
                force3D        : true,
              });

              /* ── Visibility: strictly one image at a time ──
                flyImg is ONLY made visible in the middle zone.
                It is explicitly hidden in start and end zones
                so there is never a frame where two images overlap.
              */
              if (ep < 0.0) {
                /* Start — hero only, fly hidden */
                gsap.set(heroImg, { autoAlpha: 1, visibility: "visible" });
                gsap.set(flyImg,  { autoAlpha: 0, visibility: "hidden"  }); /* ← explicit hide */
                gsap.set(cardImg, { autoAlpha: 0 });

              } else if (ep > 0.96) {
                /* End — card only, fly hidden */
                gsap.set(heroImg, { autoAlpha: 0, visibility: "hidden"  });
                gsap.set(flyImg,  { autoAlpha: 0, visibility: "hidden"  }); /* ← explicit hide */
                gsap.set(cardImg, { autoAlpha: 1 });

              } else {
                /* Mid-flight — fly only */
                gsap.set(heroImg, { autoAlpha: 0, visibility: "hidden"  });
                gsap.set(flyImg,  { autoAlpha: 1, visibility: "visible" }); /* ← only shown here */
                gsap.set(cardImg, { autoAlpha: 0 });
              }
            },
        });

        /* ══════════════════════════════════════════════════════
           ARROW + BUTTON ENTRANCE
        ══════════════════════════════════════════════════════ */
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

            gsap.set(split.chars, { y: 80, opacity: 0 });

            const isHeader = !!el.closest(".headerSection");

            function playHeading() {
              gsap.fromTo(split.chars,
                { y: 80, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.025, duration: 0.75, ease: "power4.out", overwrite: true }
              );
            }
            function reverseHeading() {
              gsap.to(split.chars, {
                y: -50, opacity: 0, stagger: 0.015, duration: 0.45, ease: "power3.in", overwrite: true,
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
                trigger : el,
                start   : isMobile() ? "top 95%" : "top 85%", /* ← lower threshold on mobile */
                end     : "bottom top",
                /* ── on mobile only play/reverse, no onLeave reverse ──
                  Fast mobile scroll triggers onLeave immediately which
                  cancels the animation before it's visible             */
                onEnter     : playHeading,
                onEnterBack : playHeading,
                onLeave     : isMobile() ? null : reverseHeading,
                onLeaveBack : isMobile() ? null : reverseHeading,
              });
            }
          });

        /* ── Wave letters ── */
        gsap.to(".wave-letter", {
          y: -12, rotation: 2, duration: 0.5, ease: "sine.inOut",
          stagger: { each: 0.03, repeat: -1, yoyo: true }, force3D: true,
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
            rectsReady = false; /* force re-capture after refresh */
            lenis.resize();
            ScrollTrigger.refresh();
          }, 250);
        });

      }); // split-type
    }); // lenis
  }); // ScrollTrigger
}); // gsap
