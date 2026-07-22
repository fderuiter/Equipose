const config = { arms: [{ ratio: 1 }] };
const totalRatio = 1;
const arms = config.arms.map(arm => {
  const r = arm.ratio;
  return { val: Math.round((r / totalRatio) * 100) };
});
