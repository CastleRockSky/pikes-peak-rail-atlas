// The Monte Carlo at Gillett: J.H. Wolfe's resort building of 1895 on the hill above his lake, a school by about 1897.
//
// Units are feet. Local axes: +x is the south-west gable end (the end with the door), +z is the long side facing the
// town (north-west), -z the long side facing the lake (south-east), y up. Origin: ground level at the centre of the main block.
//
// Evidence classes (see EVIDENCE):
//   'school'     visible in "No. 2 school at Gillett" (Denver Public Library X-8652): the door end and the lake side, close
//   'lake'       visible in the lake photograph (X-8651): the lake side and the low addition, from below
//   'west'       visible in panorama No. 331: the door end and the town side, from half a mile
//   'inferred'   follows from what is visible
//   'conjecture' not shown by any source found so far (the north-east end, the interior)
// Nothing is measured on the ground. The wall height is scaled from doors and from the children standing against the
// walls; the proportions come from the perspective of the school photograph.

export const MC = {
  // width, length and rise are from the perspective of the school photograph (vanishing points), scaled by the wall height:
  // see research/19-monte-carlo-model.md. Middle two-thirds of the trials: width 18-30, length 56-66, rise 10-13.
  width: 24,        // the gable end
  length: 60,       // main block
  wall: 13,         // to the eave: a tall single storey; this figure sets the scale and is itself an estimate
  rise: 12,         // gable above the eave (45 degrees)
  dormer: { w: 9, up: 5.5, rise: 4.5 },     // wall dormers: width, wall above the eave, gable rise
  addition: { len: 14, width: 18, h: 10 },  // low flat-roofed addition at the north-east end
  axis: 212,        // bearing the door end faces, degrees east of north (good to perhaps 15 degrees)
};
MC.ridge = MC.wall + MC.rise;

export const EVIDENCE = {
  school: { color: 0x4d7c0f, label: 'Visible in the school photograph (close)' },
  lake: { color: 0x0d9488, label: 'Visible in the lake photograph' },
  west: { color: 0x2563eb, label: 'Visible in panorama No. 331, from the west' },
  inferred: { color: 0xd97706, label: 'Inferred from what is visible' },
  conjecture: { color: 0xdc2626, label: 'Conjecture: no source found' },
};

export function buildMonteCarlo(THREE) {
  const C = MC, hw = C.width / 2, hl = C.length / 2, D = C.dormer, P = Math.atan(C.rise / hw);
  const group = new THREE.Group(), parts = [], materials = [];

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const sidingTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(60,55,45,.35)'; g.fillRect(0, y, w, 1.3); }
  });
  const shingleTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#5a534a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, w, 1.5); for (let x = (y / 8 % 2) * 6; x < w; x += 12) g.fillRect(x, y, 1, 8); }
  });
  const BASE = { wall: 0xe8e4d8, trim: 0xf4f1e8, roof: 0x5a534a, glass: 0x1c2327, door: 0x4d4439, timber: 0x8a7c66, figure: 0x3b3b3b };
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
  // a flat rectangle on a wall. face 'X+' / 'X-' (gable ends; 'along' is z) or 'Z+' / 'Z-' (long sides; 'along' is x); d = wall position
  function onWall(a0, y0, a1, y1, face, d, off, m) {
    const t = 0.05, s = face[1] === '+' ? 1 : -1;
    return face[0] === 'X' ? boxAt(d + s * off, y0, a0, d + s * (off + t), y1, a1, m) : boxAt(a0, y0, d + s * off, a1, y1, d + s * (off + t), m);
  }
  function opening(face, d, c, w, y0, h, ev, part, note, door = false, cols = 2, rows = 2) {
    const tm = mat('trim', ev), gm = mat(door ? 'door' : 'glass', ev);
    add(onWall(c - w / 2 - 0.4, y0 - (door ? 0 : 0.3), c + w / 2 + 0.4, y0 + h + 0.45, face, d, 0.02, tm), ev, part + ' frame', note, false);
    add(onWall(c - w / 2, y0, c + w / 2, y0 + h, face, d, 0.08, gm), ev, part, note, false);
    if (door) return;
    for (let i = 1; i < cols; i++) add(onWall(c - w / 2 + w * i / cols - 0.07, y0, c - w / 2 + w * i / cols + 0.07, y0 + h, face, d, 0.14, tm), ev, part + ' bars', note, false);
    for (let j = 1; j < rows; j++) add(onWall(c - w / 2, y0 + h * j / rows - 0.06, c + w / 2, y0 + h * j / rows + 0.06, face, d, 0.14, tm), ev, part + ' bars', note, false);
  }

  // ---- walls
  const wallNote = 'A long frame building painted white, in narrow horizontal siding, one tall storey to the eave with rooms in the roof. Solving the perspective of the school photograph gives a block about 24 ft across the gable end and 60 ft long, if the walls are 13 ft high: the length is good to about 5 ft, the width to about 6.';
  add(boxAt(-hl, 0, -hw, hl, C.wall, -hw + 0.4, mat('wall', 'school', sidingTex, [9, 4])), 'school', 'Lake-side wall', wallNote);
  add(boxAt(-hl, 0, hw - 0.4, hl, C.wall, hw, mat('wall', 'west', sidingTex, [9, 4])), 'west', 'Town-side wall', wallNote + ' This side shows only in the distant panorama.');
  const gableEnd = (x, ev, note) => {
    add(boxAt(x - 0.2, 0, -hw, x + 0.2, C.wall, hw, mat('wall', ev, sidingTex, [4.3, 4])), ev, x > 0 ? 'Door end' : 'North-east end', note);
    const t = new THREE.Shape([[-hw, 0], [hw, 0], [0, C.rise]].map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(t, { depth: 0.4, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x - 0.2, C.wall, 0);
    add(new THREE.Mesh(g, mat('roof', ev, shingleTex, [0.15, 0.15])), ev, 'Shingled gable', 'The gables are filled with dark shingles above the white walls: clear in the school photograph, and the door-end gable reads grey against the white wall in the panorama.');
  };
  gableEnd(hl, 'school', wallNote);
  gableEnd(-hl, 'conjecture', 'The north-east end is hidden by the low addition in the lake photograph and is not shown elsewhere. Drawn to match the other end.');
  for (const [x, z] of [[hl, -hw], [hl, hw], [-hl, -hw], [-hl, hw]]) add(boxAt(x - 0.3, 0, z - 0.3, x + 0.3, C.wall, z + 0.3, mat('trim', x > 0 ? 'school' : 'inferred')), x > 0 ? 'school' : 'inferred', 'Corner boards', 'White corner boards show at the door end.', false);

  // ---- roof
  const roofNote = 'A steep shingled roof of about 45 degrees with a boxed eave. Two small vents or finials stand on the ridge in the school photograph.';
  {
    const ov = 1.2, run = hw + ov, len = run / Math.cos(P);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(C.length + 2 * ov, 0.4, len), mat('roof', s < 0 ? 'school' : 'west', shingleTex, [12, 4]));
      m.position.set(0, C.ridge - run * Math.tan(P) / 2 + 0.25, s * run / 2); m.rotation.x = s * P;
      add(m, s < 0 ? 'school' : 'west', 'Roof', roofNote);
    }
    // barge boards with the curved brace and post the school photograph shows in each gable peak
    const braceNote = 'Each gable peak carries a light ornamental truss: a post from the apex and a curved brace either side, under white barge boards. Clear on the door end and on the dormer in the school photograph.';
    const truss = (x, zc, half, yb, rise, ev, alongX) => {
      const pt = (a, y) => alongX ? [zc + a, y, x] : [x, y, zc + a];          // a = offset across the gable
      const bar = (a0, y0, a1, y1, t) => {
        const A = pt(a0, y0), B = pt(a1, y1), va = new THREE.Vector3(...A), vb = new THREE.Vector3(...B);
        const o = new THREE.Mesh(new THREE.BoxGeometry(t, va.distanceTo(vb), t), mat('trim', ev));
        o.position.copy(va).add(vb).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
        add(o, ev, 'Gable truss', braceNote, false);
      };
      for (const s of [-1, 1]) {
        bar(0, yb + rise + 0.2, s * (half + 0.3), yb - 0.2, 0.45);                       // barge board
        const k = 0.42;                                                                 // curved brace, in three chords
        const pts = [[s * half * k, yb + rise * (1 - k)], [s * half * k * 0.55, yb + rise * (1 - k) - rise * 0.05], [s * half * k * 0.2, yb + rise * (1 - k) - rise * 0.02], [0, yb + rise * (1 - k) + rise * 0.08]];
        for (let i = 0; i < 3; i++) bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0.25);
      }
      bar(0, yb + rise, 0, yb + rise * 0.5, 0.3);
    };
    truss(hl + 1.0, 0, hw + 1.2, C.wall, C.rise, 'school', false);
    truss(-hl - 1.0, 0, hw + 1.2, C.wall, C.rise, 'conjecture', false);
    for (const x of [hl * 0.45, -hl * 0.5]) add(boxAt(x - 0.5, C.ridge, -0.5, x + 0.5, C.ridge + 1.6, 0.5, mat('trim', 'school')), 'school', 'Ridge vent', roofNote, false);

    // ---- wall dormers: the wall carries straight up through the eave into a small gable
    const dormer = (xc, s, ev, note) => {
      const z = s * hw, top = C.wall + D.up, depth = (D.up + D.rise) / Math.tan(P) + 1;
      const sh = new THREE.Shape([[-D.w / 2, 0], [D.w / 2, 0], [D.w / 2, D.up], [0, D.up + D.rise], [-D.w / 2, D.up]].map(p => new THREE.Vector2(p[0], p[1])));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
      if (s > 0) g.translate(0, 0, -depth);
      g.translate(xc, C.wall, z);
      add(new THREE.Mesh(g, [mat('wall', ev, sidingTex, [0.16, 0.3]), mat('roof', ev, shingleTex, [0.2, 0.2])]), ev, 'Wall dormer', note);
      opening(s > 0 ? 'Z+' : 'Z-', z, xc, 2.8, C.wall + 0.6, 5.2, ev, 'Dormer window', note, false, 1, 2);
      truss(z + s * 0.6, xc, D.w / 2 + 0.3, top, D.rise, ev, true);
    };
    dormer(hl - 28, -1, 'school', 'On the lake side one dormer rises flush with the wall, near the middle (about 28 ft from the door end), with a tall window in it and a door beneath. The school photograph and the lake photograph both show it.');
    for (const xc of [C.length * 0.2, -C.length * 0.12]) dormer(xc, 1, 'west', 'Panorama No. 331 shows two small gables on the side facing the town. Their positions along the wall are read from a very small image.');
  }

  // ---- openings
  const endNote = 'The door end has a door with a light over it in the middle and a tall window either side.';
  opening('X+', hl + 0.2, 0, 3.4, 0.3, 8.6, 'school', 'Door', endNote, true);
  add(onWall(-1.7, 7.1, 1.7, 7.35, 'X+', hl + 0.2, 0.14, mat('trim', 'school')), 'school', 'Door frame', endNote, false);
  for (const z of [-7.3, 7.3]) opening('X+', hl + 0.2, z, 2.8, 3, 7, 'school', 'Window', endNote, false, 1, 2);
  const sideNote = 'Tall two-light sash windows along the lake side, and a door under the dormer. The school photograph shows the nearer ones clearly; children hide the lower part of the wall. Positions are read off the photograph to a few feet.';
  for (const d of [7, 16, 35, 43, 52]) opening('Z-', -hw, hl - d, 2.8, 3, 7, 'school', 'Window', sideNote, false, 1, 2);
  opening('Z-', -hw, hl - 28, 3.2, 0.3, 7.6, 'school', 'Side door', sideNote, true);
  for (const d of [7, 17, 27, 39, 50]) opening('Z+', hw, hl - d, 2.8, 3, 7, 'west', 'Window', 'Dark openings show along the town side in panorama No. 331; their number and spacing cannot be read and are assumed.', false, 1, 2);

  // ---- low addition at the north-east end
  {
    const A = C.addition, x0 = -hl - A.len, note = 'The lake photograph shows a lower, flat-topped white addition at the right-hand (north-east) end of the building. Its size is estimated; nothing shows its openings.';
    add(boxAt(x0, 0, -A.width / 2, -hl, A.h, A.width / 2, mat('wall', 'lake', sidingTex, [2.3, 3])), 'lake', 'Low addition', note);
    add(boxAt(x0 - 0.5, A.h, -A.width / 2 - 0.5, -hl, A.h + 0.5, A.width / 2 + 0.5, mat('roof', 'lake')), 'lake', 'Addition roof', note);
  }

  // figure for scale (not evidence)
  const scale = new THREE.Group();
  const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.1, 4, 8), new THREE.MeshStandardMaterial({ color: BASE.figure, roughness: 1 }));
  f.position.set(hl + 6, 2.85, 5); f.castShadow = true; scale.add(f);
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
