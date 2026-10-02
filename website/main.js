// MacBook Cleaner website — tiny, dependency-free interactions.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Sticky nav gets a glass background once the page scrolls.
  const nav = document.getElementById('nav')
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  // Count-up numbers ([data-count]) when they scroll into view.
  function countUp(el) {
    const target = parseFloat(el.dataset.count)
    const decimals = (el.dataset.count.split('.')[1] || '').length
    if (reduced) return
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1200)
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = (target * eased).toFixed(decimals)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  // Storage ring preview — same categories and colors as the app.
  const CATS = [
    ['Applications', 27.8, '#8b5cf6'],
    ['Documents', 31.5, '#4f7bff'],
    ['Photos', 26.3, '#f0508a'],
    ['Videos', 19.7, '#ff8a4c'],
    ['Downloads', 14.2, '#13b5e0'],
    ['Cache', 12.6, '#19c39a'],
    ['Other', 11.4, '#f5b400'],
    ['System Data', 34.5, '#9aa0bd'],
  ]
  const TOTAL = 256
  const R = 88
  const C = 2 * Math.PI * R
  const segs = document.getElementById('ring-segs')
  const legend = document.getElementById('ring-legend')
  const max = Math.max(...CATS.map((c) => c[1]))
  let offset = 0
  CATS.forEach(([label, gb, color]) => {
    const len = (gb / TOTAL) * C
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('cx', '110')
    circle.setAttribute('cy', '110')
    circle.setAttribute('r', String(R))
    circle.setAttribute('class', 'ring-seg')
    circle.setAttribute('stroke', color)
    circle.style.strokeDasharray = `0 ${C}`
    circle.style.strokeDashoffset = String(-offset)
    circle.dataset.len = String(Math.max(0, len - 2.4))
    segs.appendChild(circle)
    offset += len
    const li = document.createElement('li')
    li.innerHTML = `<span class="sw" style="background:${color}"></span><span>${label}</span><b>${gb.toFixed(1)} GB</b><span class="bar"><i style="background:${color}" data-w="${(gb / max) * 100}"></i></span>`
    legend.appendChild(li)
  })
  function playRing() {
    segs.querySelectorAll('circle').forEach((c, i) => {
      setTimeout(() => (c.style.strokeDasharray = `${c.dataset.len} ${C}`), reduced ? 0 : i * 90)
    })
    legend.querySelectorAll('.bar i').forEach((b, i) => {
      setTimeout(() => (b.style.width = `${b.dataset.w}%`), reduced ? 0 : 200 + i * 70)
    })
  }

  // Scroll reveal + one-shot triggers.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in')
        entry.target.querySelectorAll('[data-count]').forEach(countUp)
        if (entry.target.id === 'ring-card') playRing()
        io.unobserve(entry.target)
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`
    io.observe(el)
  })

  // Screenshot tabs.
  const shot = document.getElementById('shot')
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab))
      shot.style.opacity = '0'
      setTimeout(() => {
        shot.src = `assets/screens/${tab.dataset.shot}.jpg`
        shot.onload = () => (shot.style.opacity = '1')
      }, 180)
    })
  })
})()
