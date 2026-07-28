export class OwnerAnalyticsDto {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  completionRate: number;
  revenueGrowth: number;
  orderGrowth: number;
  avgOrderGrowth: number;
  conversionGrowth: number;
  revenueTrend: { date: string; revenue: number; orders: number }[];
  orderStatusData: { name: string; value: number; color: string }[];
  popularItems: { name: string; sales: number; revenue: number }[];
  categoryData: { name: string; value: number; color: string }[];
}