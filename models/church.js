// The Catholic church at Gillett (stone nave under a bowed roof, with a timber, barrel-roofed front), built in the 1890s.
//
// Units are feet. Local axes: x east, y up, z toward the front of the church.
// Origin: ground level at the centre of the whole footprint.
//
// Evidence classes (see EVIDENCE):
//   'photo'      visible in the photographs of 1919, about 1935 and the 1940s
//   'ruin'       visible in the photographs of the roofless shell (1960s, 1980)
//   'inferred'   follows from what is visible
//   'conjecture' not shown by any source found so far
// No measurement of the building has been found: every dimension is scaled from the photographs.
// Revised 22 Nov 2026 against Muriel Wolle's photograph (Denver Public Library X-3936, 2,000-pixel copy).

export const CHURCH = {
  width: 20,        // across the building
  nave: 33,         // length of the stone nave up to the arched cross wall
  cross: 3.5,       // thickness of the arched cross wall and its piers
  vestibule: 12.5,  // cross wall plus the timber front (the timber part is about 9 ft deep)
  wall: 11.5,       // height of the stone walls, and of the timber front, to the eave
  archRise: 8.6,    // the arched cross wall rises this far above the eave
  naveRise: 7.8,    // the bowed nave roof
  frontRise: 7.2,   // the barrel roof over the timber front
  hip: 6,           // length of the rounded rear end of the nave roof
};
CHURCH.length = CHURCH.nave + CHURCH.vestibule;
CHURCH.crown = CHURCH.wall + CHURCH.archRise;                        // top of the arched wall
CHURCH.ridge = CHURCH.wall + CHURCH.naveRise;                        // crown of the nave roof

export const EVIDENCE = {
  photo: { color: 0x4d7c0f, label: 'Visible in photographs of 1919 to the 1940s' },
  ruin: { color: 0x2563eb, label: 'Visible in photographs of the ruin' },
  inferred: { color: 0xd97706, label: 'Inferred from what is visible' },
  conjecture: { color: 0xdc2626, label: 'Conjecture: no source found' },
};

export function buildChurch(THREE) {
  const C = CHURCH, hw = C.width / 2, zN = -C.length / 2, zJ = zN + C.nave, zT = zJ + C.cross, zF = C.length / 2;   // rear, cross wall, timber front, front
  // a segment of a circle on a chord of half-width a with the given rise: radius, centre height, start angle
  const seg = (a, rise) => { const R = (a * a + rise * rise) / (2 * rise), cy = rise - R; return { R, cy, a0: Math.atan2(-cy, a) }; };
  const group = new THREE.Group(), parts = [], materials = [];

  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stoneTex = canvasTex(256, 256, (g, w, h) => {              // rubble masonry
    g.fillStyle = '#6f675a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w, y = rnd() * h, rx = 9 + rnd() * 16, ry = 6 + rnd() * 10, v = 120 + Math.floor(rnd() * 70);
      g.fillStyle = `rgb(${v + 8},${v},${v - 14})`;
      g.beginPath(); g.ellipse(x, y, rx, ry, rnd() * 0.6 - 0.3, 0, 7); g.fill();
    }
  });
  const brickTex = canvasTex(32, 32, (g, w, h) => {
    g.fillStyle = '#8a4a36'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(230,220,200,.55)';
    for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 1); for (let x = (y / 8 % 2) * 8; x < w; x += 16) g.fillRect(x, y, 1, 8); }
  });
  const boardTex = canvasTex(64, 64, (g, w, h) => {                // horizontal weatherboards
    g.fillStyle = '#6a5440'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,235,200,.08)'; g.fillRect(0, y + 2, w, 3); }
  });
  const shingleTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#5a4f44'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 1.5); for (let x = (y / 8 % 2) * 6; x < w; x += 12) g.fillRect(x, y, 1, 8); }
  });

  const BASE = { stone: 0x8f877a, brick: 0x8a4a36, board: 0x6a5440, roof: 0x5a4f44, dark: 0x1d1a17, timber: 0x5b4a3a, shutter: 0x4a3d30, figure: 0x3b3b3b };
  const cache = {};
  function mat(kind, ev, tex, repeat) {
    const key = kind + ev + (tex ? tex.uuid : '') + (repeat || '');
    if (cache[key]) return cache[key];
    const m = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : BASE[kind], roughness: 1, side: THREE.DoubleSide });
    if (tex) { m.map = tex.clone(); m.map.needsUpdate = true; if (repeat) m.map.repeat.set(repeat[0], repeat[1]); }
    m.userData = { base: tex ? 0xffffff : BASE[kind], map: m.map || null, ev };
    materials.push(m);
    return (cache[key] = m);
  }
  function add(mesh, ev, part, note, shadow = true) {
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    mesh.userData = { ev, part, note };
    group.add(mesh); parts.push(mesh);
    return mesh;
  }
  function boxAt(x0, y0, z0, x1, y1, z1, m) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), m);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return b;
  }
  function beam(a, b, t, m) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
    const o = new THREE.Mesh(new THREE.BoxGeometry(t, len, t), m);
    o.position.copy(va).add(vb).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return o;
  }
  // an opening with a segmental (shallow arched) head: w wide, h high overall
  function archShape(w, h) {
    const s = new THREE.Shape(), r = w / 2, rise = w * 0.3, a = seg(r, rise);
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - rise); s.absarc(0, h - rise + a.cy, a.R, a.a0, Math.PI - a.a0, false); s.lineTo(-r, 0);
    return s;
  }
  // put a flat shape on a wall. side: 'W' (x = -hw), 'E' (x = +hw), 'F' (front, z = zF)
  function onWall(shape, side, along, y, off, m) {
    const g = new THREE.ShapeGeometry(shape, 16);
    if (side === 'W') { g.rotateY(-Math.PI / 2); g.translate(-hw - off, y, along); }
    else if (side === 'E') { g.rotateY(Math.PI / 2); g.translate(hw + off, y, along); }
    else g.translate(along, y, zF + off);
    return new THREE.Mesh(g, m);
  }

  // ---- stone nave
  const stoneNote = 'Rubble stone walls with brick at the corners and round the openings show in every photograph. Wall height of about 11.5 ft is consistent with the doors: at that height the side door is 8.4 ft and the front doorway 7.5 ft.';
  const st = (rx, ry) => mat('stone', 'photo', stoneTex, [rx, ry]);
  add(boxAt(-hw, 0, zN, -hw + 1.5, C.wall, zJ, st(4, 1.4)), 'photo', 'Nave wall (door side)', stoneNote);
  add(boxAt(hw - 1.5, 0, zN, hw, C.wall, zJ, st(4, 1.4)), 'photo', 'Nave wall (far side)', stoneNote);
  add(boxAt(-hw, 0, zN, hw, C.wall, zN + 1.5, mat('stone', 'conjecture', stoneTex, [2.5, 1.4])), 'conjecture', 'Rear wall',
    'No photograph found shows the rear end of the church clearly. It is drawn as a plain stone wall under a hipped roof.');
  for (const [x, z] of [[-hw, zN], [hw, zN], [-hw, zJ], [hw, zJ]]) {
    add(boxAt(x - 0.9, 0, z - 0.9, x + 0.9, C.wall, z + 0.9, mat('brick', 'photo', brickTex, [1, 6])), 'photo', 'Brick corners',
      'Brick corner piers show at the front corners of the nave in the photographs and stand in the ruin. The rear corners are assumed to match.');
  }

  // openings: door side (four, one of them a door) and far side (three windows)
  const trim = mat('brick', 'photo', brickTex, [0.6, 0.6]), shut = mat('shutter', 'photo'), dark = mat('dark', 'photo');
  const winNote = 'Tall openings with shallow arched heads turned in brick, boarded up by the time of the photographs. On the side with the door they run, from the rear: window, narrow door, window, window, about 7 ft apart. Sizes and spacing are measured on the Wolle photograph and are good to about a foot.';
  function opening(side, along, w, h, sill, isDoor, ev, note) {
    add(onWall(archShape(w + 1.3, h + 0.65), side, along, sill - (isDoor ? 0 : 0.3), 0.04, ev === 'photo' ? trim : mat('brick', ev, brickTex, [0.6, 0.6])), ev, isDoor ? 'Side door surround' : 'Window surround', note, false);
    add(onWall(archShape(w, h), side, along, sill, 0.08, ev === 'photo' ? shut : mat('shutter', ev)), ev, isDoor ? 'Side door' : 'Window', note, false);
  }
  const bays = [6.4, 14.2, 21.0, 27.7].map(d => zN + d);                  // measured from the rear corner on the Wolle photograph
  opening('W', bays[0], 2.7, 6.8, 2.0, false, 'photo', winNote);
  opening('W', bays[1], 2.6, 8.4, 0, true, 'photo', winNote);
  opening('W', bays[2], 2.7, 6.8, 2.0, false, 'photo', winNote);
  opening('W', bays[3], 2.7, 6.8, 2.0, false, 'photo', winNote);
  for (const d of [17.3, 24.4]) {
    const sq = new THREE.Shape([[-1.3, 0], [1.3, 0], [1.3, 1.6], [-1.3, 1.6]].map(p => new THREE.Vector2(p[0], p[1])));
    add(onWall(sq, 'W', zN + d, C.wall - 2.0, 0.06, dark), 'photo', 'High opening', 'Two small oblong openings right under the eave, one between the door and the next window and one between the last two windows. Their purpose is not known; they look like later holes for loading hay.', false);
  }
  const farNote = 'The far side appears only in the 1919 postcard, at a steep angle: three tall openings can be made out, evenly spaced about 8 ft apart. Their places along the wall are measured through the solved camera of that postcard and are good to about 1.5 ft; their size is assumed to match the door side.';
  for (const d of [7.5, 16.0, 23.5]) opening('E', zN + d, 2.7, 6.8, 2.0, false, 'photo', farNote);

  // ---- nave roof: bowed, rounded off at the rear
  {
    const ov = 0.9, a = hw + ov, n = 20, secs = [];
    for (let i = 0; i <= 8; i++) { const q = i / 8; secs.push([zN - ov + q * (C.hip + ov), Math.max(0.05, C.naveRise * Math.sin(q * Math.PI / 2))]); }
    secs.push([zJ, C.naveRise]);
    const pos = [], uv = [], idx = [];
    secs.forEach(([z, rise], k) => {
      const g = seg(a, rise);
      for (let j = 0; j <= n; j++) {
        const x = -a + 2 * a * j / n;
        pos.push(x, C.wall + Math.sqrt(Math.max(0, g.R * g.R - x * x)) + g.cy, z); uv.push(z / 5, j / n * 5);
      }
      if (k) for (let j = 0; j < n; j++) { const p0 = (k - 1) * (n + 1) + j, p1 = k * (n + 1) + j; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    add(new THREE.Mesh(g, mat('roof', 'photo', shingleTex, [1, 1])), 'photo', 'Nave roof',
      'The Wolle photograph shows that the nave roof is bowed as well: shingled, curving up from the eaves to a crown only a little below the top of the arched wall, and rounded off at the rear. Earlier versions of this model gave the nave a plain pitched roof, which was wrong.');
  }

  // ---- the arched cross wall between nave and front, and the brick stacks
  {
    const a = seg(hw, C.archRise);
    const s = new THREE.Shape(); s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, C.wall); s.absarc(0, C.wall + a.cy, a.R, a.a0, Math.PI - a.a0, false); s.lineTo(-hw, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: C.cross, bevelEnabled: false, curveSegments: 24 });
    g.translate(0, 0, zJ);
    add(new THREE.Mesh(g, mat('stone', 'ruin', stoneTex, [0.12, 0.12])), 'ruin', 'Arched cross wall',
      'A thick stone wall crosses the building with a great arch edged in brick, rising about 8 ft above the side walls. Its ends show as broad piers of dark stone beside the brick corners in the Wolle photograph, and they are the tall piers left standing in the ruin. Both roofs follow its curve.');
    const ring = new THREE.Shape(); ring.absarc(0, a.cy, a.R + 0.3, a.a0, Math.PI - a.a0, false); ring.absarc(0, a.cy, a.R - 0.9, Math.PI - a.a0, a.a0, true);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: C.cross + 0.2, bevelEnabled: false, curveSegments: 24 });
    rg.translate(0, C.wall, zJ - 0.1);
    add(new THREE.Mesh(rg, mat('brick', 'ruin', brickTex, [0.3, 0.3])), 'ruin', 'Brick arch', 'Brick voussoirs round the great arch, as in the ruin photographs.');
  }
  const stackNote = 'A brick stack about 2 ft square rises through the nave roof at the eave, just behind the arched wall on the door side; its top is about 19 ft up. A second stack on the far side shows in the 1919 postcard; its height there is uncertain and is drawn a little taller.';
  add(boxAt(-hw + 0.3, C.wall - 1, zJ - 2.6, -hw + 2.5, 19.2, zJ - 0.4, mat('brick', 'photo', brickTex, [2, 8])), 'photo', 'Chimney (door side)', stackNote);
  add(boxAt(-hw + 0.1, 19.2, zJ - 2.8, -hw + 2.7, 19.7, zJ - 0.2, mat('brick', 'photo', brickTex, [2, 1])), 'photo', 'Chimney (door side)', stackNote);
  add(boxAt(hw - 2.5, C.wall - 1, zJ - 2.6, hw - 0.3, 22, zJ - 0.4, mat('brick', 'inferred', brickTex, [2, 10])), 'inferred', 'Chimney (far side)', stackNote);
  add(boxAt(-hw + 0.4, C.wall - 1, zN + 0.6, -hw + 2.2, 16.4, zN + 2.4, mat('brick', 'photo', brickTex, [2, 5])), 'photo', 'Small stack (rear)',
    'A small stack or vent stands at the rear corner of the roof on the door side in the Wolle photograph.');

  // ---- timber front with barrel roof
  const boardNote = 'The front part is timber, clad in horizontal boards, as wide as the nave and with its eave at the same height. Measured on the Wolle photograph it is only about 9 ft deep, less than the 13 ft first assumed.';
  const bd = (rx, ry) => mat('board', 'photo', boardTex, [rx, ry]);
  add(boxAt(-hw, 0, zT, -hw + 0.5, C.wall, zF, bd(1.5, 3.5)), 'photo', 'Front, side wall', boardNote);
  add(boxAt(hw - 0.5, 0, zT, hw, C.wall, zF, bd(1.5, 3.5)), 'photo', 'Front, side wall', boardNote);
  add(boxAt(-hw, 0, zF - 0.5, hw, C.wall, zF, bd(3, 3.5)), 'photo', 'Front wall', boardNote);
  {
    const a = seg(hw, C.frontRise);
    const tymp = new THREE.Shape(); tymp.moveTo(-hw, 0); tymp.absarc(0, a.cy, a.R, a.a0, Math.PI - a.a0, false);
    const g = new THREE.ShapeGeometry(tymp, 24); g.translate(0, C.wall, zF - 0.1);
    add(new THREE.Mesh(g, mat('board', 'photo', boardTex, [0.16, 0.3])), 'photo', 'Front, arched head', 'The arched head of the front is boarded, with two diamond-shaped louvres.');
    for (const x of [-3.6, 3.6]) {
      const d = new THREE.Shape([[0, -1.5], [1.7, 0], [0, 1.5], [-1.7, 0]].map(p => new THREE.Vector2(p[0], p[1])));
      add(onWall(d, 'F', x, C.wall + 0.8, 0.12, mat('shutter', 'photo')), 'photo', 'Diamond louvre', 'Two diamond-shaped louvred openings show in every early photograph. They sit at about eave height, lower than first drawn.', false);
    }
    add(boxAt(-hw - 0.05, 9.0, zF, hw + 0.05, 9.4, zF + 0.12, mat('timber', 'photo')), 'photo', 'Band across the front', 'A level band crosses the front at the height of the door head in the Wolle photograph.', false);
    const door = new THREE.Shape([[-3.25, 0], [3.25, 0], [3.25, 7.6], [-3.25, 7.6]].map(p => new THREE.Vector2(p[0], p[1])));
    add(onWall(door, 'F', 0, 0, 0.14, dark), 'photo', 'Front doorway',
      'A wide square-headed doorway, about 6.5 ft wide and 7.5 ft high, stands in the middle of the front. The doors had gone by 1919; the opening may have been widened when the building was used as a hay barn.', false);
    const b = seg(hw + 0.5, C.frontRise + 0.3);
    const roof = new THREE.Shape(); roof.absarc(0, b.cy, b.R + 0.45, b.a0, Math.PI - b.a0, false); roof.absarc(0, b.cy, b.R, Math.PI - b.a0, b.a0, true);
    const rg = new THREE.ExtrudeGeometry(roof, { depth: zF - zT + 1.4, bevelEnabled: false, curveSegments: 32 });
    rg.translate(0, C.wall, zT);
    add(new THREE.Mesh(rg, mat('roof', 'photo', shingleTex, [0.5, 0.5])), 'photo', 'Barrel roof',
      'A shingled roof of curved section covers the timber front and projects a little beyond it as a hood. It springs from the eave and its crown is about 19 ft up, just below the top of the arched wall.');
  }

  // ---- belfry on the arched wall
  {
    const y0 = C.crown + 0.5, zc = zJ + C.cross / 2, h = 5.0, a = 2.4, tm = mat('timber', 'photo'), note = 'A small open timber belfry with a pyramid roof and a cross stands on top of the arched wall, with the bell still hanging in it in the Wolle photograph. It is about 5 ft square with posts about 5 ft high, much smaller than first drawn, and the top of the cross is about 29 ft above the ground.';
    add(boxAt(-a - 0.4, y0 - 1.2, zc - a - 0.4, a + 0.4, y0, zc + a + 0.4, tm), 'photo', 'Belfry base', note);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(beam([sx * a, y0, zc + sz * a], [sx * a * 0.9, y0 + h, zc + sz * a * 0.9], 0.35, tm), 'photo', 'Belfry post', note);
    for (const yy of [y0 + 2.2, y0 + h - 0.2]) for (const s of [-1, 1]) {
      const k = yy > y0 + 3 ? 0.9 : 0.96;
      add(beam([-a * k, yy, zc + s * a * k], [a * k, yy, zc + s * a * k], 0.25, tm), 'photo', 'Belfry rail', note, false);
      add(beam([s * a * k, yy, zc - a * k], [s * a * k, yy, zc + a * k], 0.25, tm), 'photo', 'Belfry rail', note, false);
    }
    for (const s of [-1, 1]) {
      add(beam([-a, y0, zc + s * a], [a * 0.96, y0 + 2.2, zc + s * a * 0.96], 0.18, tm), 'photo', 'Belfry brace', note, false);
      add(beam([a, y0, zc + s * a], [-a * 0.96, y0 + 2.2, zc + s * a * 0.96], 0.18, tm), 'photo', 'Belfry brace', note, false);
    }
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 1.5, 12), mat('dark', 'photo'));
    bell.position.set(0, y0 + h - 1.3, zc);
    add(bell, 'photo', 'Bell', 'A bell hangs in the belfry in the Wolle photograph.', false);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.3, 1.5, 4), mat('roof', 'photo', shingleTex, [2, 1]));
    cone.rotation.y = Math.PI / 4; cone.position.set(0, y0 + h + 0.75, zc);
    add(cone, 'photo', 'Belfry roof', note);
    add(boxAt(-0.12, y0 + h + 1.4, zc - 0.12, 0.12, y0 + h + 4.0, zc + 0.12, tm), 'photo', 'Cross', 'A cross tops the belfry in every early photograph.', false);
    add(boxAt(-0.8, y0 + h + 3.0, zc - 0.12, 0.8, y0 + h + 3.25, zc + 0.12, tm), 'photo', 'Cross', 'A cross tops the belfry in every early photograph.', false);
    CHURCH.top = y0 + h + 4.0;
  }

  // figure for scale (not evidence)
  const scale = new THREE.Group();
  const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.1, 4, 8), new THREE.MeshStandardMaterial({ color: BASE.figure, roughness: 1 }));
  f.position.set(4.5, 2.85, zF + 4); f.castShadow = true; scale.add(f);
  group.add(scale);

  return { group, parts, materials, scale };
}

export function colourByEvidence(model, on) {
  for (const m of model.materials) {
    if (on) { m.map = null; m.color.setHex(EVIDENCE[m.userData.ev].color); }
    else { m.map = m.userData.map; m.color.setHex(m.userData.base); }
    m.needsUpdate = true;
  }
}
