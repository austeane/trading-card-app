export type ApiResponse = {
  message: string;
  success: boolean;
};

export type CardType =
  | "player"
  | "team-staff"
  | "media"
  | "official"
  | "tournament-staff"
  | "rare";

export type CardStatus = "draft" | "submitted" | "rendered";

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotateDeg: 0 | 90 | 180 | 270;
};

export type CardPhoto = {
  originalKey?: string;
  width?: number;
  height?: number;
  crop?: CropRect;
  cropKey?: string;
};

export type CardBase = {
  id: string;
  tournamentId: string;
  cardType: CardType;
  templateId?: string;
  status: CardStatus;
  photographer?: string;
  photo?: CardPhoto;
  renderKey?: string;
  createdAt: string;
  updatedAt: string;
  statusCreatedAt?: string;
};

export type StandardCard = CardBase & {
  cardType: Exclude<CardType, "rare">;
  firstName?: string;
  lastName?: string;
  teamId?: string;
  teamName?: string;
  position?: string;
  jerseyNumber?: string;
};

export type RareCard = CardBase & {
  cardType: "rare";
  title?: string;
  caption?: string;
};

export type Card = StandardCard | RareCard;

export type TournamentListEntry = {
  id: string;
  name: string;
  year: number;
  published?: boolean;
};

export type TournamentConfig = {
  id: string;
  name: string;
  year: number;
  branding: {
    tournamentLogoKey: string;
    orgLogoKey?: string;
    primaryColor?: string;
  };
  teams: Array<{
    id: string;
    name: string;
    logoKey: string;
  }>;
  cardTypes: Array<{
    type: CardType;
    enabled: boolean;
    label: string;
    showTeamField: boolean;
    showJerseyNumber: boolean;
    positions?: string[];
    logoOverrideKey?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CardDesign = Card;
