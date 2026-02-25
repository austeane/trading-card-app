import type { TournamentConfig, TournamentListEntry } from '../types'
import { QCN26_LAYOUT_V1 } from '../constants'

export const QCN_2026_TOURNAMENT: TournamentListEntry = {
  "id": "qcn-2026",
  "name": "QC National Championships 2026",
  "year": 2026,
  "published": true
}

export const QCN_2026_CONFIG: TournamentConfig = {
  "id": "qcn-2026",
  "name": "QC National Championships 2026",
  "year": 2026,
  "branding": {
    "tournamentLogoKey": "config/tournaments/qcn-2026/logos/tournament.png",
    "primaryColor": "#4a1525"
  },
  "teams": [
    { "id": "alberta-clippers", "name": "Alberta Clippers", "logoKey": "" },
    { "id": "carleton-ravens", "name": "Carleton Ravens", "logoKey": "" },
    { "id": "guelph-quadball", "name": "Guelph Quadball", "logoKey": "" },
    { "id": "mischief-quadball", "name": "Mischief Quadball", "logoKey": "" },
    { "id": "montreal-flamingos", "name": "Montreal Flamingos", "logoKey": "" },
    { "id": "u-of-t-quadball", "name": "U of T Quadball", "logoKey": "" },
    { "id": "university-of-waterloo", "name": "University of Waterloo", "logoKey": "" },
    { "id": "university-of-ottawa", "name": "University of Ottawa", "logoKey": "" },
    { "id": "ubc-quadball", "name": "UBC Quadball", "logoKey": "" }
  ],
  "cardTypes": [
    {
      "type": "player",
      "enabled": true,
      "label": "Player",
      "showTeamField": true,
      "showJerseyNumber": true,
      "positions": ["Chaser", "Keeper", "Beater", "Seeker"],
      "positionMultiSelect": true,
      "maxPositions": 4
    },
    {
      "type": "team-staff",
      "enabled": true,
      "label": "Team Staff",
      "showTeamField": true,
      "showJerseyNumber": false,
      "positions": ["Captain", "Coach", "Manager", "Staff"]
    },
    {
      "type": "media",
      "enabled": true,
      "label": "Media",
      "showTeamField": false,
      "showJerseyNumber": false,
      "logoOverrideKey": "config/tournaments/qcn-2026/logos/tournament.png",
      "positions": ["Commentator", "Livestream", "Photographer", "Videographer", "Media"]
    },
    {
      "type": "official",
      "enabled": true,
      "label": "Official",
      "showTeamField": false,
      "showJerseyNumber": false,
      "logoOverrideKey": "config/tournaments/qcn-2026/logos/tournament.png",
      "positions": ["Flag Runner", "Head Referee", "Referee"]
    },
    {
      "type": "tournament-staff",
      "enabled": true,
      "label": "Tournament Staff",
      "showTeamField": false,
      "showJerseyNumber": false,
      "logoOverrideKey": "config/tournaments/qcn-2026/logos/tournament.png",
      "positions": ["Gameplay", "Tournament Staff", "Volunteer"]
    }
  ],
  "templates": [
    {
      "id": "qcn26",
      "label": "QCN26",
      "layout": QCN26_LAYOUT_V1
    }
  ],
  "defaultTemplates": {
    "fallback": "qcn26"
  },
  "createdAt": "2026-02-16T00:00:00.000Z",
  "updatedAt": "2026-02-16T00:00:00.000Z"
}
