// The bull ring built at the Gillett racetrack for the bullfight of 24-26 August 1895.
//
// Units are feet. Origin: centre of the arena at ground level; y is up.
//
// Every part carries an evidence class (see EVIDENCE) and a note.
//   'news'       stated in the Rocky Mountain News, 23-25 Aug 1895
//   'photo'      visible in the 1895 photographs (Denver Public Library, mostly H.S. Poley)
//   'inferred'   follows from what is stated and visible
//   'conjecture' not shown by any source found so far
//
// Two readings of the size are offered:
//   'news'   150 ft arena, as the Rocky Mountain News correspondent wrote on 22 Aug 1895. The two snow
//            photographs (Denver Public Library P-1635, P-906) show the ring 8 to 9 times as wide as it
//            is high, which is 190-220 ft overall and agrees with this. This is the default.
//   'photo'  160 ft overall: the caption of 25 Aug 1895 read as the whole structure. Kept for
//            comparison; it is too small for the photographs.

export function ringDims(size = 'news') {
  const B = {
    size,
    rows: 12,        // "twelve tiers of plank seats" (News, 23 Aug 1895); the photographs agree
    tread: 2.0,      // depth of each row: assumed
    topSeat: 20,     // "the top seats fully twenty feet above the ground"
    barrier: 8,      // "a solid barrier, eight feet high" of 10 and 12 inch cedar posts
    platform: 3,     // "a three-foot platform, about the entire ring", level with the top of the barrier
    gap: 0.6,
  };
  const depth = B.platform + B.gap + B.rows * B.tread;      // barrier to back rail
  if (size === 'news') { B.arena = 150; B.outer = B.arena + 2 * depth; }
  else { B.outer = 160; B.arena = B.outer - 2 * depth; }
  B.first = B.barrier + 1.5;                                 // height of the front bench
  B.rise = (B.topSeat - B.first) / (B.rows - 1);
  B.height = B.topSeat + 4;                                  // back rail
  B.r0 = B.arena / 2 + B.platform + B.gap;                   // inner edge of the seating
  B.bents = 2 * Math.round(Math.PI * B.outer / 5.24 / 2);    // radial frames about 5 ft apart: assumed
  B.benchFeet = Math.round([...Array(B.rows).keys()].reduce((s, i) => s + 2 * Math.PI * (B.r0 + 1.6 + i * B.tread), 0));
  B.seats = Math.round(B.benchFeet / 1.5 / 100) * 100;       // at 18 inches a person
  B.boxes = Math.round(2 * Math.PI * (B.arena / 2 + 1.5) / 6.5);
  return B;
}
export const BULLRING = ringDims('news');

// The ground under the ring, from the 2024 lidar at the located position (38.789228, -105.122788, moved 86 ft north on 22 Nov 2026; slope re-measured there): a plane fitted
// within 105 ft of the centre, good to 0.4 ft. Feet of rise per foot east and per foot north. It falls 3.5 ft across
// the ring toward the south-south-west. The exterior photograph, measured independently, shows the ring about 3.6 ft
// taller on its left (south) side than its right.
export const SITE_SLOPE = { east: 0.0043, north: 0.0166 };
export const siteGround = (x, z) => SITE_SLOPE.east * x - SITE_SLOPE.north * z;     // model axes: x east, z south

export const EVIDENCE = {
  news: { color: 0x2563eb, label: 'Stated in the 1895 newspaper' },
  photo: { color: 0x4d7c0f, label: 'Visible in the 1895 photographs' },
  inferred: { color: 0xd97706, label: 'Inferred from what is stated and visible' },
  conjecture: { color: 0xdc2626, label: 'Conjecture: no source found' },
};

// ground(x, z): height of the ground at a point of the model, relative to the centre (omit for level ground).
// The seating and rails are built level; every post, brace foot, the barrier and the pen run down to the ground.
export function buildBullring(THREE, B = BULLRING, ground = null) {
  const R = B.outer / 2, rA = B.arena / 2, r0 = B.r0, N = B.bents;
  const gy = (x, z) => ground ? ground(x, z) : 0;
  const group = new THREE.Group(), parts = [], materials = [];
  const polar = (r, th, y) => new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));
  const foot = (r, th) => polar(r, th, gy(r * Math.cos(th), r * Math.sin(th)));           // a point on the ground
  const drape = (geo, lift) => {                              // move a flat geometry's vertices onto the ground
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) a.setY(i, gy(a.getX(i), a.getZ(i)) + lift);
    a.needsUpdate = true; geo.computeVertexNormals(); return geo;
  };

  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const drawPost = (g, w, h) => {                            // one round cedar post per tile
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#3f3327'); grad.addColorStop(0.18, '#7a6650'); grad.addColorStop(0.5, '#9a846a'); grad.addColorStop(0.85, '#6c5a46'); grad.addColorStop(1, '#3a2f24');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  };
  const postTex = canvasTex(32, 64, drawPost, Math.round(2 * Math.PI * rA / 0.92), 1);

  const BASE = { timber: 0xa98a63, bench: 0xb79a72, barrier: 0x7d6a52, cloth: 0xe9e4d6, dirt: 0x9c8a68, gate: 0xcdbb98, dark: 0x2a241d, flag: 0xb8322a, figure: 0x3b3b3b };
  function mat(kind, ev, tex) {                             // one shared material per kind and evidence class
    const m = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : BASE[kind], map: tex || null, roughness: 1, side: THREE.DoubleSide });
    m.userData = { base: tex ? 0xffffff : BASE[kind], map: tex || null, ev };
    materials.push(m);
    return m;
  }
  function add(mesh, ev, part, note, shadow = true) {
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    mesh.userData = { ev, part, note };
    group.add(mesh); parts.push(mesh);
    return mesh;
  }
  // many square timbers merged into one mesh
  function timbers(list, t) {
    const pos = [], up = new THREE.Vector3(0, 1, 0), alt = new THREE.Vector3(1, 0, 0);
    const d = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3();
    for (const [a, b] of list) {
      d.subVectors(b, a).normalize();
      u.crossVectors(d, Math.abs(d.y) > 0.99 ? alt : up).normalize().multiplyScalar(t / 2);
      v.crossVectors(d, u).normalize().multiplyScalar(t / 2);
      const c = [];
      for (const p of [a, b]) for (const [su, sv] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) c.push(p.clone().addScaledVector(u, su).addScaledVector(v, sv));
      const quad = (i, j, k, l) => { for (const n of [i, j, k, i, k, l]) pos.push(c[n].x, c[n].y, c[n].z); };
      quad(0, 1, 5, 4); quad(1, 2, 6, 5); quad(2, 3, 7, 6); quad(3, 0, 4, 7); quad(0, 3, 2, 1); quad(4, 5, 6, 7);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  const ringFlat = (r0, r1, y) => { const g = new THREE.RingGeometry(r0, r1, 180); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };

  // ---- arena floor
  const floorEv = B.size === 'news' ? 'news' : 'inferred';
  add(new THREE.Mesh(drape(ringFlat(0, rA, 0.05), 0.05), mat('dirt', floorEv)), floorEv, 'Arena floor',
    B.size === 'news'
      ? `The Rocky Mountain News correspondent, at the ring on 22 August 1895, wrote: "This circular space is 150 feet in diameter". With the box platform and twelve tiers behind it, that makes the whole structure about ${Math.round(B.outer)} ft across. The two snow photographs show the ring 8 to 9 times as wide as it is high, or 190 to 220 ft, which agrees. A Denver paper of 12 July gave 140 ft.`
      : `If the "about 160 feet" of the 25 August caption is the whole structure, the box platform and ${B.rows} tiers leave an arena of about ${Math.round(B.arena)} ft. The snow photographs show a wider ring than this, so this reading is kept only for comparison.`, false);

  // ---- barrier round the arena
  const barGeo = new THREE.CylinderGeometry(rA, rA, B.barrier, 180, 1, true);
  { const a = barGeo.attributes.position;                     // the posts run down to the ground; their tops stay level
    for (let i = 0; i < a.count; i++) if (a.getY(i) < 0) a.setY(i, gy(a.getX(i), a.getZ(i)) - B.barrier / 2); }
  const bar = new THREE.Mesh(barGeo, mat('barrier', 'news', postTex));
  bar.position.y = B.barrier / 2;
  add(bar, 'news', 'Barrier', 'Rocky Mountain News, 23 August 1895: "a wall of ten and twelve inch cedar posts, forming a solid barrier, eight feet high, except for a narrow entrance closed by a heavy gate, and here and there a missing post, where a man may wedge through for his life." The interior photographs show the same upright palisade.');
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(rA - 0.15, rA - 0.15, 1.4, 180, 1, true), mat('cloth', 'photo'));
  cloth.position.y = B.barrier - 0.5;
  add(cloth, 'photo', 'Cloth band', 'A light band, apparently canvas, is draped along the top of the barrier in every interior photograph.', false);
  const gapMat = mat('dark', 'news');
  for (const th of [0.5, 2.3, 3.6, 5.5]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(1.0, B.barrier - 1.6, 0.5), gapMat);
    g.position.copy(polar(rA - 0.1, th, (B.barrier - 1.6) / 2)); g.position.y += gy(g.position.x, g.position.z); g.rotation.y = Math.PI / 2 - th;
    add(g, 'news', 'Escape gap', 'The newspaper says a post was left out "here and there" so that a man could squeeze through to safety. How many gaps there were and where is not known; four are shown.', false);
  }
  const GATE = Math.PI / 2;                                  // side of the ring given to the gate and bull pen: assumed
  const gate = new THREE.Mesh(new THREE.BoxGeometry(5, B.barrier - 0.8, 0.4), mat('gate', 'news'));
  gate.position.copy(polar(rA - 0.3, GATE, (B.barrier - 0.8) / 2)); gate.position.y += gy(gate.position.x, gate.position.z); gate.rotation.y = Math.PI / 2 - GATE;
  add(gate, 'news', 'Gate', 'The newspaper describes a single "narrow entrance closed by a heavy gate". The photographs show a plank gate beside a pen. Which side of the ring it was on is not known.', false);

  // ---- box platform
  add(new THREE.Mesh(ringFlat(rA, rA + B.platform, B.barrier), mat('bench', 'news')), 'news', 'Box platform',
    'Rocky Mountain News, 23 August 1895: "On a level with this stockade is a three-foot platform, about the entire ring, which will be set with chairs in blocks or boxes of six each." Wolfe watched from an "elevated box"; its position is not known and it is not modelled.');
  const boxRails = [];
  for (let k = 0; k < B.boxes; k++) {
    const th = 2 * Math.PI * k / B.boxes;
    boxRails.push([polar(rA + 0.3, th, B.barrier + 2.3), polar(rA + B.platform, th, B.barrier + 2.3)],
      [polar(rA + 0.3, th, B.barrier), polar(rA + 0.3, th, B.barrier + 2.3)]);
  }
  add(new THREE.Mesh(timbers(boxRails, 0.2), mat('timber', 'inferred')), 'inferred', 'Box divisions',
    `Rails dividing the platform into boxes are assumed. At six chairs to a box there is room for about ${B.boxes} boxes.`, false);

  // ---- bull pen (drawn on the +z side)
  const penMat = mat('barrier', 'news', canvasTex(32, 64, drawPost, 30, 1));
  const penNote = 'Rocky Mountain News, 24 August 1895: "The bulls are corralled in a small stockade built as an annex to the big bull ring." Its size, shape and side of the ring are assumed here, as is the passage under the seats to the gate.';
  const wall = (x0, z0, x1, z1, h) => {
    const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.8), penMat);
    m.position.set((x0 + x1) / 2, h / 2 + gy((x0 + x1) / 2, (z0 + z1) / 2), (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    add(m, 'news', 'Bull pen', penNote);
  };
  const pw = 15, pd = 26;                                    // half width and depth of the pen
  wall(-pw, R + 0.5, -pw, R + pd, 7); wall(pw, R + 0.5, pw, R + pd, 7); wall(-pw, R + pd, pw, R + pd, 7);
  wall(-pw, R + 0.5, -3.2, R + 0.5, 7); wall(3.2, R + 0.5, pw, R + 0.5, 7);
  wall(-3.2, rA + 0.6, -3.2, R + 0.5, 6.5); wall(3.2, rA + 0.6, 3.2, R + 0.5, 6.5);

  // ---- seating
  const seatMat = mat('bench', 'news'), faceMat = mat('timber', 'inferred');
  const seatNote = `Rocky Mountain News, 23 August 1895: "at a very sharp pitch rise twelve tiers of plank seats, the top seats fully twenty feet above the ground." The interior photographs show the same steep bank of open benches. Together the rows give about ${B.benchFeet.toLocaleString()} ft of bench: at 18 inches a person that is about ${B.seats.toLocaleString()} seats, against the 5,000 claimed. The depth of each tier is assumed.`;
  for (let i = 0; i < B.rows; i++) {
    const r = r0 + i * B.tread, y = B.first + i * B.rise;
    add(new THREE.Mesh(ringFlat(r + 1.15, r + 2.1, y), seatMat), 'news', 'Benches', seatNote);
    add(new THREE.Mesh(ringFlat(r, r + 0.95, y - 1.45), seatMat), 'news', 'Foot boards', seatNote, false);
    // a board on edge under the front of each bench, so the tiers read as steps from across the arena
    const face = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.15, r + 1.15, 0.7, 180, 1, true), faceMat);
    face.position.y = y - 0.35;
    add(face, 'inferred', 'Bench fronts', 'A board on edge under each bench is assumed. The photographs show stepped planks, but not how they were fixed.', false);
  }

  // ---- timber frame
  const posts = [], rakers = [], struts = [], girts = [], braces = [], rails = [];
  const levels = [6, 12, 18], top = B.height, y0 = B.first - 1.4, rakeTop = y0 + B.rows * B.rise;
  const yAt = (r) => y0 + (r - r0) / B.tread * B.rise;
  for (let k = 0; k < N; k++) {
    const th = 2 * Math.PI * k / N, th2 = 2 * Math.PI * (k + 1) / N;
    posts.push([foot(R, th), polar(R, th, top)]);
    posts.push([foot(r0, th), polar(r0, th, y0)]);
    for (const r of [r0 + 8.8, r0 + 17.6]) posts.push([foot(r, th), polar(r, th, yAt(r))]);
    rakers.push([polar(r0, th, y0), polar(R, th, rakeTop)]);
    struts.push([foot(r0 + 8.8, th), polar(r0 + 17.6, th, yAt(r0 + 17.6))]);
    struts.push([foot(r0 + 17.6, th), polar(R, th, rakeTop - 3)]);
    for (const y of levels) girts.push([polar(R, th, y), polar(R, th2, y)]);
    rails.push([polar(R, th, top), polar(R, th2, top)], [polar(R, th, rakeTop + 0.4), polar(R, th2, rakeTop + 0.4)]);
    const ys = [0, ...levels];
    const at = (a, y) => y === 0 ? foot(R, a) : polar(R, a, y);            // the lowest braces start at the ground
    for (let j = 0; j < 3; j++) braces.push((k + j) % 2 ? [at(th, ys[j]), at(th2, ys[j + 1])] : [at(th, ys[j + 1]), at(th2, ys[j])]);
  }
  const frameNote = 'The winter photograph of the empty ring shows the outside as an open timber frame all the way round: close-set posts, level rails and diagonal braces, with the sloping seat supports showing through. The newspaper calls it "a light cobweb looking amphitheater", "minus walls or roof", with a framework "of spruce posts, either set in the ground solidly, or used as braces". Spacing of the frames here is assumed.';
  add(new THREE.Mesh(timbers(posts, 0.55), mat('timber', 'photo')), 'photo', 'Posts', frameNote + (ground ? ' The ground here falls about 3.5 ft across the ring toward the south-south-west (lidar), and the photograph shows the ring about 3.6 ft taller on that side with its top level: so the posts were cut to length and are longer on the low side.' : ''));
  add(new THREE.Mesh(timbers(girts, 0.4), mat('timber', 'photo')), 'photo', 'Outer rails', frameNote);
  add(new THREE.Mesh(timbers(braces, 0.35), mat('timber', 'photo')), 'photo', 'Diagonal braces', frameNote);
  add(new THREE.Mesh(timbers(rakers, 0.5), mat('timber', 'inferred')), 'inferred', 'Seat supports',
    'Sloping timbers carrying the benches are needed and show through the frame in the exterior photograph; their size and spacing are assumed.');
  add(new THREE.Mesh(timbers(struts, 0.35), mat('timber', 'inferred')), 'inferred', 'Inner bracing', 'Bracing inside the frame is assumed.');
  add(new THREE.Mesh(timbers(rails, 0.35), mat('timber', 'photo')), 'photo', 'Back rail',
    'A level top rail runs round the back of the seating in the exterior photograph. It is set four feet above the top seats, which the newspaper puts at twenty feet. Measured on the 2,000-pixel copy of that photograph, the ring is about 8.5 times as wide as it is high, and about a sixth taller on its left side than on its right.');

  // ---- flags
  const poleMat = mat('timber', 'photo'), flagMat = mat('flag', 'inferred');
  for (const th of [0.3, 1.9, 3.5, 5.1]) {
    add(new THREE.Mesh(timbers([[polar(R, th, top - 4), polar(R, th, top + 16)]], 0.3), poleMat), 'photo', 'Flag pole',
      'Flags on poles above the seating appear in the photographs and the engraving. Their number and positions are not known.');
    const g = new THREE.BufferGeometry();
    const a = polar(R, th, top + 16), b = polar(R, th, top + 12.5), c = polar(R, th + 0.07, top + 14.2);
    g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], 3));
    g.computeVertexNormals();
    add(new THREE.Mesh(g, flagMat), 'inferred', 'Flag', 'A pennant shows in one photograph; its colour is not known.', false);
  }

  // ---- figures for scale (not evidence)
  const figMat = new THREE.MeshStandardMaterial({ color: BASE.figure, roughness: 1 });
  const scale = new THREE.Group();
  for (const [x, z] of [[10, 6], [-22, -14], [4, -30], [r0 + 7.6, 3]]) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.1, 4, 8), figMat);
    f.position.set(x, x > rA ? B.first + 3 * B.rise + 2.9 : 2.85 + gy(x, z), z); f.castShadow = true;
    scale.add(f);
  }
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
