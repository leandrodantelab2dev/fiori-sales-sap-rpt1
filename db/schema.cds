namespace sales.ai;

entity SalesHistory {
  key ID      : UUID;
  date        : Date;          // vamos usar sempre dia 01 do mês
  product     : String(80);
  amount      : Decimal(15,2); // revenue
  quantity    : Integer;
  currency    : String(3);
}

entity SalesPrediction {
  key ID        : UUID;
  period            : String(10);      // Ex: 2026-02
  product           : String(80);
  region            : String(10);
  predictedQuantity : Integer;
  predictedRevenue  : Decimal(15,2);
  confidence        : Decimal(5,2);
  model             : String(50);
  createdAt         : Timestamp;
}