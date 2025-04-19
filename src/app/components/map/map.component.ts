import { Component, OnInit, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { FilterComponent } from './filter/filter.component';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { RoutesService } from '../../services/routes.service';
@Component({
  selector: 'app-map',
  imports: [FilterComponent, CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {

  private rutaActual: L.GeoJSON | null = null;
  rutaLayer: L.Layer | null = null;
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
  
          // Aquí llamamos directamente a la función para actualizar la descripción en FilterComponent
          this.filterComponent.addDescription(description);
  
          // Agregar la nueva ruta al mapa
          const capa = L.geoJSON(data);
          capa.addTo(this.mapService.getMap());
          this.mapService.getMap().fitBounds(capa.getBounds());
  
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

  // Función que recibe la ruta y la agrega al mapa
  mostrarRuta(geojsonData: any | null) {

    const map = this.mapService.getMap();

    // Si hay una ruta actual, elimínala siempre
    if (this.rutaActual) {
      map.removeLayer(this.rutaActual);
      this.rutaActual = null;
    }

    // Si hay una nueva ruta válida, agrégala
    if (geojsonData && geojsonData.type === 'FeatureCollection') {
      this.rutaActual = L.geoJSON(geojsonData).addTo(map);

      // Centrar el mapa en la nueva ruta
      const bounds = this.rutaActual.getBounds();
      map.fitBounds(bounds);
    } else if (geojsonData) {
      console.error('El objeto no es un GeoJSON válido');
    }
  }
  
}
