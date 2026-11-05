/** Resolve conflicting size settings without shrinking the native button targets below 44px. */
export function resolveGeometry(settings: {height: number; outerPadding: number; textSize: number}) {
  const padding = Math.min(settings.outerPadding,(settings.height-44)/2);
  const targetHeight = settings.height-2*padding;
  // Leave at least 4px around the selected label's line box at every supported text size.
  const innerInset = Math.min(padding,(targetHeight-settings.textSize*1.2-4)/2);
  return {padding,targetHeight,innerInset};
}
