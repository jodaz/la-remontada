// Genera data/paises.json a partir de la lista de países del FMI.
// Se corre a mano cuando el FMI agrega o quita un país; el resultado es una lista propia
// que se revisa y se versiona. Uso: node scripts/generar-paises.mjs [ruta/countries.json]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const paisesIso = require("i18n-iso-countries");
paisesIso.registerLocale(require("i18n-iso-countries/langs/es.json"));

const API = "https://www.imf.org/external/datamapper/api/v1";
const entrada = process.argv[2];
const listaFmi = entrada
  ? JSON.parse(readFileSync(entrada, "utf8")).countries
  : (await (await fetch(`${API}/countries`)).json()).countries;

// Códigos del FMI que no son ISO 3166-1 alfa-3.
const ISO2_ESPECIAL = { UVK: "xk", KOS: "xk", WBG: "ps" };

// Nombres en español que la librería no trae o que conviene acortar.
const NOMBRE = {
  COD: "República Democrática del Congo",
  COG: "República del Congo",
  LAO: "Laos",
  PRK: "Corea del Norte",
  KOR: "Corea del Sur",
  SYR: "Siria",
  UVK: "Kosovo",
  WBG: "Cisjordania y Gaza",
  RUS: "Rusia",
  IRN: "Irán",
  VEN: "Venezuela",
  BOL: "Bolivia",
  TZA: "Tanzania",
  FSM: "Micronesia",
  MDA: "Moldavia",
  VNM: "Vietnam",
  TWN: "Taiwán",
  HKG: "Hong Kong",
  MAC: "Macao",
  CZE: "Chequia",
  TUR: "Turquía",
  BRN: "Brunéi",
  CPV: "Cabo Verde",
  SWZ: "Esuatini",
  CIV: "Costa de Marfil",
  GBR: "Reino Unido",
  USA: "Estados Unidos",
  NLD: "Países Bajos",
  MKD: "Macedonia del Norte",
};

// Nombre corto para etiquetas del meme y barras (≤ 12 caracteres cuando se puede).
const CORTO = {
  ARE: "Emiratos",
  BIH: "Bosnia",
  CAF: "Centroáfrica",
  COD: "RD Congo",
  COG: "Congo",
  DOM: "R. Dominicana",
  KNA: "San Cristóbal",
  MKD: "Macedonia",
  STP: "Santo Tomé",
  VCT: "San Vicente",
  USA: "EE. UU.",
  GBR: "Reino Unido",
  NLD: "Países Bajos",
  WBG: "Palestina",
  PNG: "Papúa N. G.",
  ATG: "Antigua",
  TTO: "Trinidad",
  SLB: "Islas Salomón",
  MHL: "Islas Marshall",
  GNQ: "G. Ecuatorial",
  KOR: "Corea del Sur",
  PRK: "Corea del Norte",
  SAU: "Arabia Saudí",
  SSD: "Sudán del Sur",
  ZAF: "Sudáfrica",
  NZL: "N. Zelanda",
  CIV: "C. de Marfil",
  TLS: "Timor Oriental",
  GNB: "Guinea-Bisáu",
  LCA: "Santa Lucía",
};

const banderas = new Set(
  readdirSync(new URL("../node_modules/flag-icons/flags/4x3", import.meta.url)).map((f) => f.replace(".svg", "")),
);

const salida = {};
const faltan = [];
for (const [iso3, { label }] of Object.entries(listaFmi)) {
  const iso2 = ISO2_ESPECIAL[iso3] ?? paisesIso.alpha3ToAlpha2(iso3)?.toLowerCase();
  if (!iso2 || !banderas.has(iso2)) {
    faltan.push(`${iso3} (${label})`);
    continue;
  }
  const nombre = NOMBRE[iso3] ?? paisesIso.getName(iso2.toUpperCase(), "es", { select: "alias" }) ?? label;
  salida[iso3] = { iso2, nombre, corto: CORTO[iso3] ?? nombre };
}

const ordenado = Object.fromEntries(Object.entries(salida).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../data/paises.json", import.meta.url), JSON.stringify(ordenado, null, 1) + "\n");
console.log(`${Object.keys(ordenado).length} países escritos.`);
if (faltan.length) console.log(`Sin ISO o sin bandera (se omiten): ${faltan.join(", ")}`);
