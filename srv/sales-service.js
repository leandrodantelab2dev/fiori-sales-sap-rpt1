const cds = require("@sap/cds");
const { SalesHistory, SalesPrediction } = cds.entities("sales.ai"); 
const crypto = require("crypto");

async function postJson(url, body, auth) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = auth.startsWith("Bearer") ? auth : `Bearer ${auth}`;

  try {
    console.info("RPT-1 POST ->", url, "headers:", Object.keys(headers), "bodyPreview:", JSON.stringify(body)?.slice(0, 2000));
  } catch (e) {}

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text().catch(() => "");
  try {
    console.info("RPT-1 response status", res.status, "bodyPreview:", text?.slice(0, 2000));
  } catch (e) {}

  if (!res.ok) {
    const err = new Error(`RPT-1 request failed: ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

function month01FromDateLike(v) {
  if (!v) return null;
  const s = String(v);
  // expects YYYY-MM or YYYY-MM-DD
  if (s.length >= 7) return `${s.slice(0, 7)}-01`;
  return null;
}

function getStartMonthFromExisting(existingMonths) {
  if (existingMonths.length) return existingMonths[existingMonths.length - 1];
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10); // YYYY-MM-01
}

function getNextMonths(startMonth01, n) {
  const out = [];
  const base = new Date(startMonth01);
  base.setDate(1);
  for (let i = 1; i <= n; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    out.push(d.toISOString().slice(0, 10)); // YYYY-MM-01
  }
  return out;
}

module.exports = cds.service.impl(function () {
  /**
   * CDS: action runPrediction() returns many SalesForecast;  (ou SalesPrediction)
   * FE vai chamar via ActionImport: POST runPrediction
   */
  this.on("runPrediction", async (req) => {
    const data = req.data || {};

    // params opcionais (se quiser passar via action):
    // months: 3..12, product, region, persist
    const providedProductRaw = (data.product || "").toString().trim();
    const product = providedProductRaw.toUpperCase().trim();
    const months = Number(data.months ?? 12);
    const persist = data.persist === undefined ? true : !!data.persist;

    // exigir que o usuário escolha o produto e o número de meses
    if (!product) return req.error(400, "Parameter 'product' is required for runPrediction");
    if (!Number.isInteger(months) || months <= 0 || months > 36) return req.error(400, "Parameter 'months' must be an integer between 1 and 36");

    const tx = cds.transaction(req);

    // =========================
    // 1) Buscar histórico
    // =========================
    // query history (do not rely on DB case-sensitivity) and filter in JS if needed
    const historyRaw = await tx.run(
      SELECT.from(SalesHistory).orderBy("date asc")
    );
    let history = historyRaw;
    if (product) {
      history = historyRaw.filter(h => String(h.product || "").toUpperCase() === product);
    }

    if (!history.length) {
      // if user provided a product, show available sample products to help
      const sampleProducts = Array.from(new Set(historyRaw.map(h => h.product).filter(Boolean))).slice(0,10);
      const sampleMsg = sampleProducts.length ? ` available products: ${sampleProducts.join(', ')}` : '';
      return req.error(400, `No history found in rp1.SalesHistory for the provided filters${sampleMsg}`);
    }

    // =========================
    // 2) Agregar por mês (YYYY-MM-01)
    // =========================
    // Mantém o último sales_qty do mês, ou soma (aqui vou SOMAR, que é mais “vendas do mês”)
    // Note: db.SalesHistory uses `quantity` and `amount` fields
    const byMonth = new Map(); // month01 -> { qty, revenue }
    for (const h of history) {
      const month01 = month01FromDateLike(h.date);
      if (!month01) continue;

      const prev = byMonth.get(month01) || { qty: 0, revenue: 0 };
      prev.qty += Number(h.quantity ?? 0);
      prev.revenue += Number(h.amount ?? 0);
      byMonth.set(month01, prev);
    }

    const existingMonths = Array.from(byMonth.keys()).sort();
    const startMonth = getStartMonthFromExisting(existingMonths);
    const futureMonths = getNextMonths(startMonth, months);

    // compute average price (revenue per unit) from history to estimate predictedRevenue
    let totalQty = 0, totalRevenue = 0;
    for (const m of existingMonths) {
      const v = byMonth.get(m) || { qty: 0, revenue: 0 };
      totalQty += Number(v.qty ?? 0);
      totalRevenue += Number(v.revenue ?? 0);
    }
    const avgPrice = totalQty > 0 ? totalRevenue / totalQty : 0;

    // =========================
    // 3) Montar rows do RPT-1
    // =========================
    // index_column precisa ser único. Vou usar key = PRODUCT_YYYY-MM-01
    const rows = [];

    // histórico
    for (const m of existingMonths) {
      const v = byMonth.get(m);
      rows.push({
        key: `${product || "ALL"}_${m}`,
        product: providedProductRaw || (history[0]?.product ?? "UNKNOWN"),
        date: m,
        sales_qty: Math.round(Number(v?.qty ?? 0))
      });
    }

    // futuro com [PREDICT]
    for (const m of futureMonths) {
      rows.push({
        key: `${product || "ALL"}_${m}`,
        product: providedProductRaw || (history[0]?.product ?? "UNKNOWN"),
        date: m,
        sales_qty: "[PREDICT]"
      });
    }

    const payload = { rows, index_column: "key" };
    // create map key -> metadata (product) to restore values from response keys
    const keyMeta = new Map(rows.map(r => [String(r.key), { product: r.product }]));
    try {
      console.info(">> RPT1 payload rows:", rows.length, "sample:", JSON.stringify(payload).slice(0, 2000));
    } catch (e) {}

    // =========================
    // 4) Chamar RPT-1
    // =========================
    const url = process.env.RPT1_URL;
    if (!url) return req.error(500, "RPT1_URL not configured in environment");
    const auth = process.env.RPT1_AUTH || "";

    let respJson;
    try {
      respJson = await postJson(url, payload, auth);
    } catch (e) {
      return req.error(502, `RPT-1 request failed: ${e.message}`);
    }

    // =========================
    // 5) Parse: RPT-1 may return different shapes depending on endpoint/version
    //    prefer OData-like `value`, otherwise accept `rows`, `predictions` or other shapes
    // =========================
    let returned = null;
    if (Array.isArray(respJson?.value)) {
      returned = respJson.value;
    } else if (Array.isArray(respJson?.rows)) {
      returned = respJson.rows;
    } else if (Array.isArray(respJson?.predictions)) {
      // normalize predictions array into simple objects where possible
      returned = respJson.predictions.map(p => {
        if (!p || typeof p !== 'object' || Array.isArray(p)) return p;
        const out = Object.assign({}, p);
        if (Array.isArray(p.prediction) && p.prediction[0]) {
          out.prediction = p.prediction[0].prediction ?? p.prediction[0];
          out.confidence = p.prediction[0].confidence ?? out.confidence;
        } else if (p.prediction && typeof p.prediction === 'object') {
          out.prediction = p.prediction.prediction ?? out.prediction;
          out.confidence = p.prediction.confidence ?? out.confidence;
        }
        return out;
      });
    } else if (respJson && typeof respJson === 'object' && respJson.prediction && Array.isArray(respJson.prediction.rows)) {
      returned = respJson.prediction.rows;
    } else if (respJson && typeof respJson === 'object' && respJson.prediction && Array.isArray(respJson.prediction.predictions)) {
      // RPT-1 returns { prediction: { predictions: [ { key, sales_qty: [{prediction,confidence}] } ] } }
      returned = respJson.prediction.predictions.map(p => {
        const key = String(p?.key ?? "");
        const parts = key.split("_");
        // support keys like PRODUCT_YYYY-MM-01 or PRODUCT_REGION_YYYY-MM-01
        const datePart = parts.length >= 3 ? parts.slice(parts.length - 1).join("_") : (parts[1] || p.date || "");
        let sales = null;
        let conf = null;
        if (Array.isArray(p.sales_qty) && p.sales_qty.length) {
          sales = p.sales_qty[0]?.prediction ?? p.sales_qty[0];
          conf = p.sales_qty[0]?.confidence ?? null;
        } else if (p.sales_qty !== undefined) {
          sales = p.sales_qty;
          conf = p.confidence ?? null;
        }
        const meta = keyMeta.get(key) || {};
        return {
          date: datePart,
          product: String(meta.product ?? parts[0] ?? product ?? "UNKNOWN"),
          predicted_sales: sales,
          confidence: conf
        };
      });
    }

    if (!Array.isArray(returned)) {
      let dump = "<unstringifiable>";
      try {
        dump = JSON.stringify(respJson);
        if (dump.length > 8000) dump = dump.slice(0, 8000) + "...<truncated>";
      } catch {}
      console.error("RPT-1 response missing expected array (value|rows|predictions):", dump);
      return req.error(500, "Could not parse RPT-1 response: missing expected array (value|rows|predictions) - see server logs");
    }

    // log amostra
    try {
      console.info("RPT-1 sample value:", JSON.stringify(returned.slice(0, 3)));
    } catch {}

    // =========================
    // 6) Normalizar e filtrar só meses futuros
    // =========================
    // compare only year-month to avoid UTC/day shifts (use YYYY-MM)
    const futureMonthKeys = new Set(futureMonths.map(m => String(m).slice(0, 7))); // YYYY-MM
    const forecasts = [];

    for (const r of returned) {
      const rawDate = String(r?.date ?? "");
      const monthKey = rawDate.length >= 7 ? rawDate.slice(0, 7) : null; // YYYY-MM
      if (!monthKey || !futureMonthKeys.has(monthKey)) continue;

      const p = String(r.product ?? (product || "UNKNOWN")).toUpperCase();
      const rg = String(r.region ?? "").toUpperCase();

      const qty = Math.round(Number(r.predicted_sales ?? r.prediction ?? r.sales_qty ?? NaN));
      if (!Number.isFinite(qty)) continue;

      const conf = Number(r.confidence ?? 0);

      forecasts.push({
        date: `${monthKey}-01`,
        product: p,
        region: rg,
        predicted_sales: qty,
        confidence: conf
      });
    }

    if (!forecasts.length) {
      return req.error(500, "RPT-1 returned no usable forecast rows for future months");
    }

    // =========================
    // 7) Persistir em SalesPrediction (entidade existente em db/schema.cds)
    //    Nota: SalesPrediction schema tem campos: period, predictedRevenue, confidence, model, createdAt
    // =========================
    if (persist) {
      // removemos previsões anteriores geradas pelo mesmo modelo
      await tx.run(DELETE.from(SalesPrediction).where({ model: 'SAP-RPT-1' }));

      const nowIso = new Date().toISOString();

      const entries = forecasts.map(f => ({
        ID: crypto.randomUUID(),
        period: String(f.date).slice(0, 7), // YYYY-MM
        product: f.product,
        region: f.region,
        predictedQuantity: Number(f.predicted_sales),
        predictedRevenue: Number((Number(f.predicted_sales) * avgPrice).toFixed(2)),
        confidence: f.confidence,
        model: "SAP-RPT-1",
        createdAt: nowIso
      }));

      await tx.run(INSERT.into(SalesPrediction).entries(entries));
    }

    // =========================
    // 8) Retornar para o FE
    // =========================
    // Action returns many SalesForecast/SalesPrediction
    // Se seu CDS retorna SalesForecast, o shape precisa bater.
    // Se o FE só precisa do resultado, isso aqui já resolve.
    return forecasts;
  });
});