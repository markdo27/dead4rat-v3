/**
 * WFGL — Web FreeFrame GL
 * Public API. Import this to access the entire plugin system.
 */

export { WFGLPlugin } from './WFGLPlugin.js';
export { WFGLShaderPlugin } from './WFGLShaderPlugin.js';
export { WFGLHost } from './WFGLHost.js';
export { WFGLPipeline } from './WFGLPipeline.js';

// Stock plugins
import { InvertColors } from './plugins/InvertColors.js';
import { ChromaticAberration } from './plugins/ChromaticAberration.js';
import { VHS } from './plugins/VHS.js';
import { Kaleidoscope } from './plugins/Kaleidoscope.js';
import { Feedback } from './plugins/Feedback.js';
import { EdgeGlow } from './plugins/EdgeGlow.js';
import { PixelSort } from './plugins/PixelSort.js';
import { HueShift } from './plugins/HueShift.js';
import { Bloom } from './plugins/Bloom.js';
import { NoiseField } from './plugins/NoiseField.js';

export {
    InvertColors, ChromaticAberration, VHS, Kaleidoscope,
    Feedback, EdgeGlow, PixelSort, HueShift, Bloom, NoiseField
};

/** All stock plugin classes in an array */
export const STOCK_PLUGINS = [
    InvertColors, ChromaticAberration, VHS, Kaleidoscope,
    Feedback, EdgeGlow, PixelSort, HueShift, Bloom, NoiseField
];

/**
 * Convenience: register all stock plugins on a WFGLHost instance.
 */
export function registerStockPlugins(host) {
    for (const P of STOCK_PLUGINS) {
        host.register(P);
    }
}
