// Nav scroll
window.addEventListener('scroll', function(){
  document.querySelector('.nav-bar')?.classList.toggle('scrolled', window.scrollY > 10);
});

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function(){
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function(){
      menu.classList.toggle('open');
    });
  }
});
