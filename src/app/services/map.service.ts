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
  private paraderosLayer: L.LayerGroup | null = null;
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
  
    // Validamos que la geometría sea una línea
    if (rutaFeature.geometry.type !== 'LineString') {
      console.error('La ruta no es una LineString');
      return;
    }
  
    const linea = turf.lineString(rutaFeature.geometry.coordinates);
  
    // Filtramos los paraderos que estén cerca de la línea (ruta)
    const paraderosCercanos = paraderos.filter((paradero) => {
      const punto = turf.point(paradero.geometry.coordinates);
      // Distancia máxima en grados (~100 metros, puedes ajustar)
      const distanciaMaxima = 0.00010; 
      const distancia = turf.pointToLineDistance(punto, linea, { units: 'degrees' });
      return distancia <= distanciaMaxima;
    });
  
    // Limpiar capa anterior si existe
    if (this.paraderosLayer) {
      this.map.removeLayer(this.paraderosLayer);
    }
  
    // Mostrar los paraderos filtrados
    this.paraderosLayer = L.geoJSON(paraderosCercanos, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, { icon: this.iconoParadero });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.nombre) {
          layer.bindPopup(feature.properties.nombre);
        }
      }
    }).addTo(this.map);
  }

  clearParaderos() {
    if (this.paraderosLayer) {
      this.map.removeLayer(this.paraderosLayer); // Remover los paraderos si existe la capa
      this.paraderosLayer = null;
    }
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

}
