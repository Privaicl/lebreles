(() => {
  const cv = document.getElementById('scope'), ctx = cv.getContext('2d'), clock = document.getElementById('clock');
  let ac, an, buf, src = null, t0 = 0, dur = 0, active = null; const cache = {};
  const fit = () => { cv.width = cv.clientWidth * devicePixelRatio; cv.height = 160 * devicePixelRatio; };
  addEventListener('resize', fit); fit();
  function ensureGraph(){
    if (ac) return; ac = new AudioContext(); an = ac.createAnalyser(); an.fftSize = 2048;
    an.connect(ac.destination); buf = new Uint8Array(an.fftSize);
  }
  const load = url => cache[url] ||= fetch(url).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b));
  function draw(){
    const w = cv.width, h = cv.height; ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(235,229,214,.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += w/24){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
    ctx.strokeStyle = '#7ef5d2'; ctx.lineWidth = 1.6 * devicePixelRatio; ctx.beginPath();
    if (src){ an.getByteTimeDomainData(buf);
      for (let i = 0; i < buf.length; i++){ const x = i / buf.length * w, y = (buf[i] / 255) * h; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
      clock.textContent = '00:0' + Math.min(Math.floor(dur), Math.floor(ac.currentTime - t0));
    } else { const t = performance.now()/900;
      for (let x = 0; x <= w; x += 3){ const y = h/2 + Math.sin(x/38 + t) * 2 + (Math.random()-.5) * 2; x ? ctx.lineTo(x,y) : ctx.moveTo(x,y); } }
    ctx.stroke();
    requestAnimationFrame(draw);
  }
  function stop(){
    if (src){ src.onended = null; try { src.stop(); } catch {} src = null; }
    if (active){ active.classList.remove('on'); active.querySelector('button').textContent = '▶'; }
    active = null; clock.textContent = '00:00';
  }
  document.querySelectorAll('.frags li').forEach(li => li.querySelector('button').addEventListener('click', async () => {
    const was = active === li; stop(); if (was) return;
    ensureGraph(); ac.resume(); active = li; li.classList.add('on'); li.querySelector('button').textContent = '❚❚';
    const audioBuf = await load(li.dataset.src); if (active !== li) return;
    const st = +(li.dataset.start || 0); dur = +li.dataset.dur;
    src = ac.createBufferSource(); src.buffer = audioBuf; const g = ac.createGain(); g.gain.value = +(li.dataset.gain || 1); src.connect(g).connect(an); src.onended = stop;
    t0 = ac.currentTime; src.start(0, st, dur);
  }));
  draw();
})();

(() => {
  const t = document.getElementById('archive'), n = t.children.length, c = document.getElementById('count');
  const step = () => t.children[0].getBoundingClientRect().width + 28;
  document.getElementById('prev').onclick = () => t.scrollBy({left: -step()});
  document.getElementById('next').onclick = () => t.scrollBy({left: step()});
  t.addEventListener('scroll', () => { const i = Math.min(n, Math.round(t.scrollLeft / step()) + 1); c.textContent = String(i).padStart(2,'0') + ' / ' + String(n).padStart(2,'0'); });
})();

// Formularios: revisamos en el navegador y enviamos a la API. Sin JavaScript, el formulario se envía igual.
(() => {
  // Mismo algoritmo que src/lib/rut.ts.
  const rutOk = (v) => {
    const m = v.replace(/[.\s-]/g, '').toUpperCase().match(/^(\d{7,8})([\dK])$/)
    if (!m) return false
    let sum = 0, mul = 2
    for (const d of m[1].split('').reverse()) { sum += +d * mul; mul = mul === 7 ? 2 : mul + 1 }
    const r = 11 - (sum % 11)
    return (r === 11 ? '0' : r === 10 ? 'K' : String(r)) === m[2]
  }
  function show(form, text, isErr) {
    const msg = form.querySelector('.form-msg')
    msg.textContent = text
    msg.className = 'form-msg mono' + (isErr ? ' err' : '')
  }
  function wire(form, check) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      form.querySelectorAll('.bad').forEach((x) => x.classList.remove('bad'))
      const err = check(form)
      if (err) { show(form, err.text, true); err.el.classList.add('bad'); err.el.focus(); return }
      const button = form.querySelector('button[type=submit]')
      button.disabled = true
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams(new FormData(form)),
        })
        const data = await res.json()
        if (data.ok) { show(form, data.mensaje, false); form.classList.add('done'); return }
        show(form, data.mensaje, true)
        const field = data.campo && form.querySelector(`[name="${data.campo}"]`)
        if (field) { field.classList.add('bad'); field.focus() }
      } catch {
        show(form, 'La señal se cortó. Intenta de nuevo.', true)
      } finally {
        button.disabled = false
      }
    })
  }
  wire(document.getElementById('f-solicitud'), (f) => {
    for (const el of f.querySelectorAll('[required]')) if (!el.value.trim()) return { el, text: 'Falta un campo. Lo notamos.' }
    if (!rutOk(f.rut.value)) return { el: f.rut, text: 'Ese RUT no existe. Lo revisamos.' }
    if (!f.correo.checkValidity()) return { el: f.correo, text: 'Ese correo no llega a ninguna parte.' }
    return null
  })
  wire(document.getElementById('f-boletin'), (f) => {
    if (!f.correo.value.trim() || !f.correo.checkValidity()) return { el: f.correo, text: 'Necesitamos un correo que funcione.' }
    if (!f.acepta.checked) return { el: f.acepta, text: 'Sin tu aceptación no te escribimos.' }
    return null
  })
})();
