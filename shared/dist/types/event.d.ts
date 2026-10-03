export type EventType = 'merchant' | 'storm' | 'lucky' | 'copy';
export interface MerchantOffer {
    id: string;
    itemType: 'pack' | 'material' | 'card';
    itemId: string;
    price: number;
    currencyType: 'soft' | 'hard';
    discount: number;
}
export interface ActiveEvent {
    id: string;
    playerId: string;
    eventType: EventType;
    triggeredAt: string;
    expiresAt?: string;
    merchantOffers?: MerchantOffer[];
    stormDrawsRemaining?: number;
    luckyMomentBonus?: number;
    copiedCard?: any;
    claimed: boolean;
}
//# sourceMappingURL=event.d.ts.map