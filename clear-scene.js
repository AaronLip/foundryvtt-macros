/* Clear Scene
 *
 * Description:
 * Quickly resets a scene by deleting all tokens and resetting the fog of war
 * I use this frequently while testing wall layouts
 */
await canvas.tokens.deleteAll();
canvas.sight.resetFog();