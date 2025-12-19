/**
 * The function's value will be caulted at runtime and included in the bundle for this macro file
 */

import package_json from '../../package.json';

export function get_package_current_version_macro() {
  return package_json.version;
}

export function get_is_umd_build_mode_macro() {
  return import.meta && import.meta.env
    ? import.meta.env.VITE_IS_UMD_BUILD_MODE === 'true'
    : process.env.VITE_IS_UMD_BUILD_MODE === 'true';
}
