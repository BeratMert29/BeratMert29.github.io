const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ready = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined" && typeof Lenis !== "undefined";
const fine = matchMedia("(pointer: fine)").matches;

// Accordion works with or without animation libraries
document.querySelectorAll(".job-head").forEach(btn => {
  btn.addEventListener("click", () => {
    const job = btn.closest(".job");
    const open = job.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
    if (typeof ScrollTrigger !== "undefined") setTimeout(() => ScrollTrigger.refresh(), 650);
  });
});

// Side nav highlight (plain IntersectionObserver, no library needed)
(() => {
  const links = [...document.querySelectorAll(".side a")];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const set = id => links.forEach(a => a.classList.toggle("is-active", a === map.get(id)));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) set(e.target.id); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
})();

// Local time in Ankara
(() => {
  const el = document.getElementById("clock");
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul" });
  const tick = () => { el.textContent = "Ankara " + fmt.format(new Date()); };
  tick();
  setInterval(tick, 20000);
})();

if (reduced || !ready) {
  root.classList.add("static");
} else try {
  gsap.registerPlugin(ScrollTrigger);

  // smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
  const lenis = new Lenis({ lerp: 0.085 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  // keep the page behind the loader out of the tab order until it lifts
  const gated = document.querySelectorAll("main, .bar, .side");
  gated.forEach(el => { el.inert = true; });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -88, duration: 1.4 });
    });
  });

  // loader: count to 100, lift the sheet, reveal the name
  const loader = document.getElementById("loader");
  const countEl = document.getElementById("count");
  const counter = { v: 0 };
  const sandTop = document.getElementById("sandTop");
  const sandBottom = document.getElementById("sandBottom");
  gsap.set(".line-in", { yPercent: 115 });
  gsap.set([".hero-desc", ".hero-meta", ".btn"], { opacity: 0, y: 20 });

  gsap.timeline()
    .to(counter, {
      v: 100, duration: 1.8, ease: "power2.inOut",
      onUpdate: () => {
        const p = counter.v / 100;
        countEl.textContent = Math.round(counter.v);
        sandTop.setAttribute("y", 6 + 24 * p);
        sandTop.setAttribute("height", 24 * (1 - p));
        sandBottom.setAttribute("y", 58 - 24 * p);
        sandBottom.setAttribute("height", 24 * p);
      },
    })
    .to(".loader-inner", { opacity: 0, duration: 0.3 }, ">0.15")
    .to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, ">-0.05")
    .to(".line-in", { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.12 }, "<0.55")
    .to([".hero-desc", ".hero-meta", ".btn"], { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, "<0.35")
    .add(() => { lenis.start(); loader.style.display = "none"; gated.forEach(el => { el.inert = false; }); }, "<0.4");

  // hero recedes on scroll
  gsap.to(".hero > *", {
    yPercent: -10, opacity: 0.1, ease: "none", stagger: 0.02,
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // marquee: constant drift that speeds up and flips with scroll velocity
  const track = document.getElementById("marquee");
  const drift = gsap.to(track, { xPercent: -50, ease: "none", duration: 30, repeat: -1 });
  let dir = 1, boost = 0;
  lenis.on("scroll", ({ velocity }) => {
    if (Math.abs(velocity) > 0.05) dir = velocity > 0 ? 1 : -1;
    boost = Math.min(Math.abs(velocity) * 0.35, 6);
  });
  gsap.ticker.add(() => {
    boost *= 0.92;
    drift.timeScale(gsap.utils.interpolate(drift.timeScale(), dir * (1 + boost), 0.08));
  });

  // about: words light up with scroll
  const about = document.getElementById("aboutText");
  about.innerHTML = about.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ");
  gsap.fromTo(".about-text .w", { opacity: 0.18 }, {
    opacity: 1, ease: "none", stagger: 0.1,
    scrollTrigger: { trigger: ".about-text", start: "top 80%", end: "bottom 50%", scrub: true },
  });

  gsap.utils.toArray(".section-title").forEach(el => {
    gsap.from(el, { yPercent: 60, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  gsap.utils.toArray(".job").forEach(job => {
    gsap.from(job, { y: 50, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: job, start: "top 94%", once: true } });
  });

  // project blocks and facts fade in once
  gsap.utils.toArray(".project, .facts > div").forEach(el => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });

  // hairlines draw in, content follows
  gsap.utils.toArray(".row").forEach(row => {
    gsap.set(row, { "--line-p": 0 });
    const st = { trigger: row, start: "top 94%", once: true };
    gsap.from([...row.children], { opacity: 0, y: 14, duration: 0.8, ease: "power3.out", stagger: 0.08, scrollTrigger: st });
    gsap.to(row, { "--line-p": 1, duration: 1, ease: "expo.out", scrollTrigger: st });
  });

  // cursor and magnetic email
  if (fine) {
    const cur = document.getElementById("cursor");
    const mx = gsap.quickTo(cur, "x", { duration: 0.3, ease: "power3" });
    const my = gsap.quickTo(cur, "y", { duration: 0.3, ease: "power3" });
    addEventListener("pointermove", e => { cur.classList.add("on"); mx(e.clientX); my(e.clientY); });
    document.documentElement.addEventListener("pointerleave", () => cur.classList.remove("on"));
    document.querySelectorAll("[data-cursor]").forEach(el => {
      el.addEventListener("pointerenter", () => cur.classList.add("big"));
      el.addEventListener("pointerleave", () => cur.classList.remove("big"));
    });

    const mail = document.getElementById("mail");
    const ox = gsap.quickTo(mail, "x", { duration: 0.6, ease: "power3" });
    const oy = gsap.quickTo(mail, "y", { duration: 0.6, ease: "power3" });
    mail.addEventListener("pointermove", e => {
      const r = mail.getBoundingClientRect();
      ox((e.clientX - (r.left + r.width / 2)) * 0.08);
      oy((e.clientY - (r.top + r.height / 2)) * 0.2);
    });
    mail.addEventListener("pointerleave", () => { ox(0); oy(0); });
  }

  document.fonts.ready.then(() => ScrollTrigger.refresh());
} catch (err) {
  // any failure in the animated path must never leave the page hidden or locked
  console.error(err);
  root.classList.add("static");
  document.querySelectorAll("main, .bar, .side").forEach(el => { el.inert = false; });
  if (typeof gsap !== "undefined") gsap.set(".line-in, .hero-desc, .hero-meta, .btn, .about-text .w, .job, .row, .row > *, .section-title, .project, .facts > div", { clearProps: "all" });
}
