// Actualiza precio, valoración, opiniones y fecha en index.html
// directamente desde la ficha de Amazon.es del Echo Dot (5ª gen).
//
// Uso:
//   node update-price.mjs          -> precio del buybox de producto NUEVO
//   node update-price.mjs desde    -> precio más bajo ("nueva y de segunda mano")
//
// Nota: Amazon bloquea las peticiones sin cabeceras de navegador, por eso
// se envía un User-Agent completo. Si Amazon responde con captcha, el script
// mantiene los últimos valores válidos que ya están en el HTML.

import { readFile, writeFile } from "node:fs/promises";

const PRODUCT_URL = "https://www.amazon.es/dp/B09B8X9RGM";
const HTML = new URL("./index.html", import.meta.url);
const MODO_DESDE = process.argv.includes("desde");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function extraer(html) {
  if (!/id="productTitle"/.test(html)) {
    throw new Error("Amazon ha devuelto una página de verificación de robot");
  }

  // Precio por bloque de compra: NEW (producto nuevo) y USED (2.ª mano)
  const precioDeBloque = (slot) => {
    const i = html.indexOf(`data-csa-c-slot-id="${slot}"`);
    if (i === -1) return null;
    const trozo = html.slice(i, i + 8000);
    const m = trozo.match(/class="a-offscreen">\s*([\d.,]+)\s*€/);
    return m ? m[1] : null;
  };

  const nuevo = precioDeBloque("newAccordionRow_0");
  const usado = precioDeBloque("usedAccordionRow");
  const desde =
    html.match(
      /De segunda mano \(\d+\) desde[\s\S]{0,400}?a-offscreen">\s*([\d.,]+)\s*€/
    )?.[1] ?? null;

  const valoracion = html.match(/title="([\d,]+) de 5 estrellas/)?.[1];
  const opiniones = html.match(
    /id="acrCustomerReviewText"[^>]*>\s*\(([\d.]+)\)/
  )?.[1];

  const precio = MODO_DESDE ? desde ?? nuevo : nuevo;
  if (!precio) throw new Error("No se encontró el precio en la ficha de Amazon");

  return { precio: `${precio} €`, nuevo, usado, desde, valoracion, opiniones };
}

function reemplazar(html, d) {
  let out = html;
  let cambios = 0;

  out = out.replace(/data-amazon="precio">[^<]*</g, (m) => {
    cambios++;
    return `data-amazon="precio">${d.precio}<`;
  });

  const hoy = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  out = out.replace(/data-amazon="fecha">[^<]*</, `data-amazon="fecha">${hoy}<`);
  if (d.valoracion)
    out = out.replace(
      /data-amazon="valoracion">[^<]*</,
      `data-amazon="valoracion">${d.valoracion}<`
    );
  if (d.opiniones)
    out = out.replace(
      /data-amazon="opiniones">[^<]*</,
      `data-amazon="opiniones">${d.opiniones}<`
    );

  return { out, cambios };
}

try {
  console.log(`Consultando ${PRODUCT_URL} …`);
  const res = await fetch(PRODUCT_URL, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Amazon respondió HTTP ${res.status}`);

  const datos = extraer(await res.text());
  const doc = await readFile(HTML, "utf8");
  const { out, cambios } = reemplazar(doc, datos);

  await writeFile(HTML, out, "utf8");

  console.log(`✔ Precio publicado:  ${datos.precio}  (${MODO_DESDE ? "modo desde" : "buybox producto nuevo"})`);
  console.log(`  (nuevo ${datos.nuevo ?? "-"} · 2.ª mano ${datos.usado ?? "-"} · desde ${datos.desde ?? "-"})`);
  console.log(`✔ Valoración:        ${datos.valoracion ?? "?"} / 5`);
  console.log(`✔ Opiniones:         ${datos.opiniones ?? "?"}`);
  console.log(`✔ Actualizados ${cambios} precios en index.html`);
} catch (err) {
  console.error(`✖ Error: ${err.message}`);
  console.error("  Se mantienen los últimos valores válidos del HTML.");
  process.exitCode = 1;
}
