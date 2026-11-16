import { buildCaptions } from './plan.mjs';
export function applyHouseStyle(plan, transcript) {
  if (!(transcript.duration > 0 && transcript.duration < 60)) throw Error('Narration must be shorter than 60 seconds; no automatic trimming.');
  plan.duration = transcript.duration;
  plan.captions = buildCaptions(transcript, 2);
  plan.style = { ...plan.style, allowText: false, captionY: .78, camEase: .6 };
  plan.env = { soil: 'brown_mud_leaves_01', ...plan.env };
  if (plan.env.sky !== false && plan.env.realism !== false) {
    const alreadyRealistic = plan.env.realism === true;
    plan.env = { groundLayers: 7, groundBackdrop: true, skyExposure: .42, skyPitch: 1.0, skyMinElevation: .22, skyYaw: .7, iblYaw: 2.2, envLight: .75, materials: { bark: 'bark_brown_02', pavement: 'concrete_floor_02' }, ...plan.env,
      realism: true, sky: alreadyRealistic ? (plan.env.sky || 'kloppenheim_06_puresky') : 'kloppenheim_06_puresky', iblSky: plan.env.iblSky || 'qwantani_puresky' };
    plan.style = { exposure: 1.0, shadowUpdateInterval: .3, ...plan.style };
    if (!alreadyRealistic) plan.style.exposure = 1.0;
    // Keep the cutaway earth full-frame and readable in future realistic dioramas.
    plan.env.island = { w: 20, d: 12, depth: 10, ...(plan.env.island || {}) };
    plan.env.island.w = Math.max(plan.env.island.w || 0, 20);
    plan.env.island.d = Math.max(plan.env.island.d || 0, 12);
    plan.env.island.depth = Math.max(plan.env.island.depth || 0, 10);
  }
  for (const beat of plan.beats || []) {
    beat.camera = { ...beat.camera, punch: false };
    for (const asset of beat.add || []) {
      if (asset.type === 'sign' && asset.params?.text) throw Error('Unspoken scene text is forbidden: ' + asset.id);
    }
  }
  return plan;
}
