import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { RoutesService } from '../../../services/routes.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NeighborhoodService } from '../../../services/neighborhood.service';
import * as turf from '@turf/turf';

@Component({
  selector: 'app-filter',
  imports: [CommonModule,HttpClientModule,FormsModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css'
})
export class FilterComponent {
  @Output() rutaDesdeOrigenDestino = new EventEmitter<any>();
  @Output() barriosSeleccionados = new EventEmitter<any[]>();
  @Output() rutaSeleccionada = new EventEmitter<string|null>();
  @Output() rutaDetectada = new EventEmitter<any>();

  
  deshabilitarRutas = false;
  deshabilitarOrigenDestino = false;

  rutaSeleccionadaArchivo: string | null = null;
  description: string = '';
  comunas: number[] = [];
  barrios: any[] = [];
  barriosFiltradosInicio: string[] = [];
  barriosFiltradosDestino: string[] = [];
  comunaSeleccionadaInicio: number | null = null;
  barrioSeleccionadoInicio: string | null = null;
  comunaSeleccionadaDestino: number | null = null;
  barrioSeleccionadoDestino: string | null = null;
  

  rutas: { nombre: string, archivo: string }[] = [];

  constructor(private mapService: MapService, private routesService: RoutesService, private neighborhoodService : NeighborhoodService) {}

  ngOnInit(): void {
    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      this.rutas = rutas;
    });

    this.neighborhoodService.cargarBarrios().subscribe(data => {
      this.barrios = data.features;
      const comunasSet = new Set(this.barrios.map(b => b.properties.NO__COMUNA));
      this.comunas = Array.from(comunasSet).sort(function(a,b){return a-b}); 
    });
  }

  onSeleccionRuta(event: Event) {
    const index = (event.target as HTMLSelectElement).selectedIndex - 1;
    const ruta = this.rutas[index];
    if (ruta && ruta.archivo) {
      this.deshabilitarOrigenDestino = true;
      this.rutaSeleccionada.emit(ruta.archivo); // emitimos el nombre del archivo
    } else {
      console.error('Ruta no válida');
    }
  }

  useMyLocation() {
    this.mapService.getUserLocation((coords) => {
      console.log('Ubicación desde filtro:', coords);
    });
  }

  onRutaChange(archivo: string) {
    this.routesService.cargarRuta(archivo).subscribe(ruta => {
      this.rutaSeleccionada.emit(ruta);
    });
  }

  //onSeleccionOrigenDestino() {
    //if (this.origenSeleccionado || this.destinoSeleccionado) {
      //this.deshabilitarRutas = true;
      // Aquí podrías emitir algún evento si planeas usar estos valores
    //}
  //}

  // Función para actualizar la descripción
  addDescription(description: string) {
    this.description = description; // Guardar la descripción recibida
  }
  
  onComunaSeleccionadaInicio(): void {
    this.barriosFiltradosInicio = this.barrios
      .filter(b => b.properties.NO__COMUNA == this.comunaSeleccionadaInicio)
      .map(b => b.properties.NOM_BARRIO)
      .sort();
  }

  onComunaSeleccionadaDestino(): void {
    this.barriosFiltradosDestino = this.barrios
      .filter(b => b.properties.NO__COMUNA == this.comunaSeleccionadaDestino)
      .map(b => b.properties.NOM_BARRIO)
      .sort();
  }


  onSeleccionOrigenDestino() {
    const barrioOrigen = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoInicio);
    const barrioDestino = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoDestino);
  
    if (!barrioOrigen || !barrioDestino) {
      console.error('Uno de los barrios no se encuentra');
      return;
    }
  
    // Verificación de selección
    console.log('[FilterComponent] Barrio origen:', barrioOrigen.properties.NOM_BARRIO);
    console.log('[FilterComponent] Barrio destino:', barrioDestino.properties.NOM_BARRIO);
  
    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      rutas.forEach(r => {
        this.routesService.cargarRuta(r.archivo).subscribe(rutaGeoJSON => {
          // Convertir las rutas y los barrios en geometrías
          const rutaLinea = turf.lineString(rutaGeoJSON.features[0].geometry.coordinates);
  
          // Convertir barrios en polígonos
          let origenPoly;
          let destinoPoly;
  
          // Verificar si es un MultiPolygon o Polygon
          if (barrioOrigen.geometry.type === 'MultiPolygon') {
            origenPoly = turf.multiPolygon(barrioOrigen.geometry.coordinates);
          } else {
            origenPoly = turf.polygon(barrioOrigen.geometry.coordinates);
          }
  
          if (barrioDestino.geometry.type === 'MultiPolygon') {
            destinoPoly = turf.multiPolygon(barrioDestino.geometry.coordinates);
          } else {
            destinoPoly = turf.polygon(barrioDestino.geometry.coordinates);
          }
  
          // Obtener el centroide de los barrios
          const centroOrigen = turf.centerOfMass(origenPoly);
          const centroDestino = turf.centerOfMass(destinoPoly);
  
          // Calcular la distancia entre la ruta y el centro de los barrios
          const distanciaOrigen = turf.pointToLineDistance(centroOrigen, rutaLinea, { units: 'meters' });
          const distanciaDestino = turf.pointToLineDistance(centroDestino, rutaLinea, { units: 'meters' });
  
          // Verificar si la distancia es menor a 100 metros
          const estaCercaOrigen = distanciaOrigen <= 100;
          const estaCercaDestino = distanciaDestino <= 100;
  
          // Verificación de proximidad
          console.log('Distancia a Barrio Origen:', distanciaOrigen);
          console.log('Distancia a Barrio Destino:', distanciaDestino);
          console.log('¿Está cerca del barrio origen?', estaCercaOrigen);
          console.log('¿Está cerca del barrio destino?', estaCercaDestino);
  
          if (estaCercaOrigen && estaCercaDestino) {
            console.log('[FilterComponent] Ruta cercana a ambos barrios');
            this.rutaSeleccionada.emit(r.archivo); // Emitir el nombre del archivo de la ruta
            this.barriosSeleccionados.emit([barrioOrigen, barrioDestino]); // Resalta los barrios
          }
        });
      });
    });
}

  verificarSeleccion() {
    console.log('[FilterComponent] Verificando selección...');
    if (this.barrioSeleccionadoInicio && this.barrioSeleccionadoDestino) {
      console.log('[FilterComponent] Ambos barrios seleccionados');
      this.onSeleccionOrigenDestino();
    }
  }

  limpiarFiltros() {
    this.comunaSeleccionadaInicio = null;
    this.barrioSeleccionadoInicio  = null;
    this.comunaSeleccionadaDestino = null;
    this.barrioSeleccionadoDestino  = null;
    this.deshabilitarOrigenDestino = false;
    this.deshabilitarRutas = false;
    this.rutaSeleccionadaArchivo = '';
    this.rutaSeleccionada.emit(null);
    this.mapService.clearUserLocation();
    this.mapService.resetMapView();
    this.description = "";
    this.mapService.clearParaderos();
  }




}

