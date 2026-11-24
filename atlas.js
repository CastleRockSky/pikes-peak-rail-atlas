// Reads a place from the atlas (served at /atlas/) and hands each viewer the shapes it was written for.
// The viewers ask for their old file names through atlasData('data/buildings-1896.geojson'); nothing here reads web/data
// except the terrain grid, which is a derived asset and not an atlas record.
//
// A record's local.viewer holds the properties the present viewers read. Where a record has none (a place entered
// straight into the atlas), the properties are built from the schema fields, so a new place works without it.
(function () {
  const PLACE = new URLSearchParams(location.search).get('place') || 'gillett';
  const base = 'atlas/places/' + PLACE + '/', region = 'atlas/region/';
  const cache = {};
  const get = u => cache[u] || (cache[u] = fetch(u, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(u + ': ' + r.status); return r.json(); }));
  const fc = features => ({ type: 'FeatureCollection', features });
  const feat = (geometry, properties) => ({ type: 'Feature', geometry, properties });
  const tail = id => id.split(':').slice(2).join(':');
  function buildingProps(p) {
    if (p.local && p.local.viewer) return p.local.viewer;
    const d = p.dims || {};
    return { id: tail(p.id), name: p.name || null, storeys: d.storeys || 1, ew_ft: d.ew_ft, ns_ft: d.ns_ft, material: p.material || null, use: p.use || null,
             notes: p.notes || p.basis, year: p.valid_from || null, source: p.placeholder ? 'infill' : (p.grade === 'measured' ? 'atlas' : 'placed'), crossed: false };
  }
  const structures = () => get(base + 'structures.geojson').then(d => d.features);
  const setOf = (f, name) => ((f.properties.local || {}).set || (f.properties.placeholder ? 'infill' : 'mapped')) === name;
  const MAKE = {
    'data/buildings-1896.geojson': () => structures().then(fs => fc(fs.filter(f => setOf(f, 'mapped') && f.properties.kind === 'building').map(f => feat(f.geometry, buildingProps(f.properties))))),
    'data/infill-1896.geojson': () => structures().then(fs => fc(fs.filter(f => setOf(f, 'infill')).map(f => feat(f.geometry, buildingProps(f.properties))))),
    'data/remains-1962.geojson': () => structures().then(fs => fc(fs.filter(f => setOf(f, 'remains')).map(f => feat(f.geometry, f.properties.local.viewer)))),
    'data/located.geojson': () => structures().then(fs => {
      const out = [];
      for (const f of fs.filter(f => setOf(f, 'located'))) {
        const L = f.properties.local;
        out.push(feat(f.geometry, L.viewer));
        for (const a of L.also || []) out.push(feat(a.geometry, a.viewer));
      }
      return fc(out);
    }),
    'data/plat.geojson': () => Promise.all([get(base + 'plat.geojson'), structures()]).then(([plat, fs]) =>
      fc(fs.filter(f => setOf(f, 'plat')).map(f => feat(f.geometry, f.properties.local.viewer)).concat(plat.features))),
    'data/parcels.geojson': () => get(base + 'parcels.geojson'),
    'data/facades-1896.json': () => get(base + 'facades.json'),
    // only the railways this place is on: the region file now carries every line
    'data/osm-rail.geojson': () => Promise.all([get(region + 'lines.json'), get(base + 'place.json')]).then(([lines, place]) => {
      const mine = new Set((place.on_lines || []).map(o => o.line));
      return fc(lines.filter(l => mine.has(l.id)).flatMap(l => l.segments.map(s => feat(s.geometry, (s.local && s.local.viewer) || { name: l.name, railway: 'abandoned' }))));
    }),
    'data/georef.json': () => get(base + 'overlays.json').then(os => Object.fromEntries(os.filter(o => o.kind === 'sanborn').map(o =>
      [o.local ? o.local.key : o.date, (o.local && o.local.viewer) || Object.assign({ file: o.fit.file, width: o.fit.width, height: o.fit.height, rms_ft: o.fit.residual_ft }, o.corners)]))),
    'data/usgs-maps.json': () => get(base + 'overlays.json').then(os => {
      const ms = os.filter(o => o.kind === 'usgs-topo' || o.kind === 'aerial');
      return { bounds: ms.length ? ms[0].bounds : null, maps: ms.map(o => (o.local && o.local.viewer) || { year: o.date, title: o.name, note: o.notes || '', file: o.image, detail: o.detail }) };
    }),
    'data/cameras.json': () => Promise.all([get(base + 'stations.json'), get(base + 'photos.json'), get(base + 'stations-about.json').catch(() => ({ about: '' }))]).then(([st, ph, about]) => {
      const photo = Object.fromEntries(ph.map(p => [p.id, p])); const out = { _about: about.about };
      for (const s of st) {
        const p = photo[s.photo] || {}, v = (s.local && s.local.viewer) || {};
        out[(s.local && s.local.key) || tail(s.id)] = Object.assign({ title: p.name, label: s.name, image: p.image, w: p.w, h: p.h, library: p.id ? tail(p.id) : null,
          solved: s.level === 'solved' ? 'solved' : (s.level === 'direction' ? 'direction only' : 'not solved'), status: s.basis, method: s.method }, v,
          p.image ? {} : { image: null, withheld: { holder: p.holder || 'its holder', url: p.url || null } },
          { cam: { lat: s.lat, lon: s.lon, height: s.height_ft, heading: s.heading, pitch: s.pitch, roll: s.roll, fov: s.fov, cx: s.cx, cy: s.cy } });
      }
      return out;
    }),
    // holder, rights and credit come from the records; a photograph with no image (withheld in a public copy) is counted, not listed
    'data/photos.json': () => Promise.all([get(base + 'photos.json'), get(base + 'photo-topics.json').catch(() => [])]).then(([ph, topics]) => {
      const rec = p => ({ holder: p.credit || (p.holder + (p.call_number ? ', ' + p.call_number : '')), rights: p.rights_note || p.rights, url: p.url || '' });
      const all = ph.map(p => (p.local && p.local.viewer) ? Object.assign({}, p.local.viewer, rec(p), p.image ? {} : { img: null, thumb: null })
        : Object.assign({ id: tail(p.id), title: p.name, subject: p.notes || p.name, text: p.transcription || '', date: p.date || '', kind: p.kind, photographer: p.photographer || '',
            img: p.image || null, thumb: p.thumb || null, w: p.w, h: p.h, topics: p.topics, year: p.valid_from || null, use: '', source: 'atlas', file: '' }, rec(p)));
      return { topics, photos: all.filter(p => p.img), withheld: all.filter(p => !p.img).length };
    }),
    'data/terrain-5m.json': () => get('data/terrain-5m.json'),
  };
  window.atlasPlace = PLACE;
  window.atlasData = name => { if (!MAKE[name]) throw new Error('atlas.js does not know ' + name); return MAKE[name](); };
})();
