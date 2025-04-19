import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private map!: L.Map;
  private userMarker: L.Marker | null = null;

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
          this.userMarker = L.marker(coords).addTo(this.map).bindPopup('Estás aquí.').openPopup();
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
      this.map.setView([2.927300, -75.281890], 13); // Usa aquí las coordenadas y zoom iniciales de tu app
    }
  }
}
