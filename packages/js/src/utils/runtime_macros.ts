/**
 * The function's value will be calculated at runtime and included in the bundle for this macro file
 */

import package_json from '../../package.json';

export function get_package_current_version_macro() {
  return package_json.version;
}
