import { lipi_helper } from "./helper";

class LipiParivartak {
  constructor() {
    this.k = lipi_hlp;
    this.karya = true;
    this.time = lipi_hlp.time();
    this.back_space = 0;
    this.sahayika_usage = true;
    this.halant_add_status = false;
    this.script = "Hindi";
    //[key record, output, whats on screen]
    this.varna = ["", "", ""];
    this.next_chars = "";
    this.d = false;
    this.mAtrA_sthiti = false;
    this.capital = [0, "", -1, -1, 0, 0, false];
    this.store_last_of_3 = "";
    this.added_fonts = [];
    this.last_of_3_status_for_mAtrA = false;
    this.special_ved_s = false;
    this.usage_table_link = (lang) => {
      return `${lipi_hlp.image_loca}/${this.k.normalize(lang)}.png`;
    };
    this.pUrva_lekhit = [
      ["", -1],
      ["", -1],
      ["", -1],
      ["", -1],
      ["", -1],
    ];
    this.second_cap_time = 0;
    // patch
    /** @type {{from_click: boolean, val: [string, number]}} */
    this.input_helper_values = {
      from_click: false,
      val: [],
    };
  }

  /**
   * The mukhya function performs a specific task.
   *
   * @param {string} [event_data=''] - The text parameter. Default value is an empty string.
   * @param {string} [lang=''] - The lang parameter. Default value is an empty string.
   * @param {boolean} [on_status=true] - The on_status parameter. Default value is true.
   * @param {0|1|undefined|null} [sa_mode=null] - The sa_mode parameter. Default value is null.
   */

  mukhya(event_data = "", lang = "", on_status = true, sa_mode = null) {
    // if (!this.karya) return;
    if (!on_status) return;
    if (event_data == null || event_data == undefined) {
      this.clear_all_val(true);
      return;
    }
    event_data = event_data.substring(event_data.length - 1);
    let elf = this.elphased_time() < 15.0;
    this.input_helper_values = {
      from_click: false,
      val: [],
    };
    if (this.k.in(this.k.pUrNasarve, event_data)) {
      if (!elf) this.clear_all_val(true);
      let lng = lang;
      lng = this.k.normalize(lng);
      this.prakriyA({
        text: event_data,
        typing: 1, // sanskrit mode
        lang: lng,
        mode: sa_mode ?? this.k.akSharAH[lng].sa, // element mode, 0 for text mode
      });
      return this.input_helper_values;
    } else this.clear_all_val(true);
  }
  elphased_time() {
    let t = this.time,
      c = this.k.time();
    let t1 = c - t;
    this.time = c;
    return t1;
  }
  prakriyA(args) {
    let code = "",
      mode = 0,
      lang = "",
      elm = null,
      html = false,
      l = this.k;
    if (this.k.in([undefined, null, ""], args.text)) return "";
    else code = args.text;
    lang = args.lang;
    if (args.typing != undefined) mode = 1;
    if (args.html == true) html = true;
    if (args.element != undefined) elm = args.element;
    this.akSharANi = l.akSharAH[lang];
    this.halant = !l.in(["Normal", "Romanized", "Urdu"], lang)
      ? this.akSharANi["."][".x"][0]
      : "";
    let sa = args.mode == 0 && mode == 1 ? 0 : 1,
      ignr = [];
    this.dev_text = [];
    if (html)
      for (let x of l.reg_index(code, new RegExp("(?<=<).+?(?=>)", "g")))
        ignr.push([x[0] - 1, x[1].length + 2]);
    var add_dev = (v) => {
      if (mode == 0) for (let x of v) this.dev_text.push(x);
    };
    for (let k = 0; k < code.length; k++) {
      if (html)
        if (ignr.length > 0)
          if (k == ignr[0][0]) {
            let ln = ignr[0][1];
            ignr.splice(0, 1);
            add_dev(code.substring(k, k + ln));
            k += ln - 1;
            continue;
          }
      let key = code[k];
      if (this.next_chars == "" && key in this.akSharANi) {
        this.varna[2] = "";
        this.vitaraNa(key, mode, sa, elm, lang);
      } else if (
        this.next_chars == "" &&
        l.is_upper(key) &&
        l.to_lower(key) in this.akSharANi
      ) {
        this.varna[2] = "";
        this.vitaraNa(l.to_lower(key), mode, sa, elm, lang);
      } else if (this.next_chars != "") {
        if (l.in(this.next_chars, key)) {
          if (this.d) {
            this.halant_add_status = true;
            this.d = false;
          }
          this.varna[2] = this.varna[1];
          key = this.varna[0] + key;
          this.vitaraNa(key, mode, sa, elm, lang);
        } else if (key == ";" || key == "q") {
          this.clear_all_val(true);
          if (mode == 1) this.back_space++;
          else if (mode == 0 && lang == "Romanized") this.dev_text.push(";");
        } else if (key in this.akSharANi) {
          this.clear_all_val();
          this.varna[2] = "";
          if (
            this.store_last_of_3 != "" &&
            this.pUrva_lekhit[4][1] != 0 &&
            lang == "Tamil-Extended" &&
            key == "#"
          )
            this.clear_all_val(true);
          this.vitaraNa(key, mode, sa, elm, lang);
        } else if (l.is_upper(key) && l.to_lower(key) in this.akSharANi) {
          this.clear_all_val();
          this.vitaraNa(l.to_lower(key), mode, sa, elm, lang);
        } else {
          add_dev(key);
          this.clear_all_val(true);
        }
      } else {
        add_dev(key);
        this.clear_all_val(true);
      }
    }
    if (mode == 0) {
      let vl = this.dev_text.join("");
      this.dev_text = [];
      this.clear_all_val(true);
      return vl;
    }
  }
  vitaraNa(key, mode, sa, elm, lang) {
    let l = this.k;
    if (
      lang == "Urdu" &&
      l.in(["a", "i", "u"], key) &&
      this.pUrva_lekhit[4][1] == -1
    )
      key += "1";
    let cap_0_from_1 = [false, ["", -1]];
    let data = this.akSharANi[key[0]];
    let current = data[key];
    let prev_temp = this.pUrva_lekhit[3][1];
    let temp = this.pUrva_lekhit[4][1];
    let varna_sthiti = l.last(current);
    if (this.mAtrA_sthiti && l.in([1, 2], varna_sthiti)) {
      this.clear_all_val(true);
      this.vitaraNa(l.last(key), mode, sa, elm, lang);
      return;
    }
    this.varna[0] = key;
    this.varna[1] = current[0];
    if (temp == 1 || temp == 3) {
      if (varna_sthiti == 1 && !l.in(this.next_chars, l.last(key)) && sa == 0) {
        this.halant_add_status = true;
        if (temp == 3) {
          this.back_space++;
          this.varna[1] = this.store_last_of_3 + this.varna[1];
        }
      } else if (varna_sthiti == 0) this.mAtrA_sthiti = true;
    }
    if (this.capital[0] == 1 && mode == 1) {
      if (key == this.capital[1]) {
        this.capital[0] = 2;
        this.second_cap_time = l.time();
      } else if (
        l.last(key) == this.capital[1] &&
        this.akSharANi[l.to_upper(this.capital[1])][
          l.to_upper(this.capital[1])
        ][0] != this.varna[1]
      ) {
        this.capital[6] = true;
        this.capital[0] = 2;
        this.capital[2] = varna_sthiti;
        this.capital[5] = this.varna[1].length;
        this.second_cap_time = l.time();
      } else this.capital = [0, "", -1, -1, 0, 0];
    }
    if ((key == "LR" || key == "r3") && varna_sthiti == 0) {
      if (prev_temp != 1) this.mAtrA_sthiti = false;
      else if (sa == 0) this.back_space++;
      if (l.in(["Modi", "Sharada"], lang)) {
        this.back_space++;
      }
    }
    if (this.mAtrA_sthiti) {
      this.varna[1] = current[1];
      if (temp == 1 && sa == 1) this.back_space += this.halant.length;
      if (temp == 3) {
        this.back_space++;
        if (sa == 1) this.back_space++;
        this.varna[1] += this.store_last_of_3;
        this.last_of_3_status_for_mAtrA = true;
      } else if (temp == 0 && this.last_of_3_status_for_mAtrA) {
        this.varna[1] += this.store_last_of_3;
        this.last_of_3_status_for_mAtrA = true;
      }
    }
    if (
      lang == "Tamil-Extended" &&
      key == "M" &&
      (((prev_temp == 3 || (prev_temp == 0 && this.pUrva_lekhit[2][1] == 3)) &&
        temp == 0) ||
        (this.capital[0] == 3 &&
          (this.pUrva_lekhit[1][1] == 3 ||
            (this.pUrva_lekhit[1][1] == 0 && this.pUrva_lekhit[0][1] == 3)) &&
          this.pUrva_lekhit[2][1] == 0))
    ) {
      this.varna[1] += this.store_last_of_3;
      this.back_space++;
    }
    if (lang == "Tamil-Extended" && l.in(["#an", "#s"], key)) {
      if (
        key == "#an" &&
        (this.pUrva_lekhit[1][1] == 3 ||
          (this.pUrva_lekhit[1][1] == 0 && this.pUrva_lekhit[0][1] == 3)) &&
        this.pUrva_lekhit[2][1] == 0
      ) {
        this.varna[1] += this.store_last_of_3;
        this.back_space++;
      } else if (
        key == "#s" &&
        (this.pUrva_lekhit[2][1] == 3 ||
          this.pUrva_lekhit[2][1] == 0 ||
          this.pUrva_lekhit[1][1] == 3) &&
        this.pUrva_lekhit[3][1] == 0
      ) {
        this.varna[1] += this.store_last_of_3;
        this.back_space++;
        this.special_ved_s = true;
      }
    }
    if (lang == "Tamil" && key == "R" && temp == 1 && varna_sthiti == 2)
      this.back_space++;
    if (
      lang == "Tamil-Extended" &&
      l.in(["#ss", "#sss"], key) &&
      this.special_ved_s
    )
      this.varna[1] += this.store_last_of_3;
    if (
      temp == 1 &&
      varna_sthiti == 2 &&
      key.length == 1 &&
      Object.keys(data).length > 1 &&
      sa == 0
    ) {
      for (let v of l.last(current, -2)) {
        if (key + v in data) {
          if (l.last(data[key + v]) == 1) this.d = true;
          break;
        }
      }
    }
    if (
      (l.in(lang, "Tamil") || lang == "Punjabi") &&
      l.in(["R", "LR", "LRR", "RR"], key) &&
      varna_sthiti == 1
    )
      varna_sthiti = 2;
    if (sa == 1) {
      if (varna_sthiti == 1) this.varna[1] += this.halant;
      else if (varna_sthiti == 3)
        this.varna[1] =
          l.substring(this.varna[1], 0, -1) +
          this.halant +
          l.last(this.varna[1]);
    }
    let val = this.likha(
      this.varna[1],
      this.varna[2],
      this.back_space,
      this.halant_add_status
    );
    if (mode == 0) {
      for (let p = 0; p < val[1]; p++) this.dev_text.pop();
      for (let x of val[0]) this.dev_text.push(x);
    } else if (mode == 1) {
      this.input_helper_values = {
        from_click: this.from_click,
        val: val,
      };
      if (this.from_click) this.from_click = false;
    }
    if (this.capital[0] == 3) this.capital = [0, "", -1, -1, 0, 0, false];
    if (
      key.length == 1 &&
      l.is_lower(key) &&
      l.to_upper(key) in this.akSharANi &&
      this.capital[0] == 0 &&
      mode == 1
    ) {
      let a = [0, "", -1, -1, 0, 0, false];
      let b = [
        1,
        key,
        varna_sthiti,
        temp,
        l.time(),
        this.varna[1].length,
        false,
      ];
      if (key + key in data) {
        if (
          this.akSharANi[l.to_upper(key)][l.to_upper(key)][0] !=
          data[key + key][0]
        )
          this.capital = b;
        else this.capital = a;
      } else this.capital = b;
    }
    this.next_chars = current[current.length - 2];
    if (varna_sthiti == 3) this.store_last_of_3 = l.last(this.varna[1]);
    if (this.next_chars == "") this.clear_all_val();
    this.pUrva_lekhit[0] = this.pUrva_lekhit[1];
    this.pUrva_lekhit[1] = this.pUrva_lekhit[2];
    this.pUrva_lekhit[2] = this.pUrva_lekhit[3];
    this.pUrva_lekhit[3] = this.pUrva_lekhit[4];
    this.pUrva_lekhit[4] = [key, varna_sthiti];
  }
  likha(b, a, bk, hal) {
    // a = what is currently on screen
    // b = it is that to which a has to be replaced
    let back = 0;
    let lekha = "";
    if (a == "" || b == "") {
      lekha = b;
      back = a.length;
    } else if (b[0] != a[0]) {
      lekha = b;
      back = a.length;
    } else {
      let x = 0;
      for (let n in a) {
        let v = a[n];
        if (b.length == x) break;
        if (b[x] != a[x]) break;
        x++;
      }
      lekha = b.substring(x);
      back = a.length - x;
    }
    back += bk;
    if (hal) lekha = this.halant + lekha;
    this.back_space = 0;
    this.halant_add_status = false;
    return [lekha, back];
  }
  clear_all_val(spl) {
    this.next_chars = "";
    this.varna = ["", "", ""];
    this.mAtrA_sthiti = false;
    this.last_of_3_status_for_mAtrA = false;
    this.special_ved_s = false;
    this.back_space = 0;
    if (spl) {
      this.pUrva_lekhit = [
        ["", -1],
        ["", -1],
        ["", -1],
        ["", -1],
        ["", -1],
      ];
      this.store_last_of_3 = "";
    }
  }
  _parivartak(val, from, to, html = false, norm = true) {
    if (norm) {
      from = this.k.normalize(from);
      to = this.k.normalize(to);
    }
    if (from == to) return val;
    var l = lipi_hlp;
    var convert = (ln, t) =>
        this.prakriyA({
          lang: ln,
          text: t,
          html: html,
        }),
      ignr = [];
    if (html)
      for (let x of l.reg_index(val, new RegExp("(?<=<).+?(?=>)", "g")))
        ignr.push([x[0] - 1, x[1].length + 2]);
    if (from == "Normal") return convert(to, val);
    var get_antar_kram = (ln, type = 0) => {
      let or = ["antar", "kram"];
      if (!(or[type] in l.akSharAH[ln])) return [{}, []][type];
      return l.akSharAH[ln][or[type]];
    };
    var pUrva = [
        ["", "", -1],
        ["", "", -1],
        ["", "", -1],
        ["", "", -1],
        ["", "", -1],
      ], //5 purva varna references
      db = get_antar_kram(from),
      db2 = get_antar_kram(to),
      ord1 = get_antar_kram(from, 1),
      ord2 = get_antar_kram(to, 1),
      res = "",
      next = "",
      chr = "";
    var get_hal = (d) => {
      if (!l.in(["Normal", "Romanized", "Urdu"], d))
        return l.akSharAH[d]["."][".x"][0];
      return "";
    };
    var get_nukta = (d) => {
      if ("." in l.akSharAH[d])
        if (".z" in l.akSharAH[d]["."]) return l.akSharAH[d]["."][".z"][0];
      return "";
    };
    var hal = {
        from: get_hal(from),
        to: get_hal(to),
      },
      nukta = {
        from: get_nukta(from),
        to: get_nukta(to),
      };
    var gt = (v) => {
      // get value for scannded text
      if (
        l.in(["Romanized", "Urdu"], from) ||
        l.in(["Normal", "Romanized", "Urdu"], to)
      ) {
        let vl = db[v][0],
          rom = [
            ["o", "e"],
            ["O", "E"],
          ];
        if (to != "Urdu" && l.in(rom[0], vl))
          if (
            !l.in(
              [
                "Tamil",
                "Telugu",
                "Kannada",
                "Malayalam",
                "Sinhala",
                "Purna-Devanagari",
              ],
              from
            )
          )
            // ^ scripts in which there is differnce of dirgha and hrasva 'e' and 'o'
            vl = rom[1][rom[0].indexOf(vl)];
        if (v == hal.from) vl = "";
        return vl;
      }
      if (l.in(ord1, v)) {
        let vl = ord2[ord1.indexOf(v)];
        return vl == 1 ? "" : vl;
      } else if (db[v].length == 4) {
        let vl = ord2[db[v][3]];
        return vl == 1 ? "" : vl;
      }
      if (l.in([0.1, 2.1, 1.1], db[v][1])) {
        let r = "";
        for (let x of v) {
          let vl = ord2[ord1.indexOf(x)];
          r += vl == 1 ? "" : vl;
        }
        return r;
      }
      if (
        pUrva[0][0].length == 1 &&
        l.in([1, 3], pUrva[1][2]) &&
        pUrva[0][2] == 0
      )
        this.pUrva_lekhit[4] = [pUrva[1][1], pUrva[1][2]];
      let vl = convert(to, db[v][0]);
      if (l.in([1, 3], pUrva[0][2]))
        if (vl[0] in db2)
          if (l.in([1, 3], Math.floor(db2[v][1]))) vl = hal.to + vl;
      return vl == 1 ? "" : vl;
    };
    var loop = (x, i, last = false, no_more = false) => {
      if (
        !no_more &&
        l.in(["\ud805", "\ud804"], x) &&
        l.in(["Modi", "Sharada", "Brahmi", "Siddham", "Granth"], from)
      )
        // ^ also adding support for the above languages through a simple fix
        return -2;
      let done = false,
        sthiti = -1,
        continued = false;
      if (html)
        if (ignr.length > 0)
          if (i == ignr[0][0]) {
            let ln = ignr[0][1];
            ignr.splice(0, 1);
            res += val.substring(i, i + ln);
            return ln;
          }
      if (next != "") {
        if (!last && l.in(next, x)) {
          chr += x;
          let dt = db[chr];
          next = dt.length == 2 ? "" : dt[2];
          sthiti = Math.floor(dt[1]);
          done = true;
          continued = true;
        } else {
          let vl = gt(chr);
          pUrva[0][1] = vl;
          res += vl;
        }
      }
      if (!last && !done && x in db) {
        let dt = db[x];
        next = dt.length == 2 ? "" : dt[2];
        sthiti = Math.floor(dt[1]);
        chr = x;
        done = true;
      }
      if (
        !continued &&
        l.in(["Normal", "Romanized", "Urdu"], to) &&
        l.in([1, 3], pUrva[0][2]) &&
        sthiti != 0 &&
        !l.in([hal.from, nukta.from], x)
      )
        // condition if vyanjana is not follwed by svar matra
        res += "a";
      if (!last && !done) {
        res += x;
        chr = "";
        next = "";
        sthiti = -1;
      }
      if (!last) {
        if (!continued) for (let j = 4; j >= 1; j--) pUrva[j] = pUrva[j - 1];
        pUrva[0] = ["", "", -1];
        pUrva[0][0] = chr;
        pUrva[0][2] = sthiti;
      }
      if (done && next == "") {
        let vl = gt(chr);
        pUrva[0][1] = vl;
        res += vl;
      }
    };
    let tamil_ex = (v1, type) => {
      // Preparing text for conversions in Tamil Extended
      let mtr = "ாிீுூெேைொோௌ்", // all matras and halant
        num = ["²³⁴", "₂₃₄"],
        sva_anu = "॒॑᳚᳛", // anudAttA followed by three svarits
        tml = "கசஜடதப",
        reg =
          type == "to"
            ? `[${tml}][${num[0]}][${mtr}]`
            : `[${tml}][${mtr}][${num[0] + num[1]}]`,
        x2 = type == "to" ? 1 : 2,
        d1 = type == "to" ? db2 : db;
      let r1 = v1.split("");
      for (let x1 of l.reg_index(v1, new RegExp(reg, "gm"))) {
        let x = x1[0],
          k = d1[r1[x]];
        if (k.length > 2) {
          let k1 = r1[x + x2];
          if (l.in(num[1], k1))
            // if subscript nums then make it superscript
            k1 = r1[x + x2] = num[0][num[1].indexOf(k1)];
          if (l.in(k[2], k1)) {
            let tmp = r1[x + 1];
            r1[x + 1] = r1[x + 2];
            r1[x + 2] = tmp;
          }
        }
      }
      return r1.join("");
    };
    if (from == "Tamil-Extended") val = tamil_ex(val, "from");
    for (let i = 0; i < val.length; i++) {
      let t = loop(val[i], i);
      if (t == -2) loop(val[i] + val[i + 1], ++i);
      else if (t >= 2) i += t - 1; // ignoring html elements
    }
    loop(" ", val.length, true);
    if (to == "Tamil-Extended") return tamil_ex(res, "to");
    else if (l.in([from, to], "Urdu") || l.in([from, to], "Romanized"))
      return convert(to, res);
    return res;
  }
}
const lipi_hlp = new lipi_helper();
const LipiLekhikA = new LipiParivartak();
lipi_hlp.k = LipiLekhikA;

/**
 * @param {string} lang
 * @returns {string}
 */
export const normalize_lang_code = (lang) => {
  return LipiLekhikA.k.normalize(lang);
};

/**
 * @param {string} lang
 * @returns {Promise<number>}
 */
export const get_sa_mode = async (lang) => {
  lang = normalize_lang_code(lang);
  return LipiLekhikA.k.akSharAH[lang].sa;
};

export const load_parivartak_lang_data = async (
  lang,
  base_lang_folder = "./src"
) => {
  await LipiLekhikA.k.load_lang(lang, null, false, true, base_lang_folder);
};

const _lipi_parivartak = async (val, from, to) => {
  from = normalize_lang_code(from);
  to = normalize_lang_code(to);
  let out = LipiLekhikA._parivartak(val, from, to);
  if (["Normal", "Romanized"].includes(to)) {
    out = out.replaceAll("''", "`");
  }
  return out;
};

/**
 * This function is used to convert the text from one script to another
 * @template T
 * @param {T extends string | string[]} val - The text or array of texts to be converted
 * @param {string} from - The script of the text(s) to be converted
 * @param {string} to - The script to which the text(s) is to be converted
 * @returns {any} - A promise that resolves to the converted text or array of texts
 */
export const lipi_parivartak = async (val, from, to) => {
  await Promise.all([
    load_parivartak_lang_data(from),
    load_parivartak_lang_data(to),
  ]);
  if (Array.isArray(val)) {
    return await Promise.all(
      val.map((text) => _lipi_parivartak(text, from, to))
    );
  }
  return await _lipi_parivartak(val, from, to);
};

/**
 * The mukhya function performs a specific task.
 *
 * @param {any} elm - The element to be updated.
 * @param {string} [event_data=''] - The text parameter. Default value is an empty string.
 * @param {string} [lang=''] - The lang parameter. Default value is an empty string.
 * @param {boolean} [on_status=true] - The on_status parameter. Default value is true.
 * @param {any} [callback=null] - The callback parameter. Default value is null.
 * @param {0|1|undefined|null} [sa_mode=null] - The sa_mode parameter. Default value is null.
 */
export const lekhika_typing_tool = async (
  elm,
  event_data = "",
  lang = "",
  on_status = true,
  sa_mode = null
) => {
  const input_data = LipiLekhikA.mukhya(event_data, lang, on_status, sa_mode);
  // console.timeEnd('lekhika_typing_tool');
  // only load the main lipi_lekhika_lib to improve as some lag noticed while typing
  // the latencry is at least 6x higher than worker method (direct :- 0.14ms, worker :- 10ms)
  if (!input_data) return;
  const { val, from_click } = input_data;
  if (val.length === 0) return;
  let dyn = elm.value;
  let current_cursor_pos = elm.selectionStart + 1;
  let ex = 0;
  if (from_click) {
    current_cursor_pos++;
    ex = 1;
  }
  let pre_part = dyn.substring(0, current_cursor_pos - val[1] - 2);
  let changing_part = val[0];
  let post_part = "";
  if (dyn.length + 1 + (from_click ? 1 : 0) == current_cursor_pos)
    post_part = dyn.substring(current_cursor_pos + 1);
  else if (dyn.length + 1 != current_cursor_pos)
    post_part = dyn.substring(current_cursor_pos - 1 - ex);
  let length = pre_part.length + changing_part.length;
  const new_value = pre_part + changing_part + post_part;
  elm.value = new_value;
  elm.focus();
  elm.selectionStart = length;
  elm.selectionEnd = length;
  callback && callback(new_value);
};
