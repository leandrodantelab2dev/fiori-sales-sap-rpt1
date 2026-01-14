using { sales.ai as db } from '../db/schema';

service SalesService {

  entity SalesHistory    as projection on db.SalesHistory;
  entity SalesPrediction as projection on db.SalesPrediction;

  action runPrediction(
    product : String(80),
    months  : Integer,
    persist : Boolean
  ) returns many SalesPrediction;

}