# Fiori Sales Forecast with SAP RPT-1

This repository provides a complete end-to-end reference implementation of how to integrate **SAP RPT-1 (tabular LLM)** with a **SAP Fiori Elements** application using **SAP CAP (Node.js)**.

The goal is to demonstrate how structured business data (sales history) can be sent to SAP RPT-1 for prediction, stored back into SAP BTP, and visualized in a governed enterprise UI.

---

## What this project does

- Loads **5 years of monthly Apple product sales** from CSV (mock data)
- Exposes this data as an **OData V4 service** using SAP CAP
- Provides a **Fiori Elements List Report** to explore the history
- Adds a toolbar action **“Run Prediction (RPT-1)”**
- Sends historical data + future rows with `[PREDICT]` to **SAP RPT-1**
- Receives predicted values from RPT-1
- Stores the forecast in `SalesForecast`
- Displays the prediction in a second Fiori Elements list

---

## Why SAP RPT-1

SAP RPT-1 is a foundation model designed specifically for **structured tabular data**.  
Unlike classical LLMs that require prompt engineering, RPT-1 works directly on tables:

- You send rows of historical data
- You mark unknown cells with `[PREDICT]`
- The model learns patterns and fills the missing values

Example:

```json
{
  "rows": [
    { "month": "2025-10", "revenue": 100000 },
    { "month": "2025-11", "revenue": 112000 },
    { "month": "2025-12", "revenue": 130000 },
    { "month": "2026-01", "revenue": "[PREDICT]" }
  ],
  "index_column": "month"
}
```

Docs: https://rpt.cloud.sap/docs

---

## Architecture

```
+--------------------+
|  Fiori Elements    |
|  (List Report UI)  |
+----------+---------+
           |
           v
+--------------------+
|  CAP OData V4 API  |
|  SalesService     |
|  - SalesHistory   |
|  - SalesForecast  |
|  - runPrediction  |
+----------+---------+
           |
           v
+--------------------+
|   SAP RPT-1 API    |
|  (Tabular LLM)     |
+--------------------+
```

---

## Project Structure

```
.
├── app/
│   └── webapp/               # Fiori Elements frontend
├── db/
│   ├── schema.cds            # Data model
│   └── data/
│       └── sales.ai-SalesHistory.csv   # 5 years of Apple sales (mock)
├── srv/
│   ├── sales-service.cds     # OData service + action
│   └── sales-service.js     # RPT-1 integration logic
├── package.json
└── README.md
```

---

## Data Model

`db/schema.cds`

```cds
namespace sales.ai;

entity SalesHistory {
  key ID        : UUID;
      date      : Date;
      product   : String(20);
      region    : String(5);
      sales_qty : Integer;
      revenue   : Decimal(15,2);
}

entity SalesForecast {
  key ID              : UUID;
      date            : Date;
      product         : String(20);
      region          : String(5);
      predicted_sales : Integer;
      confidence      : Decimal(5,2);
      createdAt       : Timestamp;
      model           : String(50);
}
```

---

## OData Service

`srv/sales-service.cds`

```cds
using { sales.ai as db } from '../db/schema';

service SalesService {
  entity SalesHistory  as projection on db.SalesHistory;
  entity SalesForecast as projection on db.SalesForecast;

  action runPrediction() returns many SalesForecast;
}
```

---

## How the Prediction Flow Works

1. User opens the Sales History list in Fiori
2. User clicks **Run Prediction (RPT-1)**
3. Fiori executes the OData Action `runPrediction`
4. CAP backend:
   - Reads historical monthly sales from SalesHistory
   - Builds a RPT-1 payload with future months marked as `[PREDICT]`
   - Sends the table to the RPT-1 API
5. RPT-1 returns predicted values
6. CAP persists them into SalesForecast
7. Fiori shows the forecast as a new list

---

## RPT-1 Request Format

The CAP backend sends:

```json
{
  "rows": [
    { "key": "IPHONE_BR_2025-12-01", "product": "IPHONE", "region": "BR", "date": "2025-12-01", "sales_qty": 420 },
    { "key": "IPHONE_BR_2026-01-01", "product": "IPHONE", "region": "BR", "date": "2026-01-01", "sales_qty": "[PREDICT]" }
  ],
  "index_column": "key"
}
```

---

## RPT-1 Response Example

```json
{
  "@odata.context": "$metadata#Collection(...)",
  "value": [
    {
      "date": "2026-02-01",
      "product": "IPHONE",
      "region": "BR",
      "predicted_sales": 438,
      "confidence": 0.9
    }
  ]
}
```

The backend accepts multiple formats (`value`, `rows`, or direct arrays) to be robust.

---

## Local Setup

### Install dependencies
```bash
npm install
```

### Configure RPT-1 credentials
```bash
export RPT1_URL=https://rpt.cloud.sap/api/predict
export RPT1_AUTH=Bearer <YOUR_TOKEN>
```

### Run locally
```bash
cds watch
```

This will:
- Create SQLite tables
- Load CSV mock data
- Expose OData
- Launch the Fiori app

---

## Using Git

```bash
git init
git add .
git commit -m "Initial Fiori + CAP + RPT-1 integration"
git remote add origin https://github.com/<your-org>/fiori-sales-rpt1.git
git push -u origin main
```

---

## Why this matters

This project demonstrates how SAP customers can:
- Use **LLMs for structured business forecasting**
- Avoid custom ML pipelines
- Keep **Clean Core** by running AI logic on SAP BTP
- Expose predictions in standard **Fiori apps**

This is exactly the future direction of **AI-powered SAP applications**.
