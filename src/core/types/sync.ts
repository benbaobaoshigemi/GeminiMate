export interface SyncAccountScope {
  accountKey: string;
  accountId: number;
  routeUserId: string | null;
}

export interface PromptItem {
  id: string;
  text: string;
  tags: string[];
  createdAt: number;
  updatedAt?: number;
}
