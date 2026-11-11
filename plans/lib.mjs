// Shot template library for the cine engine. A storyboard picks one template per script line:
//   { "hero": {"model":"Stork","height":0.35,"spear":true}, "lines": [ {"shot":"sky"}, {"shot":"close","counter":"١ متر"}, ... ] }
// Every template returns a shot without times; plans/story.mjs adds timing from the aligned script.
export const SETS = {
  sky: { type: 'ground', hdri: 'kloofendal_48d_partly_cloudy_puresky' }, forest: { type: 'ground', hdri: 'forest_slope' },
  city: { type: 'ground', hdri: 'potsdamer_platz' }, museum: { type: 'hdri', hdri: 'brown_photostudio_02', blur: .35 },
  teal: { type: 'studio', color: '#2fb8cc' }, blue: { type: 'studio', color: '#2a6fd6' }, navy: { type: 'studio', color: '#1d3557', key: 2.6 },
  sand: { type: 'studio', color: '#d9a35a' }, pale: { type: 'studio', color: '#cfe6f2' }, red: { type: 'studio', color: '#c8463d' },
};
const set = (o, d) => (typeof o.set === 'object' ? o.set : SETS[o.set || d]);
const ui = o => [
  ...(o.counter ? [{ type: 'counter', text: o.counter, at: [.5, .18], start: o.counterAt ?? .3, size: o.counterSize || .13, color: o.counterColor || '#ffd31a' }] : []),
  ...(o.pin ? [{ type: 'pin', text: o.pin, icon: '+', at: [.5, .2], start: .3 }] : []),
  ...(o.viewfinder ? [{ type: 'viewfinder' }] : []),
  ...(o.question ? [{ type: 'counter', text: '؟', at: [.5, .2], start: .4, size: .2, color: '#ffffff' }] : []),
  ...(o.meter ? [{ type: 'meter', at: [.16, .45], from: 0, to: 1, dur: 1.4, text: o.meter }] : []),
];
// hero = main subject (animal / person / object) and an optional attachment (spear, etc.)
function heroActor(H, id, o = {}) { return { id, model: H.model, height: H.height ?? 1, clip: H.clip, ...(H.actor || {}), ...o }; }
function attach(H, id, o = {}) { return H.attach ? [{ ...H.attach, id: 'att_' + id, follow: id, ...o }] : []; }
const glowAttach = (H, id, c) => attach(H, id, c ? { holo: c } : {});

export const T = {
  // subject crossing the sky / a place, camera tracking it
  sky: (H, o) => ({ set: set(o, 'sky'), actors: [heroActor(H, 'h', { pos: [-4, 2.2, -1], to: [1.5, 2, .6], faceMove: true, ...(o.actor || {}) })], props: attach(H, 'h'),
    camera: { pos: [2.2, 1.7, 3], target: 'h', fov: 42, ease: 'linear' }, ui: ui(o) }),
  // close-up push-in with shallow focus; optional glow on the attachment
  close: (H, o) => ({ set: set(o, 'sky'), actors: [heroActor(H, 'h', { pos: [0, 2, 0], rotY: 1.2, speed: .9 })], props: glowAttach(H, 'h', o.glow),
    camera: { pos: [1.5, 2.25, 2.1], target: [0, 2.05, .3], to: { pos: [1.1, 2.15, 1.5] }, fov: 38, dof: { aperture: .03, maxblur: .015 } }, ui: ui(o) }),
  // studio orbit with flash - for "and it's still alive!" moments
  orbit: (H, o) => ({ set: set(o, 'teal'), actors: [heroActor(H, 'h', { pos: [0, 1.6, 0], holo: o.glow })], props: attach(H, 'h'), flash: o.flash ?? true,
    camera: { pos: [1.4, 1.7, 1.8], target: [0, 1.6, .2], orbit: 1, fov: 40 }, ui: ui(o) }),
  // surprised face push-in
  react: (H, o) => ({ set: set(o, 'blue'), actors: [{ id: 'r', model: 'RobotExpressive', clip: o.clip || 'Idle', height: 2, morph: { [o.emotion || 'Surprised']: [0, 1] } }], flash: o.flash,
    camera: { pos: [.3, 1.9, 3.4], target: [0, 1.55, 0], to: { pos: [.1, 1.7, 2.1] }, fov: 35 }, ui: ui(o) }),
  // people of the past / crowd reacting
  people: (H, o) => ({ set: set(o, 'teal'), actors: [{ id: 'm1', model: 'Xbot', clip: o.clip || 'headShake', pos: [-.6, 0, 0], rotY: .3, height: 1.8 }, { id: 'm2', model: 'Soldier', clip: 'Idle', pos: [.7, 0, -.4], rotY: -.3, height: 1.8 }],
    camera: { pos: [0, 1.5, 3.6], target: [0, 1.2, 0], to: { pos: [.3, 1.5, 3] }, fov: 40 }, ui: ui(o) }),
  // a person walking (farmer, scientist...) with a year / place counter
  walk: (H, o) => ({ set: set(o, 'sky'), actors: [{ id: 'p', model: o.model || 'Xbot', clip: o.clip || 'walk', pos: [-1.5, 0, -1], to: [.2, 0, .3], faceMove: true, height: 1.8 }],
    camera: { pos: [2.6, 1.2, 3.2], target: [-.4, 1, -.2], fov: 40 }, ui: ui({ counterColor: '#ffffff', counterSize: .17, ...o }) }),
  // subject on the ground, a person discovers it behind
  found: (H, o) => ({ set: set(o, 'sky'), actors: [heroActor(H, 'h', { pos: [0, .25, 0], rotY: .6, speed: 0, clipOffset: .4 }), { id: 'p', model: 'Xbot', clip: 'idle', pos: [-1.2, 0, -2.6], rotY: .4, height: 1.8 }],
    props: attach(H, 'h'), camera: { pos: [1.7, .7, 2.5], target: [-.3, .6, -.6], to: { pos: [1.3, .65, 1.9] }, fov: 42, dof: { aperture: .025, maxblur: .012 } }, ui: ui(o) }),
  // a single object spinning and glowing (evidence, tool, part)
  object: (H, o) => ({ set: set(o, 'navy'), props: [{ ...(o.prop || H.attach || { type: 'sphere', r: .3 }), id: 'obj', pos: [0, 1.4, 0], rot: [0, 0, 1.2], spin: .6, holo: o.glow || '#ff9f1a', follow: undefined }],
    camera: { pos: [0, 1.5, 1.6], target: [0, 1.4, 0], to: { pos: [0, 1.45, 1.0] }, fov: 38 }, ui: ui(o) }),
  // route between two places drawing itself; optional subject flying along it
  route: (H, o) => { const A = [-1.4, .05, .8], B = [1.6, .05, -1.6];
    return { set: set(o, 'sand'), props: [{ type: 'disc', r: .5, pos: [A[0], .01, A[2]], color: '#3a8f4a' }, { type: 'disc', r: .5, pos: [B[0], .01, B[2]], color: '#2a6fd6' }, { type: 'arc', from: A, to: B, dur: o.follow ? .01 : 1.3, r: .035 }],
      actors: o.follow ? [heroActor(H, 'h', { pos: [A[0], 1, A[2]], to: [B[0], 1, B[2]], faceMove: true, height: (H.height ?? 1) * .85 })] : [],
      camera: o.follow ? { pos: [2.6, 2.4, 2.6], target: 'h', fov: 42 } : { pos: [0, 8, 6.5], target: [0, 0, -.4], fov: 46, handheld: .3 },
      ui: [...(o.from ? [{ type: 'label', text: o.from, world: [A[0], .5, A[2]], size: .07 }] : []), ...(o.to ? [{ type: 'label', text: o.to, world: [B[0], .5, B[2]], size: .07, start: 1.1 }] : []), ...ui(o)] }; },
  // subject disappears (snow particles, question mark)
  vanish: (H, o) => ({ set: set(o, 'pale'), actors: [heroActor(H, 'h', { pos: [0, 1.6, 0], grow: [1, .001] })], props: [{ type: 'particles', count: 90, area: [4, 3, 3], pos: [-2, 0, -1.5], color: '#ffffff', glow: .3, size: .02 }],
    camera: { pos: [0, 1.7, 2.6], target: [0, 1.6, 0], fov: 40 }, ui: ui({ question: true, ...o }) }),
  // another model dives under a water surface
  dive: (H, o) => ({ set: set(o, 'navy'), actors: [{ id: 'd', model: o.model || 'Flamingo', pos: [0, 1.4, 0], to: [0, -.4, .2], rotX: .6, height: .5 }],
    props: [{ type: 'box', size: [8, .02, 8], pos: [0, .6, 0], color: '#4fb3ff', opacity: .45, rough: .1 }], camera: { pos: [0, .7, 2.4], target: [0, .6, 0], fov: 42 }, ui: ui(o) }),
  // subject turns into another model
  transform: (H, o) => ({ set: set(o, 'blue'), actors: [heroActor(H, 'h', { pos: [0, 1.5, 0], grow: [1, .001], holo: '#9b5cff' }), { id: 'x', model: o.into || 'Parrot', pos: [0, 1.5, 0], grow: [.001, 1], height: .35, rotY: .6 }],
    flash: true, camera: { pos: [.8, 1.6, 2], target: [0, 1.5, 0], orbit: .7, fov: 40 }, ui: ui(o) }),
  // the "BUT" moment: dramatic slow push with golden glow
  twist: (H, o) => ({ set: set(o, 'navy'), actors: [heroActor(H, 'h', { pos: [0, 1.6, 0], rotY: .9, speed: .7, holo: o.glow || '#ffc94a' })], props: attach(H, 'h'), transition: 'cut', flash: true,
    camera: { pos: [1.5, 1.5, 1.6], target: [0, 1.6, .2], to: { pos: [1.0, 1.58, 1.1] }, fov: 38, dof: { aperture: .02, maxblur: .012 } }, ui: ui(o) }),
  // subject flying high and far (proof it travels)
  far: (H, o) => ({ set: set(o, 'sky'), actors: [heroActor(H, 'h', { pos: [-3, 2.4, 2], to: [3, 3, -3], faceMove: true })], props: attach(H, 'h'), camera: { pos: [0, 1.2, 4], target: 'h', fov: 46 }, ui: ui(o) }),
  // a scientist examines the subject (viewfinder + glowing ring)
  science: (H, o) => ({ set: set(o, 'teal'), actors: [heroActor(H, 'h', { pos: [0, 1.4, 0], speed: 0, clipOffset: .2, rotY: 1.2 }), { id: 's', model: 'Xbot', clip: 'agree', pos: [-1.5, 0, -1.3], rotY: .9, height: 1.8 }],
    props: [{ type: 'ring', r: .22, tube: .02, pos: [0, 1.3, 0], color: '#7dff9a' }], camera: { pos: [1.6, 1.6, 2.3], target: [0, 1.35, 0], to: { pos: [1.1, 1.5, 1.6] }, fov: 38 }, ui: ui({ viewfinder: true, ...o }) }),
  // a group of subjects
  flock: (H, o) => ({ set: set(o, 'sky'), actors: [0, 1, 2, 3, 4].slice(0, o.count || 5).map(i => heroActor(H, 'h' + i, { pos: [-5 + i * .6, 2.2 + (i % 2) * .5, -2 - i], to: [3 + i * .6, 2.6 + (i % 2) * .5, -1 - i], faceMove: true, clipOffset: i * .37 })),
    camera: { pos: [0, .8, 3.2], target: [0, 2.5, -2], fov: 50 }, ui: ui(o) }),
  // subject displayed on a museum pedestal (wide / orbit / close)
  museum: (H, o) => { const v = o.view || 'wide', cams = {
      wide: { pos: [1.6, 1.5, 2.6], target: [0, 1.35, 0], to: { pos: [1.1, 1.5, 1.8] }, fov: 40 },
      orbit: { pos: [-1.9, 1.6, 1.8], target: [0, 1.35, 0], orbit: -.9, fov: 40 },
      close: { pos: [1.1, 1.6, 1.4], target: [.05, 1.55, .2], to: { pos: [.75, 1.58, 1.0] }, fov: 36, dof: { aperture: .03, maxblur: .015 } } };
    return { set: set(o, 'museum'), actors: [heroActor(H, 'h', { pos: [0, 1.5, 0], speed: 0, clipOffset: .25, rotY: .5 })], props: [{ type: 'pedestal', pos: [0, 0, 0], r: .45, h: 1 }, ...glowAttach(H, 'h', o.glow)],
      flash: v === 'wide', camera: cams[v], ui: [...(o.label ? [{ type: 'label', text: o.label, world: [0, .55, .5], size: .07, start: .3 }] : []), ...ui(o)] }; },
  // follow / subscribe ending
  cta: (H, o) => ({ set: set(o, 'teal'), actors: [heroActor(H, 'h', { pos: [-.6, 1.9, -1], to: [.4, 1.7, .6], faceMove: true })], props: attach(H, 'h'),
    camera: { pos: [0, 1.6, 3.2], target: [0, 1.6, 0], fov: 42 }, ui: [{ type: 'button', text: o.text || 'تابعني +', at: [.5, .3], start: .4, tap: 1.4 }, { type: 'arrow', at: [.5, .2], start: .5 }] }),
};
