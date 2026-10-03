import { collections } from '../config/database';

export interface AssetVerificationResult {
  valid: boolean;
  playerId: string;
  serverCardIds: string[];
  extraOnClient: string[];
  missingOnClient: string[];
}

export async function verifyClientAssets(playerId: string, claimedCardIds: string[] = []): Promise<AssetVerificationResult> {
  const playerDoc = await collections.players().doc(playerId).get();
  const serverCardIds: string[] = playerDoc.exists
    ? ((playerDoc.data()?.cards as string[]) || [])
    : [];

  const claimed = new Set(claimedCardIds.filter(Boolean));
  const server = new Set(serverCardIds);
  const extraOnClient = [...claimed].filter(id => !server.has(id));
  const missingOnClient = [...server].filter(id => !claimed.has(id));

  return {
    valid: extraOnClient.length === 0,
    playerId,
    serverCardIds,
    extraOnClient,
    missingOnClient,
  };
}
