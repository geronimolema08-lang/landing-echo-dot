// Acordeón FAQ: solo una abierta a la vez
document.querySelectorAll(".faq").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (item.open) {
      document.querySelectorAll(".faq").forEach((other) => {
        if (other !== item) other.open = false;
      });
    }
  });
});

// Línea sutil en la nav al hacer scroll
const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Aparición suave de secciones al entrar en pantalla
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document
  .querySelectorAll(".card, .use__item, .compare__col, .spec, .faq")
  .forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(i % 3) * 70}ms`;
    io.observe(el);
  });
