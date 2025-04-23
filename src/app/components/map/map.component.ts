import { Component, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { FilterComponent } from './filter/filter.component';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { RoutesService } from '../../services/routes.service';
import * as turf from '@turf/turf';
import { point, lineString } from '@turf/helpers';
import booleanPointOnLine from '@turf/boolean-point-on-line';

@Component({
  selector: 'app-map',
  imports: [FilterComponent, CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {

  private rutaActual: L.GeoJSON | null = null;
  paraderos: any[] = [];
  rutaLayer: L.Layer | null = null;
  barriosResaltados = L.featureGroup();

  @ViewChild(FilterComponent, { static: false }) filterComponent!: FilterComponent;

  mostrarFiltro = false;

  constructor(private mapService: MapService, private routesService: RoutesService) {}
  
  ngAfterViewInit() {
    // Ahora podemos acceder a FilterComponent cuando ya está en el DOM
    console.log(this.filterComponent); // Para verificar que la referencia se ha asignado correctamente
  }

  toggleFiltro() {
    this.mostrarFiltro = !this.mostrarFiltro;
  }

  ngOnInit(): void {
    // Inicializar el mapa desde el servicio
    this.mapService.initMap('map', [2.927300, -75.281890], 13);
    this.cargarParaderos();
    this.barriosResaltados = L.featureGroup().addTo(this.mapService.getMap());
  }

  cargarParaderos(): void {
    this.routesService.cargarParaderosGeoJSON().subscribe((data) => {
      this.paraderos = data.features; // Guardar los paraderos en la propiedad 'paraderos'
    });
  }

  usarMiUbicacion() {
    this.mapService.getUserLocation((coords) => {
      console.log('Ubicación obtenida desde el componente:', coords);
    });
  }

  addRuta(nombreArchivo: string | null) {
    if (!nombreArchivo) {
      if (this.rutaActual) {
        this.mapService.getMap().removeLayer(this.rutaActual);
        this.rutaActual = null;
      }
      return;
    }
  
    this.routesService.cargarRuta(nombreArchivo).subscribe(
      (data) => {
        console.log('Ruta cargada:', data);
  
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          // Eliminar ruta anterior si existe
          if (this.rutaActual) {
            this.mapService.getMap().removeLayer(this.rutaActual);
          }
  
          // Obtener la descripción
          const description = data.features[0].properties.description || 'No disponible';
          this.filterComponent.addDescription(description);
  
          // Agregar la nueva ruta al mapa
          const capa = L.geoJSON(data);
          capa.addTo(this.mapService.getMap());
          this.mapService.getMap().fitBounds(capa.getBounds());
  
          // Filtrar y cargar los paraderos cercanos a la ruta
          this.mapService.cargarParaderos(this.paraderos, data);
  
          // Guardar la capa actual para poder eliminarla después
          this.rutaActual = capa;
        } else {
          console.error('El objeto no es un GeoJSON válido');
        }
      },
      (error) => {
        console.error('Error al cargar el archivo GeoJSON:', error);
      }
    );
  }

  mostrarRuta(geojsonData: any | null) {
    const map = this.mapService.getMap();
  
    // Si hay una ruta actual, elimínala siempre
    if (this.rutaActual) {
      map.removeLayer(this.rutaActual);
      this.rutaActual = null;
    }
  
    // Si hay una nueva ruta válida, agrégala
    if (geojsonData && geojsonData.type === 'FeatureCollection' && Array.isArray(geojsonData.features)) {
      if (geojsonData.features.length > 0) {
        this.rutaActual = L.geoJSON(geojsonData).addTo(map);
  
        const bounds = this.rutaActual.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        } else {
          console.error('La ruta no tiene una geometría válida para ajustar los límites del mapa');
        }
      } else {
        console.error('El GeoJSON no contiene ningún feature válido');
      }
    } else {
      console.error('El objeto no es un GeoJSON válido');
    }
  }
  
  resaltarBarrios(barrios: any[]) {
    const map = this.mapService.getMap();
  
    // Limpia barrios anteriores
    this.barriosResaltados.clearLayers();
  
    barrios.forEach(barrio => {
      const barrioLayer = L.geoJSON(barrio, {
        style: {
          color: 'blue',
          weight: 2,
          fillOpacity: 0.3
        }
      });
      barrioLayer.addTo(this.barriosResaltados);
    });
  
    this.barriosResaltados.addTo(map);
  
    // Centra el mapa en los barrios resaltados
    if (this.barriosResaltados.getLayers().length > 0) {
      map.fitBounds(this.barriosResaltados.getBounds());
    }
  }
  
}
