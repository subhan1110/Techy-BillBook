import { BackupSnapshot } from '../types/models';

export type SyncConnectionState = 'offline_local' | 'ready_for_firebase';

export interface FirebaseSyncConfig {
  enabled: boolean;
  projectId: string | null;
  shopId: string | null;
  lastSyncedAt: string | null;
}

/**
 * Clean adapter contract prepared for future Firebase Firestore integration.
 * Local SQLite remains the primary offline source of truth; when Firebase is
 * enabled in a future release, this adapter can push/pull mutations using
 * Firestore collections:
 *   - shops/{shopId}/settings/profile
 *   - shops/{shopId}/products/{productId}
 *   - shops/{shopId}/customers/{customerId}
 *   - shops/{shopId}/bills/{billId}
 *   - shops/{shopId}/udhar_transactions/{txId}
 */
export interface IFirebaseSyncAdapter {
  getSyncStatus(): FirebaseSyncConfig;
  preparePendingPayload(snapshot: BackupSnapshot): {
    collectionCounts: Record<string, number>;
    readyForUpload: boolean;
  };
}

export class FutureFirebaseSyncAdapter implements IFirebaseSyncAdapter {
  getSyncStatus(): FirebaseSyncConfig {
    return {
      enabled: false,
      projectId: null,
      shopId: null,
      lastSyncedAt: null,
    };
  }

  preparePendingPayload(snapshot: BackupSnapshot) {
    return {
      collectionCounts: {
        products: snapshot.products.length,
        customers: snapshot.customers.length,
        bills: snapshot.bills.length,
        udharTransactions: snapshot.udharTransactions.length,
      },
      readyForUpload: true,
    };
  }
}

export const firebaseSyncAdapter = new FutureFirebaseSyncAdapter();
