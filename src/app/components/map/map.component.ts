import { Component, Input, OnInit, ViewChild } from '@angular/core';
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
  private _rutaSeleccionada: string | null = null;

  @Input() set rutaSeleccionada(value: string | null) {
    if (value !== this._rutaSeleccionada) {
      this._rutaSeleccionada = value;
      this.addRuta(value);
    }
  }

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

  addRuta(nombreArchivo: string | string[] | null) {
    if (!nombreArchivo) {
      if (this.rutaActual) {
        this.mapService.getMap().removeLayer(this.rutaActual);
        this.rutaActual = null;
      }
      return;
    }
    const tipo_archivo = typeof nombreArchivo
    console.log(tipo_archivo)
    console.log(nombreArchivo)
    // Si es un arreglo (dos rutas)
    if (Array.isArray(nombreArchivo) && nombreArchivo.length === 2) {
      // Eliminar ruta anterior si existe
      let descripcionOrigen : string | null
      let descripcionDestino : string | null
      let rutaOrigen : string | null
      let rutaDestino : string | null
      if (this.rutaActual) {
        this.mapService.getMap().removeLayer(this.rutaActual);
        this.rutaActual = null;
      }
  
      // Ruta de Origen (color azul)
      this.routesService.cargarRuta(nombreArchivo[0]).subscribe(data => {
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const capaOrigen = L.geoJSON(data, {
            style: {
              color: 'blue',
              weight: 4,
              opacity: 0.8
            }
          });

          capaOrigen.addTo(this.mapService.getMap());
          this.mapService.getMap().fitBounds(capaOrigen.getBounds());

          const description = data.features[0].properties.description || 'No disponible';
          //this.filterComponent.addDescription(description);
          descripcionOrigen = description
          rutaOrigen = data.features[0].properties.name
          this.mapService.cargarParaderos(this.paraderos, data);
        } else {
          console.error('El objeto no es un GeoJSON válido');
        }
      });

      // Ruta de Destino (color naranja)
      this.routesService.cargarRuta(nombreArchivo[1]).subscribe(data => {
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          const capaDestino = L.geoJSON(data, {
            style: {
              color: 'orange',
              weight: 4,
              opacity: 0.8
            }
          });

          capaDestino.addTo(this.mapService.getMap());
          this.mapService.getMap().fitBounds(capaDestino.getBounds());

          const description = data.features[0].properties.description || 'No disponible';
          //this.filterComponent.addDescription(description);
          descripcionDestino = description
          rutaDestino = data.features[0].properties.name
          this.mapService.cargarParaderos(this.paraderos, data);
        } else {
          console.error('El objeto no es un GeoJSON válido');
        }
        this.filterComponent.addDescription(`No se encontro una ruta directa, debe tomar una ruta combinada\n` + `Debe hacer uso de la ruta ` + rutaOrigen  + ` y hacer transbordo a la ruta ` + rutaDestino + `\n` +  `Descipcion ` + rutaOrigen + "\n" + descripcionOrigen + "\n" + "Descipcion " + rutaDestino + "\n" + descripcionDestino);
      });
      return;
    } else {
      // Si es un string normal (una sola ruta)
      console.log(nombreArchivo)
      this.routesService.cargarRuta(nombreArchivo[0]).subscribe(
        (data) => {
          console.log('Ruta cargada:', data);
    
          if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            if (this.rutaActual) {
              this.mapService.getMap().removeLayer(this.rutaActual);
            }
    
            const description = data.features[0].properties.description || 'No disponible';
            this.filterComponent.addDescription(description);
    
            const capa = L.geoJSON(data);
            capa.addTo(this.mapService.getMap());
            this.mapService.getMap().fitBounds(capa.getBounds());
            this.mapService.cargarParaderos(this.paraderos, data);
    
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
  
    // Define estilos para origen y destino
    const estiloOrigen = {
      color: 'green',
      fillColor: 'green',
      fillOpacity: 0.3,
      weight: 2
    };
  
    const estiloDestino = {
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.3,
      weight: 2
    };
  
    // Suponiendo que barrios[0] es el origen y barrios[1] es el destino
    if (barrios.length > 0) {
      const barrioOrigen = barrios[0];
      const barrioDestino = barrios[1];
  
      // Resalta el barrio de origen con verde
      const barrioLayerOrigen = L.geoJSON(barrioOrigen, { style: estiloOrigen });
      barrioLayerOrigen.addTo(this.barriosResaltados);
  
      // Resalta el barrio de destino con rojo
      const barrioLayerDestino = L.geoJSON(barrioDestino, { style: estiloDestino });
      barrioLayerDestino.addTo(this.barriosResaltados);
    }
  
    this.barriosResaltados.addTo(map);
  
    // Centra el mapa en los barrios resaltados
    if (this.barriosResaltados.getLayers().length > 0) {
      map.fitBounds(this.barriosResaltados.getBounds());
    }
  }
  
}
