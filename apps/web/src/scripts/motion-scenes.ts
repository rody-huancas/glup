// Everything that moves: files floating, the hero's logotype and Glup, the hero's parallax and Glup
// eating a file in «Cómo funciona». Loaded by motion.ts only when the page is ready and motion is welcome.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animateLogo } from '@/scripts/hero-logo';
import { animateMascot } from '@/scripts/hero-mascot';

gsap.registerPlugin(ScrollTrigger);

const float = (): void => {
  gsap.utils.toArray<HTMLElement>('[data-float]').forEach((item, index) => {
    gsap.to(item, {
      y        : index % 2 === 0 ? -12 : 10,
      rotation : index % 3 === 0 ? 4 : -3,
      duration : 2.4 + (index % 4) * 0.45,
      delay    : (index % 5) * 0.2,
      ease     : 'sine.inOut',
      yoyo     : true,
      repeat   : -1,
    });
  });
};

const parallax = (): void => {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  gsap.utils.toArray<HTMLElement>('[data-depth]').forEach((item) => {
    const depth = Number(item.dataset.depth ?? 0);

    gsap.to(item, {
      y             : -depth * 260,
      ease          : 'none',
      scrollTrigger : { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  });
};

// A file falls into Glup's mouth: the mouth opens, the file shrinks inside, Glup squashes and «ñam».
// It plays once and stays finished. The bubble and the sparkles start small only from the moment this
// scene is set up (html.motion-scroll, motion.css), never without JavaScript or with reduced motion.
const eat = (): void => {
  const scene = document.querySelector<HTMLElement>('[data-eat-scene]');
  if (!scene) return;

  const file     = scene.querySelector<HTMLElement>('[data-eat-file]');
  const body     = scene.querySelector<HTMLElement>('[data-eat-body]');
  const open     = scene.querySelector<HTMLElement>('[data-eat-mouth="open"]');
  const smile    = scene.querySelector<HTMLElement>('[data-eat-mouth="smile"]');
  const bubble   = scene.querySelector<HTMLElement>('[data-eat-bubble]');
  const sparkles = scene.querySelectorAll<HTMLElement>('[data-eat-sparkle]');
  if (!file || !body || !open || !smile || !bubble) return;

  // From the file's centre to the open mouth's, measured once laid out.
  const drop = (): { x: number; y: number } => {
    const from = file.getBoundingClientRect();
    const to   = open.getBoundingClientRect();
    return { x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2) };
  };


  const timeline = gsap.timeline({
    scrollTrigger : { trigger: scene, start: 'top 70%', once: true, invalidateOnRefresh: true },
  });

  timeline
    .to(open, { opacity: 1, duration: 0.15 })
    .to(smile, { opacity: 0, duration: 0.15 }, '<')
    .fromTo(file, { x: 0, y: 0, scale: 1, rotation: 0 }, { x: () => drop().x, y: () => drop().y, scale: 0.25, rotation: -30, duration: 0.8, ease: 'power2.in' }, '<')
    .to(file, { opacity: 0, duration: 0.08 })
    .to(open, { opacity: 0, duration: 0.1 }, '<')
    .to(smile, { opacity: 1, duration: 0.1 }, '<')
    .to(body, { scaleY: 0.88, scaleX: 1.08, duration: 0.14, ease: 'power1.out', transformOrigin: '50% 100%' }, '<')
    .to(body, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%' })
    .to(bubble, { scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, '<')
    .to(sparkles, { scale: 1, duration: 0.4, stagger: 0.08, ease: 'back.out(2)' }, '<0.05');
};

const QUERY = '(prefers-reduced-motion: no-preference)';

// Whether the hero is on screen: its loops (the logotype's gulp, Glup eating) wait while it is not.
const heroOnScreen = (): (() => boolean) => {
  const hero    = document.querySelector('[data-hero]');
  let   visible = true;
  if (hero) new IntersectionObserver(([entry]) => void (visible = entry.isIntersecting)).observe(hero);
  return () => visible;
};

// gsap.matchMedia undoes each part if reduced motion is turned on later (then html.motion goes too, so
// nothing stays at its starting point); the hero's parts also take their listeners and calls away.
export const startFloating = (): void => {
  const isVisible = heroOnScreen();

  gsap.matchMedia().add(QUERY, () => {
    float();
    const stopLogo   = animateLogo(isVisible);
    const stopMascot = animateMascot(isVisible);
    return () => {
      stopLogo();
      stopMascot();
      document.documentElement.classList.remove('motion', 'motion-on', 'motion-scroll');
    };
  });
};

// What follows the scroll measures the whole page: it starts with the first scroll, never before.
export const startScrolling = (): void => {
  gsap.matchMedia().add(QUERY, () => {
    document.documentElement.classList.add('motion-scroll');
    parallax();
    eat();
    return () => document.documentElement.classList.remove('motion-scroll');
  });
};
