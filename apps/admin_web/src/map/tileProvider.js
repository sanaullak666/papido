/**
 * Modular Tile Provider Layer for Papido (MapLibre GL JS)
 * 100% Free, zero-cost, open-source tile sources without paid API keys.
 * Easily swappable at runtime or via configuration.
 */

export const TILE_SOURCES = {
  // CARTO Voyager: Clean, modern, high-contrast, free OpenStreetMap tiles
  CARTO_VOYAGER: {
    id: 'carto-voyager',
    name: 'Carto Voyager (Default)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    tiles: [
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    ],
    tileSize: 256
  },
  // CARTO Positron: Crisp minimalist light style
  CARTO_POSITRON: {
    id: 'carto-positron',
    name: 'Carto Positron (Light)',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    tiles: [
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    ],
    tileSize: 256
  },
  // CARTO Dark Matter: Sleek dark mode map
  CARTO_DARK: {
    id: 'carto-dark',
    name: 'Carto Dark Matter',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    tiles: [
      'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    ],
    tileSize: 256
  },
  // Standard OpenStreetMap Tile Server
  OPENSTREETMAP: {
    id: 'openstreetmap',
    name: 'OpenStreetMap Standard',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    tiles: [
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ],
    tileSize: 256
  },
  // OpenFreeMap vector style (100% Free & Open Source)
  OPENFREEMAP_LIBERTY: {
    id: 'openfreemap-liberty',
    name: 'OpenFreeMap Liberty',
    attribution: '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty'
  }
};

/**
 * Builds a MapLibre GL style object for raster tile sources
 */
export function getMapLibreStyle(sourceKey = 'CARTO_VOYAGER') {
  const provider = TILE_SOURCES[sourceKey] || TILE_SOURCES.CARTO_VOYAGER;

  // If a full vector style URL is provided (e.g. OpenFreeMap)
  if (provider.styleUrl) {
    return provider.styleUrl;
  }

  return {
    version: 8,
    name: provider.name,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: provider.tiles,
        tileSize: provider.tileSize || 256,
        attribution: provider.attribution,
        maxzoom: provider.maxZoom || 19
      }
    },
    layers: [
      {
        id: 'raster-tiles-layer',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };
}

export default {
  TILE_SOURCES,
  getMapLibreStyle
};
