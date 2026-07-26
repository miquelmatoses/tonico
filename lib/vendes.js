// Tonico — vendes. El preu ja NO es calcula ací: la fórmula única viu a lib/preu.js
// (contracte v3, PAS 7). Este mòdul només reexporta l'estimació per comparables amb el
// nom històric, perquè cap punt de decisió tinga la temptació de fer-se'n una altra.
export { estimacioComparables as proposaPreuEixida } from './preu.js';
