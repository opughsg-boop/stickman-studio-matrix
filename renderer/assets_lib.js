// Ready-made 3D procedural asset library for Diorama Studio
// Categories: Animals, Roads & Vehicles, Houses & Buildings, Plants & Nature
// Every builder returns a THREE.Group/Object3D with optional userData.tick(t, age).

export function registerAssetsLib(THREE, ASSETS, helpers) {
  const { box, cyl, sph, std, shadowed, rng } = helpers;

  // ==================== 1. ANIMALS (الحيوانات) ====================
  function horse(p = {}) {
    const g = new THREE.Group(), c = p.color || '#7a4522', m = std(c, { r: .85 }), maneM = std('#24160d', { r: .9 });
    const body = sph(.55, m); body.scale.set(.7, .72, 1.45); body.position.y = 1.15; g.add(body);
    const neck = cyl(.18, .25, .75, m); neck.position.set(0, 1.55, .62); neck.rotation.x = -.55; g.add(neck);
    const head = new THREE.Group(); head.position.set(0, 1.88, .92); g.add(head);
    const skull = box(.26, .28, .54, m); skull.rotation.x = .35; head.add(skull);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 6), m); ear.position.set(s * .09, .18, -.1); head.add(ear);
      const eye = sph(.03, std('#111', { r: .2 })); eye.position.set(s * .13, .06, .06); head.add(eye);
    }
    const mane = box(.08, .55, .14, maneM); mane.position.set(0, 1.68, .48); mane.rotation.x = -.55; g.add(mane);
    const tail = cyl(.05, .09, .75, maneM); tail.position.set(0, 1.05, -.82); tail.rotation.x = .35; g.add(tail);
    const legs = [];
    for (const [x, z] of [[-.22, -.55], [.22, -.55], [-.22, .55], [.22, .55]]) {
      const l = new THREE.Group(); l.position.set(x, .85, z);
      const leg = cyl(.07, .055, .85, m); leg.position.y = -.42; l.add(leg);
      const hoof = cyl(.065, .07, .1, maneM); hoof.position.y = -.82; l.add(hoof);
      g.add(l); legs.push(l);
    }
    g.scale.setScalar(p.scale || .85);
    g.userData.tick = t => {
      const walk = g.userData.mode?.walk ?? 1;
      head.rotation.x = Math.sin(t * 1.4) * .08;
      tail.rotation.z = Math.sin(t * 3.5) * .15;
      legs.forEach((l, k) => l.rotation.x = walk ? Math.sin(t * 5 + k * Math.PI / 2) * .25 : 0);
    };
    return shadowed(g);
  }

  function cow(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#f4f1ea', { r: .9 }), spotM = std('#2b2623', { r: .9 });
    const body = box(.82, .72, 1.45, m); body.position.y = 1.05; g.add(body);
    for (const [sx, sy, sz, sr] of [[.36, 1.15, .2, .22], [-.36, 1.0, -.3, .24], [0, 1.38, -.1, .2]]) {
      const sp = sph(sr, spotM); sp.scale.set(.5, .8, 1); sp.position.set(sx, sy, sz); g.add(sp);
    }
    const head = new THREE.Group(); head.position.set(0, 1.32, .85); g.add(head);
    head.add(box(.42, .4, .46, m));
    const snout = box(.34, .2, .18, std('#e8b4b8')); snout.position.set(0, -.12, .26); head.add(snout);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(.045, .22, 8), std('#d8c8a0'));
      horn.position.set(s * .18, .24, -.05); horn.rotation.z = s * -.6; head.add(horn);
      const ear = box(.16, .08, .06, spotM); ear.position.set(s * .26, .08, -.05); head.add(ear);
    }
    for (const [x, z] of [[-.26, -.5], [.26, -.5], [-.26, .5], [.26, .5]]) {
      const l = cyl(.08, .07, .75, m); l.position.set(x, .38, z); g.add(l);
    }
    g.scale.setScalar(p.scale || .85);
    g.userData.tick = t => { head.rotation.x = Math.sin(t * 1.2) * .12; };
    return shadowed(g);
  }

  function camel(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#cfa264', { r: .92 });
    const body = sph(.52, m); body.scale.set(.75, .75, 1.4); body.position.y = 1.35; g.add(body);
    const hump = sph(.38, m); hump.scale.set(.7, 1.1, .9); hump.position.set(0, 1.78, -.05); g.add(hump);
    const neck = cyl(.14, .2, .95, m); neck.position.set(0, 1.82, .72); neck.rotation.x = .35; g.add(neck);
    const head = box(.24, .24, .44, m); head.position.set(0, 2.24, .98); g.add(head);
    const legs = [];
    for (const [x, z] of [[-.22, -.5], [.22, -.5], [-.22, .5], [.22, .5]]) {
      const l = new THREE.Group(); l.position.set(x, 1.05, z);
      const leg = cyl(.065, .055, 1.05, m); leg.position.y = -.52; l.add(leg);
      g.add(l); legs.push(l);
    }
    g.scale.setScalar(p.scale || .85);
    g.userData.tick = t => {
      head.rotation.x = Math.sin(t * 1.3) * .08;
      legs.forEach((l, k) => l.rotation.x = Math.sin(t * 3.5 + k * 1.57) * .2);
    };
    return shadowed(g);
  }

  function sheep(p = {}) {
    const g = new THREE.Group(), wool = std('#f3f1ea', { r: 1 }), dark = std('#2b2623', { r: .8 });
    for (const [x, y, z, r] of [[0, .72, 0, .42], [0, .74, .25, .36], [0, .72, -.25, .36], [.2, .7, 0, .3], [-.2, .7, 0, .3]]) {
      const s = sph(r, wool); s.position.set(x, y, z); g.add(s);
    }
    const head = sph(.2, dark); head.scale.set(.85, .9, 1.2); head.position.set(0, .86, .58); g.add(head);
    for (const s of [-1, 1]) { const ear = box(.14, .06, .06, dark); ear.position.set(s * .2, .9, .54); ear.rotation.z = s * -.3; g.add(ear); }
    for (const [x, z] of [[-.18, -.26], [.18, -.26], [-.18, .26], [.18, .26]]) {
      const l = cyl(.05, .045, .5, dark); l.position.set(x, .25, z); g.add(l);
    }
    g.scale.setScalar(p.scale || .85);
    g.userData.tick = t => { head.rotation.x = Math.sin(t * 2) * .1; };
    return shadowed(g);
  }

  function dog(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#b87a42', { r: .85 });
    const body = box(.38, .36, .78, m); body.position.y = .56; g.add(body);
    const head = box(.28, .26, .3, m); head.position.set(0, .82, .42); g.add(head);
    const snout = box(.16, .12, .16, std('#e0c39a')); snout.position.set(0, .77, .6); g.add(snout);
    for (const s of [-1, 1]) { const ear = box(.06, .16, .1, std('#6e431f')); ear.position.set(s * .14, .92, .38); g.add(ear); }
    const tail = cyl(.035, .025, .34, m); tail.position.set(0, .75, -.44); tail.rotation.x = -.7; g.add(tail);
    for (const [x, z] of [[-.12, -.28], [.12, -.28], [-.12, .28], [.12, .28]]) {
      const l = cyl(.045, .04, .42, m); l.position.set(x, .21, z); g.add(l);
    }
    g.scale.setScalar(p.scale || .85);
    g.userData.tick = t => { tail.rotation.z = Math.sin(t * 10) * .45; };
    return shadowed(g);
  }

  function cat(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#e08b3c', { r: .85 });
    const body = sph(.22, m); body.scale.set(.85, .8, 1.5); body.position.y = .42; g.add(body);
    const head = sph(.17, m); head.position.set(0, .64, .32); g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.055, .12, 4), m); ear.position.set(s * .1, .8, .32); g.add(ear);
    }
    const tail = cyl(.025, .025, .45, m); tail.position.set(0, .62, -.34); tail.rotation.x = -.5; g.add(tail);
    for (const [x, z] of [[-.1, -.22], [.1, -.22], [-.1, .22], [.1, .22]]) {
      const l = cyl(.035, .03, .3, m); l.position.set(x, .15, z); g.add(l);
    }
    g.scale.setScalar(p.scale || .9);
    g.userData.tick = t => { tail.rotation.z = Math.sin(t * 3.5) * .3; };
    return shadowed(g);
  }

  function bird(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#4a8fe7', { r: .7 });
    const body = sph(.18, m); body.scale.set(.8, .8, 1.5); g.add(body);
    const head = sph(.11, m); head.position.set(0, .1, .24); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 6), std('#f5b027')); beak.rotation.x = Math.PI / 2; beak.position.set(0, .09, .38); g.add(beak);
    const wings = [];
    for (const s of [-1, 1]) {
      const wg = new THREE.Group(); wg.position.set(s * .12, .05, 0);
      const w = box(.48, .03, .22, m); w.position.x = s * .24; wg.add(w);
      g.add(wg); wings.push([wg, s]);
    }
    g.position.y = p.y ?? 2.2;
    g.userData.tick = t => {
      g.position.y = (p.y ?? 2.2) + Math.sin(t * 3) * .18;
      wings.forEach(([w, s]) => w.rotation.z = s * Math.sin(t * 11) * .55);
    };
    return shadowed(g);
  }

  function fish(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#ff7f32', { r: .4 });
    const body = sph(.2, m); body.scale.set(.6, .9, 1.6); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.18, .28, 4), m);
    tail.rotation.x = -Math.PI / 2; tail.position.z = -.38; g.add(tail);
    g.position.y = p.y ?? .35;
    g.userData.tick = t => {
      tail.rotation.y = Math.sin(t * 9) * .45;
      g.rotation.y = Math.sin(t * 2) * .15;
    };
    return shadowed(g);
  }

  // ==================== 2. ROADS & VEHICLES (الطرق والمركبات) ====================
  function roadStraight(p = {}) {
    const g = new THREE.Group(), len = p.len || 10, w = p.w || 3.4;
    const road = box(len, .14, w, std('#2c3038', { r: .88 })); road.position.y = .07; g.add(road);
    const curbM = std('#c6cbd2', { r: .75 });
    for (const sz of [-1, 1]) {
      const curb = box(len, .2, .28, curbM); curb.position.set(0, .1, sz * (w / 2 + .14)); g.add(curb);
    }
    const lineM = std('#f4f4f6', { r: .5 });
    for (let x = -len / 2 + .8; x < len / 2 - .4; x += 1.4) {
      const dash = box(.75, .02, .12, lineM); dash.position.set(x, .145, 0); g.add(dash);
    }
    return shadowed(g);
  }

  function roadCross(p = {}) {
    const g = new THREE.Group(), len = p.len || 10, w = p.w || 3.4, m = std('#2c3038', { r: .88 });
    const r1 = box(len, .14, w, m); r1.position.y = .07; g.add(r1);
    const r2 = box(w, .142, len, m); r2.position.y = .071; g.add(r2);
    const lineM = std('#f4f4f6', { r: .5 });
    for (const d of [-1, 1]) for (let k = -1; k <= 1; k++) {
      const c1 = box(.22, .02, .65, lineM); c1.position.set(d * (w / 2 + .4), .15, k * .9); g.add(c1);
      const c2 = box(.65, .02, .22, lineM); c2.position.set(k * .9, .15, d * (w / 2 + .4)); g.add(c2);
    }
    return shadowed(g);
  }

  function bridge(p = {}) {
    const g = new THREE.Group(), len = p.len || 9, w = p.w || 3.2, h = p.h || 1.6;
    const deck = box(len, .28, w, std('#9aa0a8', { r: .8 })); deck.position.y = h; g.add(deck);
    const asp = box(len, .05, w - .4, std('#2c3038', { r: .88 })); asp.position.y = h + .16; g.add(asp);
    for (const sz of [-1, 1]) {
      const rail = box(len, .35, .12, std('#d0d5dc')); rail.position.set(0, h + .3, sz * (w / 2 - .1)); g.add(rail);
    }
    for (const x of [-len / 3, 0, len / 3]) for (const z of [-w / 3, w / 3]) {
      const colm = cyl(.22, .26, h, std('#7d838c')); colm.position.set(x, h / 2, z); g.add(colm);
    }
    return shadowed(g);
  }

  function car(p = {}) {
    const g = new THREE.Group(), bodyC = p.color || '#e04f3d';
    const chassis = box(1.8, .48, .92, std(bodyC, { r: .35, m: .25 })); chassis.position.y = .42; g.add(chassis);
    const cabin = box(1.0, .42, .8, std(bodyC, { r: .35, m: .25 })); cabin.position.set(-.1, .84, 0); g.add(cabin);
    const glass = box(1.04, .32, .84, std('#7cc5f5', { r: .1, m: .2 })); glass.position.set(-.1, .84, 0); g.add(glass);
    const wheelM = std('#1d2024', { r: .85 });
    for (const [x, z] of [[-.55, -.48], [.55, -.48], [-.55, .48], [.55, .48]]) {
      const w = cyl(.22, .22, .14, wheelM); w.rotation.x = Math.PI / 2; w.position.set(x, .22, z); g.add(w);
    }
    g.scale.setScalar(p.scale || 1);
    if (p.drive) {
      const span = p.span || 8;
      g.userData.tick = t => { g.position.x = ((t * (p.speed || 2.5)) % span) - span / 2; };
    }
    return shadowed(g);
  }

  function truck(p = {}) {
    const g = new THREE.Group();
    const cab = box(.85, .85, 1.05, std(p.color || '#2e6fd9', { r: .4, m: .2 })); cab.position.set(.85, .68, 0); g.add(cab);
    const cargo = box(1.75, 1.05, 1.12, std('#f2f4f7', { r: .7 })); cargo.position.set(-.55, .8, 0); g.add(cargo);
    const wheelM = std('#1d2024', { r: .85 });
    for (const [x, z] of [[-1.0, -.56], [-.2, -.56], [.85, -.56], [-1.0, .56], [-.2, .56], [.85, .56]]) {
      const w = cyl(.25, .25, .16, wheelM); w.rotation.x = Math.PI / 2; w.position.set(x, .25, z); g.add(w);
    }
    g.scale.setScalar(p.scale || 1);
    return shadowed(g);
  }

  function streetLamp(p = {}) {
    const g = new THREE.Group(), h = p.h || 2.8, m = std('#484e57', { m: .7, r: .35 });
    const pole = cyl(.06, .09, h, m); pole.position.y = h / 2; g.add(pole);
    const arm = box(.7, .06, .06, m); arm.position.set(.32, h, 0); g.add(arm);
    const bulb = sph(.14, std('#fff2a6', { extra: { emissive: new THREE.Color('#ffda5c') } })); bulb.position.set(.62, h - .06, 0); g.add(bulb);
    return shadowed(g);
  }

  function trafficLight(p = {}) {
    const g = new THREE.Group(), h = p.h || 2.6;
    const pole = cyl(.06, .08, h, std('#383d45', { m: .6 })); pole.position.y = h / 2; g.add(pole);
    const head = box(.28, .85, .28, std('#1f2329')); head.position.y = h + .3; g.add(head);
    const cols = ['#ff3b30', '#ffcc00', '#34c759'];
    cols.forEach((c, i) => {
      const l = sph(.08, std(c, { extra: { emissive: new THREE.Color(c) } }));
      l.position.set(0, h + .55 - i * .25, .14); g.add(l);
    });
    return shadowed(g);
  }

  // ==================== 3. HOUSES & BUILDINGS (البيوت والمباني) ====================
  function modernHouse(p = {}) {
    const g = new THREE.Group(), w = p.w || 3.2, d = p.d || 2.8, h = p.h || 2.1;
    const base = box(w, h, d, std(p.color || '#f4f1ea', { r: .8 })); base.position.y = h / 2; g.add(base);
    const roof = box(w + .3, .18, d + .3, std('#3c424c', { r: .6 })); roof.position.y = h + .09; g.add(roof);
    const winM = std('#7cc5f5', { r: .1, m: .3 });
    for (const x of [-w * .26, w * .26]) {
      const win = box(.65, .65, .08, winM); win.position.set(x, h * .58, d / 2 + .02); g.add(win);
    }
    const door = box(.55, 1.05, .08, std('#6e482b')); door.position.set(0, .52, d / 2 + .02); g.add(door);
    return shadowed(g);
  }

  function villageHouse(p = {}) {
    const g = new THREE.Group(), w = p.w || 2.8, d = p.d || 2.6, h = p.h || 1.9;
    const wall = box(w, h, d, std('#d9b88c', { r: .95 })); wall.position.y = h / 2; g.add(wall);
    const roof = box(w + .25, .22, d + .25, std('#b88f5c', { r: .95 })); roof.position.y = h + .11; g.add(roof);
    const dome = sph(w * .28, std('#d9b88c', { r: .95 })); dome.scale.y = .7; dome.position.y = h + .22; g.add(dome);
    const door = box(.52, 1.0, .08, std('#5c3c22')); door.position.set(0, .5, d / 2 + .02); g.add(door);
    return shadowed(g);
  }

  function apartment(p = {}) {
    const g = new THREE.Group(), floors = p.floors || 4, w = p.w || 2.6, d = p.d || 2.4, fh = .85;
    const body = box(w, floors * fh, d, std(p.color || '#d8dde3', { r: .8 })); body.position.y = floors * fh / 2; g.add(body);
    const winM = std('#6ab7eb', { r: .1, m: .25 });
    for (let f = 0; f < floors; f++) for (const x of [-.65, 0, .65]) {
      const win = box(.38, .42, .06, winM); win.position.set(x, f * fh + .48, d / 2 + .02); g.add(win);
    }
    return shadowed(g);
  }

  function factory(p = {}) {
    const g = new THREE.Group();
    const hall = box(3.6, 1.8, 2.8, std('#8d949e', { r: .85 })); hall.position.y = .9; g.add(hall);
    const roof = box(3.8, .15, 3.0, std('#5a6068')); roof.position.y = 1.85; g.add(roof);
    const stack = cyl(.22, .3, 2.2, std('#b84b39')); stack.position.set(1.2, 2.5, -.8); g.add(stack);
    const puffs = [];
    for (let i = 0; i < 4; i++) {
      const pf = sph(.22 + i * .06, std('#e6eaef', { r: 1, extra: { transparent: true, opacity: .7 } }));
      pf.position.set(1.2, 3.8 + i * .5, -.8); g.add(pf); puffs.push(pf);
    }
    g.userData.tick = t => puffs.forEach((pf, i) => {
      const u = (t * .45 + i / 4) % 1;
      pf.position.y = 3.6 + u * 2.2;
      pf.position.x = 1.2 + u * .8;
      pf.scale.setScalar(.6 + u * 1.1);
    });
    return shadowed(g);
  }

  function greenhouse(p = {}) {
    const g = new THREE.Group(), w = p.w || 3.4, d = p.d || 4.2, h = p.h || 2.0;
    const frameM = std('#d8e0e8', { m: .6, r: .3 });
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#d8f3ff', roughness: .08, transparent: true, opacity: .38, depthWrite: false });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassM); shell.position.y = h / 2; g.add(shell);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, 0, d / 2]) {
      const post = box(.08, h, .08, frameM); post.position.set(x, h / 2, z); g.add(post);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .65, 1.0, 4), glassM);
    roof.rotation.y = Math.PI / 4; roof.position.y = h + .5; g.add(roof);
    return shadowed(g);
  }

  function windTurbine(p = {}) {
    const g = new THREE.Group(), h = p.h || 4.2, wm = std('#f3f5f8', { r: .4, m: .2 });
    const tower = cyl(.1, .22, h, wm); tower.position.y = h / 2; g.add(tower);
    const hub = new THREE.Group(); hub.position.set(0, h, .22); g.add(hub);
    hub.add(sph(.16, wm));
    for (let i = 0; i < 3; i++) {
      const piv = new THREE.Group(); piv.rotation.z = i * Math.PI * 2 / 3;
      const b = box(.14, 1.5, .04, wm); b.position.y = .75; piv.add(b); hub.add(piv);
    }
    g.userData.tick = t => { hub.rotation.z = -t * (p.speed || 2.4); };
    return shadowed(g);
  }

  function solarPanel(p = {}) {
    const g = new THREE.Group();
    const stand = cyl(.08, .1, .7, std('#7b828c', { m: .6 })); stand.position.y = .35; g.add(stand);
    const panel = box(1.8, .08, 1.2, std('#1c3d7a', { m: .4, r: .2 }));
    panel.position.y = .78; panel.rotation.x = .45; g.add(panel);
    const rim = box(1.88, .06, 1.28, std('#c8cdd4', { m: .7 })); rim.position.y = .76; rim.rotation.x = .45; g.add(rim);
    return shadowed(g);
  }

  function waterTower(p = {}) {
    const g = new THREE.Group();
    for (const [x, z] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) {
      const leg = cyl(.07, .09, 2.2, std('#6d747e', { m: .6 })); leg.position.set(x, 1.1, z); g.add(leg);
    }
    const tank = cyl(.85, .85, 1.2, std('#5aa2e6', { r: .4, m: .2 })); tank.position.y = 2.75; g.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.92, .5, 16), std('#3f7cb8')); cap.position.y = 3.6; g.add(cap);
    return shadowed(g);
  }

  // ==================== 4. PLANTS & NATURE (النباتات والطبيعة) ====================
  function palmTree(p = {}) {
    const g = new THREE.Group(), h = p.h || 3.0;
    const trunk = cyl(.12, .2, h, std('#8a623c', { r: .95 })); trunk.position.y = h / 2; trunk.rotation.z = .08; g.add(trunk);
    const crown = new THREE.Group(); crown.position.set(-.1, h, 0); g.add(crown);
    const leafM = std('#3e8e38', { r: .75 });
    for (let i = 0; i < 6; i++) {
      const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 3;
      const leaf = box(.28, .06, 1.35, leafM); leaf.position.z = .65; leaf.rotation.x = .35;
      piv.add(leaf); crown.add(piv);
    }
    g.scale.setScalar(p.scale || 1);
    g.userData.tick = t => { crown.rotation.z = Math.sin(t * 1.6) * .04; };
    return shadowed(g);
  }

  function pineTree(p = {}) {
    const g = new THREE.Group();
    const trunk = cyl(.14, .18, 1.0, std('#6b4829')); trunk.position.y = .5; g.add(trunk);
    const leafM = std(p.color || '#2c6b36', { r: .85 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.95 - i * .22, 1.25, 10), leafM);
      cone.position.y = 1.3 + i * .72; g.add(cone);
    }
    g.scale.setScalar(p.scale || 1);
    return shadowed(g);
  }

  function bush(p = {}) {
    const g = new THREE.Group(), m = std(p.color || '#3e8c3a', { r: .9 });
    for (const [x, y, z, r] of [[0, .35, 0, .42], [.3, .28, .1, .3], [-.28, .28, -.1, .32], [0, .28, .28, .28]]) {
      const s = sph(r, m); s.position.set(x, y, z); g.add(s);
    }
    g.scale.setScalar(p.scale || 1);
    return shadowed(g);
  }

  function flowerBed(p = {}) {
    const g = new THREE.Group(), r = rng(p.seed || 7);
    const frame = box(1.8, .22, 1.1, std('#7a5330')); frame.position.y = .11; g.add(frame);
    const cols = ['#ff4f6d', '#ffd23a', '#a66bff', '#ff8a3d'];
    for (let i = 0; i < 12; i++) {
      const fx = (r() - .5) * 1.4, fz = (r() - .5) * .7;
      const stem = cyl(.02, .02, .25, std('#3b8a34')); stem.position.set(fx, .32, fz); g.add(stem);
      const fl = sph(.08, std(cols[i % cols.length])); fl.position.set(fx, .46, fz); g.add(fl);
    }
    return shadowed(g);
  }

  function cactus(p = {}) {
    const g = new THREE.Group(), m = std('#3b8a42', { r: .8 });
    const main = cyl(.18, .2, 1.5, m); main.position.y = .75; g.add(main);
    for (const [s, y] of [[-1, .85], [1, 1.05]]) {
      const armH = box(.35, .14, .14, m); armH.position.set(s * .22, y, 0); g.add(armH);
      const armV = cyl(.1, .11, .45, m); armV.position.set(s * .38, y + .22, 0); g.add(armV);
    }
    g.scale.setScalar(p.scale || 1);
    return shadowed(g);
  }

  function pond(p = {}) {
    const g = new THREE.Group(), r = p.r || 1.8;
    const w = new THREE.Mesh(new THREE.CircleGeometry(r, 32), std('#3694e8', { r: .1, m: .2, extra: { transparent: true, opacity: .85 } }));
    w.rotation.x = -Math.PI / 2; w.position.y = .04; g.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .14, 10, 32), std('#9a9080', { r: .95 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = .04; g.add(rim);
    return g;
  }

  function cloud(p = {}) {
    const g = new THREE.Group(), m = std('#ffffff', { r: .95 });
    for (const [x, y, z, r] of [[0, 0, 0, .55], [.48, -.06, 0, .42], [-.48, -.08, 0, .4], [.22, .12, .18, .38]]) {
      const s = sph(r, m); s.position.set(x, y, z); g.add(s);
    }
    g.position.y = p.y ?? 4.2;
    g.userData.tick = t => { g.position.x = (p.x ?? 0) + Math.sin(t * .4) * .6; };
    return g;
  }

  function moon(p = {}) {
    const m = sph(p.r || .9, new THREE.MeshBasicMaterial({ color: '#f5f0d5', fog: false }));
    m.position.y = p.y ?? 5.5;
    return m;
  }

  Object.assign(ASSETS, {
    // Animals
    horse, cow, camel, sheep, dog, cat, bird, fish,
    // Roads & Vehicles
    road_straight: roadStraight, road_cross: roadCross, bridge, car, truck, street_lamp: streetLamp, traffic_light: trafficLight,
    // Houses & Buildings
    modern_house: modernHouse, village_house: villageHouse, apartment, factory, greenhouse, wind_turbine: windTurbine, solar_panel: solarPanel, water_tower: waterTower,
    // Plants & Nature
    palm_tree: palmTree, pine_tree: pineTree, bush, flower_bed: flowerBed, cactus, pond, cloud, moon,
  });
}
