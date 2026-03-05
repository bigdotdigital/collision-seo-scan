(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav-links] a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === path) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const filterGroup = document.querySelector('[data-filter-group]');
  const filterItems = document.querySelectorAll('[data-filter-item]');

  if (filterGroup && filterItems.length) {
    filterGroup.addEventListener('click', function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches('.filter-btn')) return;

      const filter = target.getAttribute('data-filter');
      if (!filter) return;

      filterGroup.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.classList.remove('active');
      });
      target.classList.add('active');

      filterItems.forEach(function (item) {
        const itemType = item.getAttribute('data-filter-item');
        item.style.display = filter === 'all' || itemType === filter ? '' : 'none';
      });
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
