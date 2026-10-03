export interface Player {
    id: string;
    username: string;
    email: string;
    softCurrency: number;
    hardCurrency: number;
    cards: string[];
    galleryCardIds: string[];
    level: number;
    experience: number;
    battlePassLevel: number;
    battlePassXP: number;
    hasPaidBattlePass: boolean;
    luckValue: number;
    drawsSinceLastLegendary: number;
    consecutiveSynthesisFailures: number;
    consecutiveLoginDays: number;
    lastLoginDate: string;
    totalPlayTime: number;
    preferredThemes: string[];
    collectionFocus: string[];
    friends: string[];
    legendaryPacksThisWeek: number;
    weekResetDate: string;
    createdAt: string;
    lastActiveAt: string;
}
//# sourceMappingURL=player.d.ts.map