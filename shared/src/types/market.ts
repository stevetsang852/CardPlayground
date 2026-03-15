import { Card } from './card';

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  card: Card;
  price: number;
  currencyType: 'soft' | 'hard';
  views: number;
  listedAt: string;
  expiresAt?: string;
  soldAt?: string;
  buyerId?: string;
}

export interface PriceStatistics {
  cardTemplateId: string;
  averagePrice: number;
  medianPrice: number;
  lowestPrice: number;
  highestPrice: number;
  totalListings: number;
  recentSales: number;          // Last 24 hours
  priceChange24h: number;       // Percentage
}

export interface MarketTransaction {
  id: string;
  listingId: string;
  cardId: string;
  cardTemplateId: string;
  sellerId: string;
  buyerId: string;
  price: number;
  currencyType: 'soft' | 'hard';
  fee: number;                  // 5% of price
  sellerReceived: number;       // 95% of price
  transactedAt: string;
}
