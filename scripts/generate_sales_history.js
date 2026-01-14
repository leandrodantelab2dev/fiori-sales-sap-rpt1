/* Gera 5 anos (60 meses) de vendas mensais para produtos Apple e salva em db/data/sales.ai-SalesHistory.csv */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const products = [
  { name: "iPhone", baseAmount: 120000, baseQty: 900 },
  { name: "MacBook", baseAmount: 85000, baseQty: 220 },
  { name: "iPad", baseAmount: 65000, baseQty: 350 },
  { name: "AirPods", baseAmount: 30000, baseQty: 700 },
  { name: "Apple Watch", baseAmount: 25000, baseQty: 420 }
];

function uuid() {
  return crypto.randomUUID();
}

// Pequena sazonalidade + ruído
function factorForMonth(m) {
  // m = 0..11
  const seasonal = [0.98, 0.97, 1.00, 1.02, 1.03, 1.01, 1.00, 1.02, 1.04, 1.08, 1.18, 1.10];
  const noise = 1 + (Math.random() * 0.06 - 0.03); // -3% a +3%
  return seasonal[m] * noise;
}

function trendForYearIndex(y) {
  // Cresce ~6% ao ano com leve variação
  const yearly = 1 + (0.055 + Math.random() * 0.01) * y;
  return yearly;
}

function fmt2(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const now = new Date();
const endYear = now.getFullYear();
const endMonth = now.getMonth(); // 0..11

// começa exatamente 60 meses atrás (incluindo o mês atual como último)
const totalMonths = 60;
const start = new Date(endYear, endMonth, 1);
start.setMonth(start.getMonth() - (totalMonths - 1));

const out = [];
out.push("ID,date,product,amount,quantity,currency");

let cursor = new Date(start);

for (let i = 0; i < totalMonths; i++) {
  const yIndex = Math.floor(i / 12);
  const m = cursor.getMonth();
  const yyyy = cursor.getFullYear();
  const mm = pad2(m + 1);
  const date = `${yyyy}-${mm}-01`;

  for (const p of products) {
    const f = factorForMonth(m) * trendForYearIndex(yIndex);

    // receita e quantidade correlacionadas
    const amount = p.baseAmount * f;
    const qty = Math.max(1, Math.round(p.baseQty * f * (1 + (Math.random() * 0.04 - 0.02))));

    out.push(`${uuid()},${date},${p.name},${fmt2(amount)},${qty},USD`);
  }

  cursor.setMonth(cursor.getMonth() + 1);
}

const target = path.join(__dirname, "..", "db", "data", "sales.ai-SalesHistory.csv");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out.join("\n"), "utf8");

console.log("✅ CSV gerado em:", target);
console.log("Linhas:", out.length - 1);