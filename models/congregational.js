// The Congregational church at Gillett: a frame church with a tower and spire at its south-east corner,
// built after July 1897 and in use by May 1898.
//
// Units are feet. Local axes: x east (the front), y up, z south. Origin: ground level at the centre of the body.
//
// Evidence classes (see EVIDENCE):
//   'photo'      visible in the view from the east hill (Denver Public Library X-8645, about 240 ft away)
//   'west'       visible in panorama No. 331, from the west, about half a mile away
//   'inferred'   follows from what is visible
//   'conjecture' not shown by any source found so far (the south side, the entrance, the interior)
// Every dimension is scaled from the one close photograph, at 9.5 pixels to the foot. The tower's width also comes
// out at 8.6 ft from where its two front corners meet the ground, which is an independent check on that scale.

export const CONG = {
  width: 21,        // body, north-south: 197 px
  length: 46,       // body, east-west: the far corner of the side wall is 19 percent further away than the near one
  wall: 14.2,       // to the eave: 135 px
  rise: 11,         // gable above the eave: 105 px, which makes the roof about 46 degrees
  tower: 8.7,       // square, standing outside the south wall, flush with the front
  belfry: 9.2,      // open stage of the tower
  spire: 15,        // shingled spire above it
};
CONG.pitch = Math.atan(CONG.rise / (CONG.width / 2)) * 180 / Math.PI;
CONG.ridge = CONG.wall + CONG.rise;
CONG.top = CONG.wall + CONG.belfry + 1.2 + CONG.spire;

export const EVIDENCE = {
  photo: { color: 0x4d7c0f, label: 'Visible in the view from the east hill' },
  west: { color: 0x2563eb, label: 'Visible in panorama No. 331, from the west' },
  inferred: { color: 0xd97706, label: 'Inferred from what is visible' },
  conjecture: { color: 0xdc2626, label: 'Conjecture: no source found' },
};

export function buildCongregational(THREE) {
  const C = CONG, hw = C.width / 2, hl = C.length / 2, T = C.tower;
  const group = new THREE.Group(), parts = [], materials = [];

  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const sidingTex = canvasTex(64, 64, (g, w, h) => {            // lap siding
    g.fillStyle = '#a79c86'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(40,32,22,.45)'; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, y + 1.5, w, 1); }
  });
  const bandTex = canvasTex(64, 64, (g, w, h) => {              // the banded gable: alternate light and dark courses
    for (let y = 0; y < h; y += 16) { g.fillStyle = '#b3a892'; g.fillRect(0, y, w, 9); g.fillStyle = '#6f6657'; g.fillRect(0, y + 9, w, 7); }
  });
  const shingleTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#4f473d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 1.5); for (let x = (y / 8 % 2) * 6; x < w; x += 12) g.fillRect(x, y, 1, 8); }
  });

  const BASE = { wall: 0xa79c86, trim: 0xe4dfd0, roof: 0x4f473d, glass: 0x1c2327, door: 0x4d4439, timber: 0x8a7c66, brick: 0x8a4a36, figure: 0x3b3b3b };
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
  // a flat polygon on a vertical wall. face: 'E' front (x = +hl), 'W' rear, 'N' (z = -hw), 'S' (z = +hw); pts are (along, up)
  function onWall(pts, face, off, m, at) {
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))));
    const d = at === undefined ? (face === 'E' ? hl : face === 'W' ? -hl : face === 'N' ? -hw : hw) : at;
    if (face === 'E') { g.rotateY(Math.PI / 2); g.translate(d + off, 0, 0); }             // along = -z, so 'along' runs south to north
    else if (face === 'W') { g.rotateY(-Math.PI / 2); g.translate(d - off, 0, 0); }
    else if (face === 'N') { g.rotateY(Math.PI); g.translate(0, 0, d - off); }
    else g.translate(0, 0, d + off);
    return new THREE.Mesh(g, m);
  }
  const rect = (a0, y0, a1, y1) => [[a0, y0], [a1, y0], [a1, y1], [a0, y1]];

  // ---- body walls
  const wallNote = 'Frame walls in horizontal siding, about 14 ft to the eave. The body is about 21 ft wide and 46 ft long: the width is measured directly on the front, the length from how much smaller the far end of the side wall appears than the near end.';
  const side = (z0, z1, ev, note) => add(boxAt(-hl, 0, z0, hl, C.wall, z1, mat('wall', ev, sidingTex, [7, 4.3])), ev, 'Side wall', note);
  side(-hw, -hw + 0.4, 'photo', wallNote + ' The north side shows in the photograph, steeply foreshortened.');
  side(hw - 0.4, hw, 'conjecture', 'The south side is not shown in any photograph found. It is drawn to match the north side.');
  const gable = (x, ev, note, tex) => {
    const s = new THREE.Shape([[-hw, 0], [hw, 0], [hw, C.wall], [-hw, C.wall]].map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x, 0, 0);
    add(new THREE.Mesh(g, mat('wall', ev, sidingTex, [0.16, 0.3])), ev, x > 0 ? 'Front wall' : 'Rear wall', note);
    const t = new THREE.Shape([[-hw, 0], [hw, 0], [0, C.rise]].map(p => new THREE.Vector2(p[0], p[1])));
    const tg = new THREE.ExtrudeGeometry(t, { depth: 0.4, bevelEnabled: false }); tg.rotateY(Math.PI / 2); tg.translate(x, C.wall, 0);
    add(new THREE.Mesh(tg, mat('wall', ev, tex, [0.12, 0.085])), ev, x > 0 ? 'Front gable' : 'Rear gable',
      x > 0 ? 'The gable over the front is finished in broad alternating light and dark bands, probably courses of shingle, above a level band at eave height.'
            : 'Panorama No. 331 shows the rear gable as a light triangle under the dark roof. Its finish is assumed to match the front.');
  };
  gable(hl - 0.4, 'photo', wallNote, bandTex);
  gable(-hl, 'west', 'The rear end shows in panorama No. 331 as a plain light gable. No openings can be made out.', bandTex);
  add(boxAt(hl, C.wall - 0.5, -hw - 0.2, hl + 0.2, C.wall + 0.4, hw + 0.2, mat('trim', 'photo')), 'photo', 'Band at the eave', 'A light band runs across the front at eave height, under the banded gable.', false);
  for (const [x, z] of [[hl, -hw], [-hl, -hw], [-hl, hw]]) add(boxAt(x - 0.25, 0, z - 0.25, x + 0.25, C.wall, z + 0.25, mat('trim', 'inferred')), 'inferred', 'Corner boards', 'Light corner boards are assumed; the corner by the side window looks lighter in the photograph.', false);

  // ---- roof
  {
    const ov = 1.0, run = hw + ov, len = Math.hypot(run, run * C.rise / hw), ang = Math.atan(C.rise / hw);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(C.length + 2 * ov, 0.35, len), mat('roof', 'photo', shingleTex, [9, 3]));
      m.position.set(0, C.ridge - (run * C.rise / hw) / 2 + 0.2, s * run / 2); m.rotation.x = s * ang;
      add(m, 'photo', 'Roof', 'A shingled gable roof of about 46 degrees, its ridge running east and west. The north slope shows in the photograph; the pitch is from the front gable.');
    }
    for (const x of [hl + ov - 0.15, -hl - ov + 0.15]) for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, len), mat('trim', x > 0 ? 'photo' : 'inferred'));
      m.position.set(x, C.ridge - (run * C.rise / hw) / 2 + 0.1, s * run / 2); m.rotation.x = s * ang;
      add(m, x > 0 ? 'photo' : 'inferred', 'Barge board', 'Light barge boards edge the front gable in the photograph; the rear is assumed to match.', false);
    }
  }

  // ---- openings
  const glass = mat('glass', 'photo'), trimP = mat('trim', 'photo');
  function windowOn(face, c, w, h, sill, cols, rows, ev, part, note, at) {
    const tm = ev === 'photo' ? trimP : mat('trim', ev), gm = ev === 'photo' ? glass : mat('glass', ev);
    add(onWall(rect(c - w / 2 - 0.35, sill - 0.3, c + w / 2 + 0.35, sill + h + 0.35), face, 0.03, tm, at), ev, part + ' frame', note, false);
    add(onWall(rect(c - w / 2, sill, c + w / 2, sill + h), face, 0.06, gm, at), ev, part, note, false);
    for (let i = 1; i < cols; i++) add(onWall(rect(c - w / 2 + w * i / cols - 0.08, sill, c - w / 2 + w * i / cols + 0.08, sill + h), face, 0.09, tm, at), ev, part + ' bars', note, false);
    for (let j = 1; j < rows; j++) add(onWall(rect(c - w / 2, sill + h * j / rows - 0.06, c + w / 2, sill + h * j / rows + 0.06), face, 0.09, tm, at), ev, part + ' bars', note, false);
  }
  windowOn('E', 0, 7.2, 8.6, 3.7, 3, 2, 'photo', 'Front window',
    'A large window of three tall lights fills the middle of the front: about 7 ft wide and 8.5 ft high, its sill nearly 4 ft up. Its glazing bars are drawn simply; the photograph shows three lights and a cross bar.');
  const nNote = 'One tall narrow window shows on the north side, about a quarter of the way back from the front. The others along the wall are assumed at the same spacing.';
  windowOn('N', -(hl - 11), 2.8, 8, 3.7, 1, 2, 'photo', 'Side window', nNote);       // on the north wall 'along' runs east to west
  for (const x of [hl - 23, hl - 35]) windowOn('N', -x, 2.8, 8, 3.7, 1, 2, 'inferred', 'Side window', nNote);
  for (const x of [hl - 35, hl - 23]) windowOn('S', x, 2.8, 8, 3.7, 1, 2, 'conjecture', 'Side window', 'The south side is not photographed; windows are repeated from the north side, leaving room for the tower.');

  // ---- tower at the south-east corner: outside the south wall, flush with the front
  const tx0 = hl - T, tx1 = hl, tz0 = hw, tz1 = hw + T, tcx = (tx0 + tx1) / 2, tcz = (tz0 + tz1) / 2;
  const towerNote = 'A square tower about 8.7 ft across stands at the south-east corner, beside the front. Its lower stage rises to the eave of the church. The width is measured two ways that agree: from the image scale, and from where its two front corners meet the ground.';
  add(boxAt(tx0, 0, tz0, tx1, C.wall, tz1, mat('wall', 'photo', sidingTex, [1.4, 4.3])), 'photo', 'Tower, lower stage', towerNote);
  for (const [x, z] of [[tx0, tz1], [tx1, tz1], [tx1, tz0]]) add(boxAt(x - 0.25, 0, z - 0.25, x + 0.25, C.wall, z + 0.25, mat('trim', 'inferred')), 'inferred', 'Tower corner boards', 'Assumed.', false);
  windowOn('E', -tcz, 2, 7.5, 3.5, 1, 2, 'photo', 'Tower window', 'A tall narrow opening shows in the east face of the tower, starting about 3 ft above the ground: a window, not a door.');
  {
    const d = onWall(rect(-1.6, 0.4, 1.6, 7.6), 'S', 0.06, mat('door', 'conjecture'), tz1); d.position.x = tcx;
    add(d, 'conjecture', 'Entrance', 'No door shows in either photograph. The front has only a window and the tower\'s east face only a window, so the entrance is drawn in the south face of the tower, the usual arrangement. It could equally have been on the south side of the church.', false);
    add(boxAt(tcx - 2.4, 0, tz1, tcx + 2.4, 0.4, tz1 + 3, mat('timber', 'conjecture')), 'conjecture', 'Step', 'Assumed.', false);
  }
  const y1 = C.wall, y2 = y1 + C.belfry, tm = mat('timber', 'photo'), wt = mat('trim', 'photo');
  add(boxAt(tx0 - 0.5, y1 - 0.2, tz0 - 0.5, tx1 + 0.5, y1 + 0.7, tz1 + 0.5, wt), 'photo', 'Tower band', 'A broad light band caps the lower stage of the tower, level with the eave band of the front.');
  const belfryNote = 'Above the band the tower is an open belfry about 9 ft high: corner posts, a post in the middle of each face, and a railing with close-set bars. No bell can be made out.';
  for (const [x, z] of [[tx0, tz0], [tx1, tz0], [tx0, tz1], [tx1, tz1]]) add(boxAt(x - 0.3 * Math.sign(x - tcx) - 0.3, y1, z - 0.3 * Math.sign(z - tcz) - 0.3, x - 0.3 * Math.sign(x - tcx) + 0.3, y2, z - 0.3 * Math.sign(z - tcz) + 0.3, tm), 'photo', 'Belfry post', belfryNote);
  for (const [x, z] of [[tcx, tz0 + 0.3], [tcx, tz1 - 0.3], [tx0 + 0.3, tcz], [tx1 - 0.3, tcz]]) add(boxAt(x - 0.2, y1, z - 0.2, x + 0.2, y2, z + 0.2, tm), 'photo', 'Belfry post', belfryNote, false);
  for (const yy of [y1 + 0.9, y1 + 3.1]) {
    add(boxAt(tx0 + 0.3, yy, tz0 + 0.2, tx1 - 0.3, yy + 0.2, tz0 + 0.4, tm), 'photo', 'Belfry railing', belfryNote, false);
    add(boxAt(tx0 + 0.3, yy, tz1 - 0.4, tx1 - 0.3, yy + 0.2, tz1 - 0.2, tm), 'photo', 'Belfry railing', belfryNote, false);
    add(boxAt(tx0 + 0.2, yy, tz0 + 0.3, tx0 + 0.4, yy + 0.2, tz1 - 0.3, tm), 'photo', 'Belfry railing', belfryNote, false);
    add(boxAt(tx1 - 0.4, yy, tz0 + 0.3, tx1 - 0.2, yy + 0.2, tz1 - 0.3, tm), 'photo', 'Belfry railing', belfryNote, false);
  }
  for (let k = 1; k < 10; k++) {
    const u = k / 10;
    for (const [x, z] of [[tx0 + T * u, tz0 + 0.3], [tx0 + T * u, tz1 - 0.3], [tx0 + 0.3, tz0 + T * u], [tx1 - 0.3, tz0 + T * u]])
      add(boxAt(x - 0.05, y1 + 1.0, z - 0.05, x + 0.05, y1 + 3.1, z + 0.05, tm), 'photo', 'Belfry railing', belfryNote, false);
  }
  add(boxAt(tx0 - 0.3, y1 + 0.7, tz0 - 0.3, tx1 + 0.3, y1 + 0.9, tz1 + 0.3, mat('timber', 'inferred')), 'inferred', 'Belfry floor', 'A floor under the open stage is assumed.', false);
  add(boxAt(tx0 - 0.7, y2, tz0 - 0.7, tx1 + 0.7, y2 + 0.8, tz1 + 0.7, wt), 'photo', 'Belfry cornice', 'A light cornice runs round the top of the belfry, under the spire.');
  {
    // spire: a low flared skirt, then a steep four-sided spire, all shingled
    const sm = mat('roof', 'photo', shingleTex, [3, 5]), yb = y2 + 0.8, note = 'A shingled four-sided spire about 15 ft high, flared outward at its foot. It is dark in this view and light in panorama No. 331, which is lit from the west.';
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.52, T * 0.85, 1.6, 4, 1), sm);
    skirt.rotation.y = Math.PI / 4; skirt.position.set(tcx, yb + 0.8, tcz); add(skirt, 'photo', 'Spire', note);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(T * 0.52, C.spire - 1.6, 4), sm);
    cone.rotation.y = Math.PI / 4; cone.position.set(tcx, yb + 1.6 + (C.spire - 1.6) / 2, tcz); add(cone, 'photo', 'Spire', note);
    CONG.top = yb + C.spire;
  }

  // ---- chimney
  add(boxAt(-hl + 5, C.ridge - 1.5, -0.9, -hl + 6.8, C.ridge + 3.2, 0.9, mat('brick', 'conjecture')), 'conjecture', 'Chimney',
    'A stove chimney near the rear is assumed. Panorama No. 331 shows small light marks at both ends of the roof that could be chimneys or trim; they cannot be read.');

  // figure for scale (not evidence)
  const scale = new THREE.Group();
  const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.1, 4, 8), new THREE.MeshStandardMaterial({ color: BASE.figure, roughness: 1 }));
  f.position.set(hl + 6, 2.85, -3); f.castShadow = true; scale.add(f);
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
