export type LoyaltySettings = {
  pointsPerAmount: number;
  amountPerPoints: number;
  minimumOrderAmount: number;
  isActive: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export const defaultLoyaltySettings: LoyaltySettings = {
  pointsPerAmount: 1,
  amountPerPoints: 10000,
  minimumOrderAmount: 0,
  isActive: true,
  updatedAt: null,
  updatedBy: null,
};
