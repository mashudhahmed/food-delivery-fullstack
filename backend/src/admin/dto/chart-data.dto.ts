export class RevenueChartDataDto {
  date: string;
  revenue: number;
  orders: number;
}

export class OrderChartDataDto {
  date: string;
  orders: number;
  amount: number;
}

export class UserChartDataDto {
  month: string;
  customers: number;
  owners: number;
  agents: number;
}