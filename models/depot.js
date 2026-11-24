// Midland Terminal Railway depot at Gillett, as it stood about 1896-1900.
//
// Units are feet. Local axes: x east, y up, z south. Origin: ground level at the
// north-west corner of the main body (the track side is the west side, x < 0).
//
// Every part carries userData.ev, one of:
//   'plan'       measured from the Sanborn fire insurance sheets (1896, 1900)
//   'photo'      visible in the Denver Public Library photograph (south end and track side)
//   'inferred'   partly visible, or required by what is visible
//   'conjecture' not shown by any source found so far (street side, north end, colours)
// and userData.note, a sentence saying what the evidence is.

export const DEPOT = {
  length: 59.5,        // north-south, Sanborn
  width: 20.7,         // east-west, Sanborn
  bay: { z0: 25.3, z1: 39.0, depth: 4.2 },   // track-side bay, Sanborn
  // The next four were re-measured on the 2,000-pixel copy of the photograph (22 Nov 2026), taking the
  // south gable as 20.7 ft wide (about 25 px per foot across, about 30 px per foot vertically).
  deck: 2.2,           // platform height above ground: three steps; snow hides its foot
  wall: 13.0,          // wall height above the platform, to where the roof meets the wall
  pitch: 34,           // roof pitch in degrees (30 to 37)
  eave: 5.7,           // eave overhang: the roof runs straight out over the platform
  rake: 3.0,           // overhang at the gable ends
  // platform outline from the Sanborn sheet (x, z)
  platform: [[-15.5, -10.4], [32.6, -10.4], [32.6, 70.7], [0, 70.7], [0, 120.5], [-15.5, 120.5]],
};

export const EVIDENCE = {
  plan: { color: 0x2563eb, label: 'Measured from the Sanborn sheets' },
  photo: { color: 0x4d7c0f, label: 'Visible in the photograph' },
  inferred: { color: 0xd97706, label: 'Inferred from what is visible' },
  conjecture: { color: 0xdc2626, label: 'Conjecture: no source found' },
};

export function buildDepot(THREE) {
  const D = DEPOT, P = D.pitch * Math.PI / 180, tanP = Math.tan(P), cosP = Math.cos(P);
  const eaveY = D.deck + D.wall, ridgeY = eaveY + D.width / 2 * tanP;
  const bayC = (D.bay.z0 + D.bay.z1) / 2, bayHalf = (D.bay.z1 - D.bay.z0) / 2;
  // the cross gable over the bay: its ridge is level with the main ridge in the photograph, so it is steeper
  const crossHalf = bayHalf + 1.5, tanC = (ridgeY - eaveY) / crossHalf, PC = Math.atan(tanC);
  const group = new THREE.Group();
  const parts = [];

  // ---- textures
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const sidingTex = canvasTex(64, 64, (g, w, h) => {         // lap siding, one course about every 5 inches
    g.fillStyle = '#d9d2bd'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(60,50,35,.45)'; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y + 1.5, w, 1); }
  });
  const shingleTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#5d5145'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 1.5);
      for (let x = (y / 8 % 2) * 6; x < w; x += 12) g.fillRect(x, y, 1, 8);
    }
  });
  const brickTex = canvasTex(32, 32, (g, w, h) => {
    g.fillStyle = '#8a4a36'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(230,220,200,.6)';
    for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 1); for (let x = (y / 8 % 2) * 8; x < w; x += 16) g.fillRect(x, y, 1, 8); }
  });
  const plankTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#8b7557'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.3)';
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
  });

  const BASE = { wall: 0xd9d2bd, trim: 0x6f6a5c, roof: 0x5d5145, brick: 0x8a4a36, deck: 0x8b7557, timber: 0x6b5a45,
                 glass: 0x1f2a30, door: 0x5a5347, sign: 0x1c1c1c, iron: 0x3a3a3a, tie: 0x4a3f33, ballast: 0x8d8674 };
  function material(kind, tex, repeat) {
    const m = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : BASE[kind], roughness: kind === 'glass' ? 0.25 : 0.95, side: THREE.DoubleSide });
    if (tex) { m.map = tex.clone(); m.map.needsUpdate = true; if (repeat) m.map.repeat.set(repeat[0], repeat[1]); }
    m.userData = { base: tex ? 0xffffff : BASE[kind], map: m.map || null };
    return m;
  }
  function add(mesh, ev, part, note, shadow = true) {
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    mesh.userData = { ev, part, note };
    group.add(mesh); parts.push(mesh);
    return mesh;
  }
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  function boxAt(x0, y0, z0, x1, y1, z1, mat) {
    const m = box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return m;
  }
  function beam(ax, ay, az, bx, by, bz, t, mat) {          // square timber from a to b
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz), len = a.distanceTo(b);
    const m = box(t, len, t, mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }

  // ---- platform (Sanborn outline; height and construction from the photograph)
  {
    const sh = new THREE.Shape(D.platform.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, D.deck, 0);
    add(new THREE.Mesh(g, [material('deck', plankTex, [0.25, 0.25]), material('timber')]), 'plan', 'Platform deck',
      'Outline traced from the 1896 Sanborn sheet: about 49 ft wide around the building, narrowing to a 16 ft strip running 50 ft further south along the track. Height of a little over 2 ft is from the photograph (three steps at the south end).');
    const pts = D.platform;
    for (let i = 0; i < pts.length; i++) {                   // posts and a skirt beam round the edge
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 8));
      add(beam(ax, D.deck - 0.6, az, bx, D.deck - 0.6, bz, 0.7, material('timber')), 'photo', 'Platform framing', 'A heavy timber edge beam on posts is visible along the track side in the photograph.');
      for (let k = 0; k < n; k++) {
        const t = k / n;
        add(boxAt(ax + (bx - ax) * t - 0.35, 0, az + (bz - az) * t - 0.35, ax + (bx - ax) * t + 0.35, D.deck - 0.5, az + (bz - az) * t + 0.35, material('timber')),
          'inferred', 'Platform posts', 'Post spacing is assumed; the photograph shows a timber-framed platform.');
      }
    }
    const riser = D.deck / 3;
    for (let s = 1; s < 3; s++) {                             // steps at the south end, seen in the photograph
      add(boxAt(-13, D.deck - 0.25 - s * riser, 120.5 + (s - 1) * 1.0, -3, D.deck - s * riser, 121.6 + (s - 1) * 1.0, material('deck', plankTex, [0.2, 0.05])),
        'photo', 'Platform steps (south end)', 'Three steps up to the platform are visible at the right of the photograph, which makes it a little over 2 ft high. Their width is estimated.');
    }
    for (let s = 1; s < 3; s++) {
      add(boxAt(32.6 + (s - 1) * 1.0, D.deck - 0.25 - s * riser, 8, 33.7 + (s - 1) * 1.0, D.deck - s * riser, 16, material('deck', plankTex, [0.05, 0.2])),
        'conjecture', 'Platform steps (street side)', 'Some way up from Midland Terminal Ry. Avenue is needed; its position is not recorded.');
    }
  }

  // ---- walls
  const wallNote = 'Footprint from the Sanborn sheets: main body about 21 by 60 ft, one storey, frame. Lap siding and a wall height of about 13 ft above the platform are from the photograph.';
  function wall(x0, z0, x1, z1, ev = 'plan', note = wallNote) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = box(len, D.wall, 0.4, material('wall', sidingTex, [len / 6, D.wall / 3.3]));
    m.position.set((x0 + x1) / 2, D.deck + D.wall / 2, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    return add(m, ev, 'Wall', note);
  }
  wall(0, 0, 0, D.bay.z0); wall(0, D.bay.z1, 0, D.length);                       // west, either side of the bay
  wall(D.width, 0, D.width, D.length);                                           // east
  const bayNote = 'The Sanborn sheets draw a bay about 14 ft wide projecting about 4 ft on the track side, a little south of mid-length. The photograph shows it under a cross gable.';
  wall(-D.bay.depth, D.bay.z0, -D.bay.depth, D.bay.z1, 'plan', bayNote);
  wall(-D.bay.depth, D.bay.z0, 0, D.bay.z0, 'plan', bayNote); wall(-D.bay.depth, D.bay.z1, 0, D.bay.z1, 'plan', bayNote);
  for (const z of [0, D.length - 0.4]) {                                         // gable end walls
    const sh = new THREE.Shape([[0, 0], [D.width, 0], [D.width, D.wall], [D.width / 2, D.wall + D.width / 2 * tanP], [0, D.wall]].map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
    g.translate(0, D.deck, z);
    const m = new THREE.Mesh(g, material('wall', sidingTex, [0.16, 0.3]));
    add(m, z ? 'photo' : 'inferred', z ? 'South gable end' : 'North gable end',
      z ? 'The south gable end faces the camera in the photograph: lap siding to the peak, two windows, steep roof.' : 'The north end is not photographed; it is drawn to match the south end.');
  }
  {                                                                               // bay gable
    const sh = new THREE.Shape([[-bayHalf, 0], [bayHalf, 0], [bayHalf, (crossHalf - bayHalf) * tanC], [0, crossHalf * tanC], [-bayHalf, (crossHalf - bayHalf) * tanC]].map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(-D.bay.depth + 0.4, eaveY, bayC);
    add(new THREE.Mesh(g, material('wall', sidingTex, [0.16, 0.3])), 'photo', 'Bay gable', 'A cross gable over the bay is visible at the far end of the track side in the photograph.');
  }
  for (const [x, z] of [[0, 0], [D.width, 0], [0, D.length], [D.width, D.length], [-D.bay.depth, D.bay.z0], [-D.bay.depth, D.bay.z1]]) {
    add(boxAt(x - 0.3, D.deck, z - 0.3, x + 0.3, eaveY, z + 0.3, material('trim')), 'photo', 'Corner boards', 'Corner boards show in the photograph. Their colour is not known.');
  }

  // ---- roof
  const roofNote = 'Steep gable roof with wood shingles ("x" on the Sanborn sheet means shingle). Measured on the 2,000-pixel photograph the pitch is about 34 degrees (30 to 37), and the roof runs straight out nearly 6 ft beyond the walls to shelter the platform.';
  const roofMat = () => material('roof', shingleTex, [8, 3]);
  function slab(side, z0, z1, xLow) {                       // main roof plane; side -1 west, +1 east
    const xRidge = D.width / 2, run = Math.abs(xRidge - xLow), len = run / cosP;
    const m = box(len, 0.45, z1 - z0, roofMat());
    m.position.set((xRidge + xLow) / 2, ridgeY - run * tanP / 2 + 0.25, (z0 + z1) / 2);
    m.rotation.z = side < 0 ? P : -P;
    return add(m, 'photo', 'Roof', roofNote);
  }
  const lap = crossHalf + 1.5;                               // half-width of the cross roof, with its overhang
  slab(-1, -D.rake, bayC - lap, -D.eave); slab(-1, bayC + lap, D.length + D.rake, -D.eave);
  slab(-1, bayC - lap, bayC + lap, 0);                       // behind the cross gable the main plane stops at the wall line
  slab(1, -D.rake, D.length + D.rake, D.width + D.eave);
  add(boxAt(D.width / 2 - 0.35, ridgeY + 0.2, -D.rake, D.width / 2 + 0.35, ridgeY + 0.75, D.length + D.rake, material('trim')), 'inferred', 'Ridge board', 'A ridge cap is assumed.');
  const crossNote = 'The photograph shows a tall cross gable over the bay, its ridge level with the main ridge and its front standing about 3 ft forward of the bay wall. Its width is not measurable in that view; it is drawn a little wider than the bay, which makes it steeper than the main roof.';
  const xW = -D.bay.depth - 3;
  for (const s of [-1, 1]) {                                 // cross gable over the bay
    const run = lap, len = run / Math.cos(PC), xE = D.width / 2;
    const m = box(xE - xW, 0.45, len, roofMat());
    m.position.set((xW + xE) / 2, ridgeY - run * tanC / 2 + 0.25, bayC + s * run / 2);
    m.rotation.x = s * PC;
    add(m, 'photo', 'Cross gable roof', crossNote);
    add(beam(xW + 0.25, ridgeY + 0.1, bayC, xW + 0.25, ridgeY + 0.1 - lap * tanC, bayC + s * lap, 0.45, material('trim')), 'photo', 'Barge board (cross gable)', crossNote);
  }
  add(beam(xW + 0.25, ridgeY + 0.1, bayC, xW + 0.25, ridgeY - 4.0, bayC, 0.35, material('trim')), 'photo', 'Gable truss (cross gable)', 'A post and a level tie, painted light, show in the peak of the cross gable in the photograph.');
  add(beam(xW + 0.25, ridgeY - 3.3, bayC - 3.3 / tanC, xW + 0.25, ridgeY - 3.3, bayC + 3.3 / tanC, 0.35, material('trim')), 'photo', 'Gable truss (cross gable)', 'A post and a level tie, painted light, show in the peak of the cross gable in the photograph.');

  // knee braces under the eaves
  const braceNote = 'Long diagonal braces run from about window height on the wall out to the edge of the eave, carrying the roof over the platform. Three show on the southern part of the track side; the spacing elsewhere is assumed.';
  for (let z = 3; z < D.length; z += 7.6) {
    if (!(z > D.bay.z0 - 4 && z < D.bay.z1 + 4)) add(beam(0, eaveY - 8.5, z, -D.eave + 0.6, eaveY - (D.eave - 0.6) * tanP - 0.3, z, 0.45, material('trim')), 'photo', 'Knee brace (track side)', braceNote);
    add(beam(D.width, eaveY - 8.5, z, D.width + D.eave - 0.6, eaveY - (D.eave - 0.6) * tanP - 0.3, z, 0.45, material('trim')), 'conjecture', 'Knee brace (street side)', 'The street side is not photographed; braces are repeated from the track side.');
  }
  // gable-end trusses and barge boards
  function gableTrim(z, ev, note) {
    const y0 = ridgeY + 0.1, half = D.width / 2 + D.eave;
    for (const s of [-1, 1]) add(beam(D.width / 2, y0, z, D.width / 2 + s * half, y0 - half * tanP, z, 0.5, material('trim')), ev, 'Barge board', note);
    add(beam(D.width / 2, y0, z, D.width / 2, y0 - 4.6, z, 0.4, material('trim')), ev, 'Gable truss', note);
    add(beam(D.width / 2 - 3.75 / tanP, y0 - 3.75, z, D.width / 2 + 3.75 / tanP, y0 - 3.75, z, 0.4, material('trim')), ev, 'Gable truss', note);
    for (const s of [-1, 1]) add(beam(D.width / 2 + s * (D.width / 2 + 0.2), eaveY - 6.3, z > D.length / 2 ? D.length : 0, D.width / 2 + s * (D.width / 2 + 0.2), eaveY - 3.6, z, 0.45, material('trim')),
      ev, 'Knee brace (gable end)', note);
  }
  gableTrim(D.length + D.rake - 0.25, 'photo', 'In the peak of the south gable the photograph shows a king post from the apex with a level tie about 11 ft long across it, the post ending a little below the tie; no struts. Brackets carry the overhang at both corners.');
  gableTrim(-D.rake + 0.25, 'conjecture', 'The north end is not photographed; the south gable is repeated.');

  // chimneys
  for (const z of [29, 49]) {
    add(boxAt(D.width / 2 - 1.25, ridgeY - 1.2, z - 1.25, D.width / 2 + 1.25, ridgeY + 5.6, z + 1.25, material('brick', brickTex, [2, 5])), 'photo', 'Chimney',
      'Two brick chimneys stand on the ridge in the photograph, about 2.5 ft square with a band and a corbelled cap. One is just north of where the cross gable meets the ridge, the other about 13 ft from the south end; positions are good to a few feet.');
    add(boxAt(D.width / 2 - 1.5, ridgeY + 4.3, z - 1.5, D.width / 2 + 1.5, ridgeY + 4.6, z + 1.5, material('brick')), 'photo', 'Chimney', 'A projecting band below the cap, as in the photograph.');
    add(boxAt(D.width / 2 - 1.55, ridgeY + 5.6, z - 1.55, D.width / 2 + 1.55, ridgeY + 6.1, z + 1.55, material('brick')), 'photo', 'Chimney', 'Corbelled cap as in the photograph.');
  }

  // ---- openings. face: W, E, N, S, BW (bay front), BN, BS (bay returns)
  const FACE = {
    W: { n: [-1, 0], at: (c) => [0, c] }, E: { n: [1, 0], at: (c) => [D.width, c] },
    N: { n: [0, -1], at: (c) => [c, 0] }, S: { n: [0, 1], at: (c) => [c, D.length] },
    BW: { n: [-1, 0], at: (c) => [-D.bay.depth, c] }, BN: { n: [0, -1], at: (c) => [c, D.bay.z0] }, BS: { n: [0, 1], at: (c) => [c, D.bay.z1] },
  };
  function panel(face, c, y0, w, h, depth, mat, ev, part, note) {
    const f = FACE[face], [px, pz] = f.at(c), alongX = f.n[0] === 0;
    const m = box(alongX ? w : depth, h, alongX ? depth : w, mat);
    m.position.set(px + f.n[0] * depth / 2, y0 + h / 2, pz + f.n[1] * depth / 2);
    return add(m, ev, part, note, false);
  }
  function windowAt(face, c, w, h, cols, rows, ev, note, sill = 3) {
    const y0 = D.deck + sill;
    panel(face, c, y0 - 0.25, w + 0.7, h + 0.5, 0.5, material('trim'), ev, 'Window frame', note);
    panel(face, c, y0, w, h, 0.62, material('glass'), ev, 'Window', note);
    for (let i = 1; i < cols; i++) panel(face, c - w / 2 + w * i / cols, y0, 0.1, h, 0.7, material('trim'), ev, 'Window bars', note);
    for (let j = 1; j < rows; j++) panel(face, c, y0 + h * j / rows - 0.05, w, 0.1, 0.7, material('trim'), ev, 'Window bars', note);
  }
  function doorAt(face, c, w, h, ev, part, note) {
    panel(face, c, D.deck, w + 0.8, h + 0.5, 0.5, material('trim'), ev, part + ' frame', note);
    panel(face, c, D.deck, w, h, 0.62, material('door'), ev, part, note);
  }
  const sNote = 'Two windows in the south gable end, about 3.6 ft wide and 4.7 ft high in wide flat casings, are covered with a close grid in the photograph, which suggests bars or mesh on a freight or baggage room.';
  windowAt('S', 6.3, 3.6, 4.7, 8, 10, 'photo', sNote, 3.2); windowAt('S', 14.6, 3.6, 4.7, 8, 10, 'photo', sNote, 3.2);
    doorAt('W', 43.75, 7.5, 8, 'photo', 'Wide opening (freight door?)',
    'Immediately south of the bay the photograph shows a wide dark opening under the eave, with freight stacked in front of it: most likely an open freight door. Siding shows across its foot, so it could instead be a recessed porch. Its width is estimated.');
  doorAt('W', 50.5, 3, 7.2, 'photo', 'Door', 'A single door shows between the wide opening and the window in the photograph. Position along the wall is good to about 2 ft.');
  windowAt('W', 56, 3, 5.6, 2, 2, 'photo', 'A two-over-two sash window near the south corner of the track side is clear in the photograph.', 3.2);
  doorAt('W', 21, 3.2, 7.2, 'inferred', 'Door north of the bay', 'Beyond the bay the photograph shows a doorway with a small sign board over it, under the eave of the northern half. Its position is estimated.');
  windowAt('W', 10, 3, 5.6, 2, 2, 'conjecture', 'This part of the track side is hidden by the bay in the photograph.', 3.2);
  const bNote = 'An operator\'s bay with windows looking up and down the track is standard and is partly visible in the photograph; the glazing pattern is assumed.';
  windowAt('BW', bayC - 3.1, 2.8, 5.6, 2, 2, 'inferred', bNote); windowAt('BW', bayC + 3.1, 2.8, 5.6, 2, 2, 'inferred', bNote);
  windowAt('BN', -D.bay.depth / 2 - 0.3, 2, 7.4, 2, 2, 'inferred', 'Drawn to match the south side of the bay.', 3.2);
  windowAt('BS', -D.bay.depth / 2 - 0.3, 2, 7.4, 2, 2, 'photo', 'The south side of the bay is clear in the photograph: a tall narrow window, two panes wide, nearly filling a wall about 4 ft wide. That width agrees with the 4.2 ft the Sanborn sheet gives for the bay.', 3.2);
  panel('BS', -0.75, D.deck + 7.6, 1.3, 1.1, 0.25, material('sign'), 'photo', 'Sign: Postal Telegraph Office', 'A small board lettered POSTAL TELEGRAPH OFFICE hangs on the south side of the bay in the photograph.');
  const eNote = 'The street side is not shown in any photograph found so far. Doors and windows are arranged as on comparable small depots.';
  doorAt('E', 49, 6, 8, 'conjecture', 'Freight door', eNote); doorAt('E', 14, 3.2, 7.2, 'conjecture', 'Waiting room door', eNote);
  for (const z of [6, 22, 32]) windowAt('E', z, 3, 6, 2, 2, 'conjecture', eNote);
  const nNote = 'The north end is not shown in any photograph found so far.';
  windowAt('N', 5.6, 3, 6, 2, 2, 'conjecture', nNote); windowAt('N', 15.1, 3, 6, 2, 2, 'conjecture', nNote);

  // ---- station name board on an arm from the bay, facing up and down the track
  {
    const y = eaveY - 2.2, x0 = -D.bay.depth, x1 = x0 - 8.2;
    add(beam(x0, y + 1.4, bayC, x1, y + 1.4, bayC, 0.3, material('iron')), 'photo', 'Sign bracket', 'The name board hangs from an arm projecting from the bay in the photograph.');
    add(beam(x0, y + 3.6, bayC, x1 + 2, y + 1.5, bayC, 0.18, material('iron')), 'photo', 'Sign bracket', 'Stay above the arm, as in the photograph.');
    const tex = canvasTex(512, 96, (g, w, h) => {
      g.fillStyle = '#17171a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e9e4d2'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#f1ecda'; g.font = '700 62px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GILLETT', w / 2, h / 2 + 3);
    });
    const m = box(7, 1.35, 0.15, [material('sign'), material('sign'), material('sign'), material('sign'),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })]);
    m.material[4].userData = m.material[5].userData = { base: 0xffffff, map: tex };
    m.position.set(x0 - 4.4, y + 0.6, bayC);
    add(m, 'photo', 'Station name board', 'A dark board lettered GILLETT. hangs beside the bay in the photograph, with a small panel at each end giving mileages and a line of smaller lettering beneath. Only the name is reproduced here.', false);
  }

  // ---- pole and signal beside the name board
  add(beam(-D.bay.depth - 10, D.deck, bayC + 1.2, -D.bay.depth - 10, D.deck + 21, bayC + 1.2, 0.6, material('timber')), 'photo', 'Pole',
    'A tall bare pole stands on the platform in front of the bay in the photograph, probably for the telegraph wires.');
  add(beam(-D.bay.depth - 8.2, eaveY - 0.8, bayC, -D.bay.depth - 13.5, eaveY - 0.8, bayC, 0.2, material('iron')), 'photo', 'Signal arm',
    'The arm carrying the name board runs on past the pole to a small target or lamp at its end, probably the train order signal.');
  add(boxAt(-D.bay.depth - 14.3, eaveY - 1.9, bayC - 0.1, -D.bay.depth - 13.4, eaveY - 0.5, bayC + 0.1, material('iron')), 'photo', 'Signal target',
    'A small oval target or lamp at the end of the arm in the photograph.');

  // ---- track beside the platform
  for (const cx of [-21.2, -35.2]) {
    for (let z = -45; z <= 155; z += 2) add(boxAt(cx - 4.2, 0.05, z - 0.35, cx + 4.2, 0.6, z + 0.35, material('tie')), 'plan', 'Track', 'The Sanborn sheets draw several parallel tracks west of the platform; two are shown. Their exact spacing is estimated.', false);
    for (const s of [-2.35, 2.35]) add(boxAt(cx + s - 0.12, 0.6, -45, cx + s + 0.12, 1.05, 155, material('iron')), 'plan', 'Track', 'Standard gauge, 4 ft 8.5 in. The Midland Terminal was a standard-gauge line.', false);
  }

  return { group, parts, dims: { eaveY, ridgeY, bayC } };
}

// Switch the model between its natural colours and colours that show the evidence for each part.
export function colourByEvidence(parts, on) {
  for (const mesh of parts) {
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (on) { m.map = null; m.color.setHex(EVIDENCE[mesh.userData.ev].color); }
      else { m.map = m.userData.map || null; m.color.setHex(m.userData.base ?? 0xffffff); }
      m.needsUpdate = true;
    }
  }
}
