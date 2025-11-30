import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as turf from '@turf/turf';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  iconoParadero = L.icon({
    iconUrl: 'assets/images/marker-icon.png',
    iconSize: [15, 20],
    iconAnchor: [6, 20],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  iconoUserLocation = L.icon({
    iconUrl: 'assets/images/userLocation.png',
    iconSize: [20, 25],
    iconAnchor: [11, 25],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  private map!: L.Map;
  private userMarker: L.Marker | null = null;
  private startMarker: L.Marker | null = null;
  private endMarker: L.Marker | null = null;

  private clickHandler: any = null; // Para activar/desactivar el modo selección
  private paraderosLayers: L.LayerGroup[] = [];
  private selectedCoords: [number, number] | null = null;
  constructor(private http: HttpClient) {}
  barriosLayer: L.GeoJSON<any> | null = null;
  // 👇 Define un icono personalizado
  
  initMap(mapId: string, coords: [number, number], zoom: number = 13): L.Map {
    this.map = L.map(mapId,{
      zoomControl: false
    }).setView(coords, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    return this.map;
  }

  // --------------------------------------------------------
  // ACTIVAR SELECCION: Retorna coords como PROMESA
  // --------------------------------------------------------
  enablePointSelection(markerType: "start" | "end"): Promise<[number, number]> {
    if (!this.map) return Promise.reject("Mapa no inicializado");

    // Quitamos listener previo si existía
    this.disablePointSelection();

    // Si ya existía marcador, lo eliminamos para actualizar
    if (markerType === "start" && this.startMarker) {
      this.map.removeLayer(this.startMarker);
      this.startMarker = null;
    }

    if (markerType === "end" && this.endMarker) {
      this.map.removeLayer(this.endMarker);
      this.endMarker = null;
    }

    // Retornamos una promesa que se resuelve en el clic
    return new Promise((resolve) => {
      this.clickHandler = (e: L.LeafletMouseEvent) => {
        const coords: [number, number] = [e.latlng.lat, e.latlng.lng];

        // Crear el marcador adecuado
        if (markerType === "start") {
          this.startMarker = L.marker(coords).addTo(this.map);
        } else {
          this.endMarker = L.marker(coords).addTo(this.map);
        }

        // Desactivamos la selección
        this.disablePointSelection();

        resolve(coords);
      };

      this.map.on("click", this.clickHandler);
    });
  }

  // --------------------------------------------------------
  // DESACTIVAR SELECCION
  // --------------------------------------------------------
  disablePointSelection() {
    if (this.map && this.clickHandler) {
      this.map.off("click", this.clickHandler);
      this.clickHandler = null;
    }
  }




  getUserLocation(callback?: (coords: [number, number]) => void): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        
        if (this.userMarker) {
          this.userMarker.setLatLng(coords);
        } else {
          this.userMarker = L.marker(coords, { icon: this.iconoUserLocation }).addTo(this.map).bindPopup('Estás aquí.').openPopup();
        }

        if (callback) callback(coords);

      }, () => {
        alert('No se pudo obtener la geolocalización.');
      });
    } else {
      alert('Geolocalización no soportada por el navegador.');
    }
  }

private watchId: number | null = null;
private trackingEnabled = false;

toggleUserTracking(): void {
  if (this.trackingEnabled) {
    navigator.geolocation.clearWatch(this.watchId!);
    this.watchId = null;
    this.trackingEnabled = false;
    console.log('Seguimiento detenido');
    this.clearUserLocation();

  } else {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        
        if (this.userMarker) {
          this.userMarker.setLatLng(coords);
        } else {
          this.userMarker = L.marker(coords, { icon: this.iconoUserLocation })
            .addTo(this.map)
            .bindPopup('Estás aquí.')
            .openPopup();
        }

        this.map.setView(coords, this.map.getZoom());
      },
      (error) => {
        alert('No se pudo obtener la ubicación.');
      }
    );
    this.trackingEnabled = true;
    console.log('Seguimiento activado');
  }
}

isTrackingEnabled(): boolean {
  return this.trackingEnabled;
}

clearUserLocation(): void {
  if (this.userMarker) {
    this.map.removeLayer(this.userMarker);
    this.userMarker = null;
  }
}

  getMap(): L.Map {
    return this.map;
  }

  resetMapView(): void {
    if (this.map) {
      this.map.setView([2.927300, -75.281890], 13);
    }
  }
  
  cargarParaderos(paraderos: any[], rutaGeoJSON: any) {
    const rutaFeature = rutaGeoJSON.features[0];
  
    if (rutaFeature.geometry.type !== 'LineString') {
      console.error('La ruta no es una LineString');
      return;
    }
  
    const linea = turf.lineString(rutaFeature.geometry.coordinates);
  
    const paraderosCercanos = paraderos.filter((paradero) => {
      const punto = turf.point(paradero.geometry.coordinates);
      const distanciaMaxima = 0.00010; // (~100 metros)
      const distancia = turf.pointToLineDistance(punto, linea, { units: 'degrees' });
      return distancia <= distanciaMaxima;
    });
  
    // 👉 Ya no eliminamos todos los paraderos anteriores.
    // Creamos una nueva capa para estos paraderos
    const nuevaCapaParaderos = L.geoJSON(paraderosCercanos, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon: this.iconoParadero });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.nombre) {
          layer.bindPopup(feature.properties.nombre);
        }
      }
    });
  
    nuevaCapaParaderos.addTo(this.map);
  
    // Guardar la capa para poder limpiarlas después si quieres
    this.paraderosLayers.push(nuevaCapaParaderos);
  }

  clearParaderos() {
    this.paraderosLayers.forEach(capa => {
      this.map.removeLayer(capa);
    });
    this.paraderosLayers = [];
  }

  resaltarBarrios(barrios: any[]) {
    // Limpia las capas anteriores (si hay alguna)
    if (this.barriosLayer) {
      this.map.removeLayer(this.barriosLayer);
    }
  
    // Crear una nueva capa de barrios resaltados
    this.barriosLayer = L.geoJSON(barrios, {
      style: () => ({
        color: 'green',
        weight: 3,
        opacity: 0.7,
        fillOpacity: 0.3
      })
    }).addTo(this.map);
  }

  clearMapLayers() {
    this.map.eachLayer((layer: L.Layer) => {
      // Evitar eliminar la capa base del mapa (como la capa de tiles)
      if (!(layer instanceof L.TileLayer)) {
        this.map.removeLayer(layer);
      }
    });
  }

}
