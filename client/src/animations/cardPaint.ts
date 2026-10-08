/** Static card scans should be painted once. Blank faces keep the holo loop. */
export function shouldRedrawCard(hasImage: boolean, alreadyPainted: boolean): boolean {
  return !(hasImage && alreadyPainted);
}
