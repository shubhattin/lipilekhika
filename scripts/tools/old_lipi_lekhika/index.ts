import { normalize } from "./normalise_lang";
import * as lekhika_lib from "./lekhika_core";

export const normalize_lang_code = (lang: string) => {
  return normalize(lang);
};

export const get_sa_mode = async (lang: string) => {
  return await lekhika_lib.get_sa_mode(lang);
};

/**
 * This function is an async version of the lipi_parivartak function
 * It does not require the user to manually load the languages before converting the text
 * It is used to convert the text from one script to another
 **/
export const lipi_parivartak = async <T extends string | string[]>(
  val: T,
  from: string,
  to: string
) => {
  if (normalize_lang_code(from) === normalize_lang_code(to)) return val;
  return await lekhika_lib.lipi_parivartak(val, from, to);
};
