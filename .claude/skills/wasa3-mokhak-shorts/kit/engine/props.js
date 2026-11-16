// Prop library. Each prop = { group, focus }. ADD NEW PROPS PER TOPIC here (lesson vis:repeat: never loop an old shot).
// Billboards (userData.bb = true) are turned to face the camera by main.js. Everything is built from primitives + canvas textures.
export function buildProps(THREE) {
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const out = {};
  const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.0, ...o });
  const add = (name, group, focus = [0, 0.8, 0]) => { out[name] = { group, focus: new THREE.Vector3(...focus) }; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; return m; };
  const wood = std({ color: 0x9a6a3a });
  // ---- hens: photo-style cutout billboards (replace draw() with a real PNG via TextureLoader when available) ----
  const henTex = (col) => tex(128, 112, (g) => { g.clearRect(0, 0, 128, 112); g.fillStyle = col; g.beginPath(); g.ellipse(58, 66, 42, 32, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(98, 36, 16, 18, 0, 0, 7); g.fill(); g.fillStyle = '#d8281c'; g.fillRect(92, 14, 12, 8); g.fillStyle = '#f2b533'; g.beginPath(); g.moveTo(112, 36); g.lineTo(126, 41); g.lineTo(112, 46); g.fill(); g.fillStyle = '#111'; g.fillRect(100, 32, 4, 4); });
  const hens = new THREE.Group();
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.6), new THREE.MeshBasicMaterial({ map: henTex(i % 3 ? '#b4521f' : '#7a3a1a'), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); m.position.set(-3 + rnd() * 6, 0.3, -2 + rnd() * 4); m.userData.bb = true; hens.add(m); }
  add('hens', hens, [0, 0.4, 0]);
  // ---- coop: posts + corrugated roof + wire mesh ----
  const coop = new THREE.Group();
  [[-2.2, -1.6], [2.2, -1.6], [-2.2, 1.6], [2.2, 1.6]].forEach(([x, z]) => coop.add(box(0.14, 2.2, 0.14, wood, x, 1.1, z)));
  const roofT = tex(256, 256, (g, w, h) => { for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#8e949a' : '#c9ced3'; g.fillRect(i * 8, 0, 8, h); } }, [3, 2]);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 3.9), std({ map: roofT, metalness: 0.5, roughness: 0.4 })); roof.position.y = 2.3; roof.rotation.z = 0.06; roof.castShadow = true; coop.add(roof);
  const meshT = tex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(210,170,110,.9)'; g.lineWidth = 2; for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 18) { g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 9, y); g.lineTo(x + 18, y + 8); g.lineTo(x + 9, y + 16); g.closePath(); g.stroke(); } }, [10, 5]);
  const wallM = new THREE.MeshBasicMaterial({ map: meshT, transparent: true, side: THREE.DoubleSide });
  [[0, 1.1, 1.6, 0], [0, 1.1, -1.6, 0], [-2.2, 1.1, 0, Math.PI / 2], [2.2, 1.1, 0, Math.PI / 2]].forEach(([x, y, z, r]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(r ? 3.2 : 4.4, 2.2), wallM); w.position.set(x, y, z); w.rotation.y = r; coop.add(w); });
  add('coop', coop, [0, 1.1, 0]);
  // ---- shield: curved steel plate (armor explainers) ----
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 48, 1, true, -0.9, 1.8), std({ color: 0x9aa4ae, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide })); shield.position.y = 1.2; shield.castShadow = true;
  const sg = new THREE.Group(); sg.add(shield); add('shield', sg, [0, 1.2, 0.2]);
  // ---- ruler with dimension arrow ----
  const rg = new THREE.Group(); rg.add(box(2.4, 0.06, 0.35, std({ color: 0xf2d27a }), 0, 0.03, 0));
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd400 }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 8), arrowMat); sh.rotation.z = Math.PI / 2; sh.position.y = 0.4; rg.add(sh);
  [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), arrowMat); c.rotation.z = -s * Math.PI / 2; c.position.set(s * 1.1, 0.4, 0); rg.add(c); });
  add('ruler', rg, [0, 0.3, 0]);
  return out;
}
