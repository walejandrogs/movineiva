import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { RoutesService } from '../../../services/routes.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NeighborhoodService } from '../../../services/neighborhood.service';
import * as turf from '@turf/turf';
import { NgSelectModule } from '@ng-select/ng-select';

type Position = [number, number];

interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}

interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}

interface Feature<T> {
  type: 'Feature';
  geometry: T;
  properties: any;
}

@Component({
  selector: 'app-filter',
  imports: [CommonModule,HttpClientModule,FormsModule,NgSelectModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css'
})
export class FilterComponent {
  @Output() rutaDesdeOrigenDestino = new EventEmitter<any>();
  @Output() barriosSeleccionados = new EventEmitter<any[]>();
  @Output() rutaSeleccionada = new EventEmitter<string|null>();
  @Output() rutaDetectada = new EventEmitter<any>();
  @Output() nombreRutaSeleccionada = new EventEmitter<string>();
  deshabilitarRutas = false;
  deshabilitarOrigenDestino = false;

  rutaSeleccionadaArchivo: string | null = null;
  description: string = '';
  comunas: number[] = [];
  barrios: any[] = [];
  barriosFiltradosInicio: { label: string; value: string }[] = [];
  barriosFiltradosDestino: { label: string; value: string }[] = [];
  comunaSeleccionadaInicio: number | null = null;
  barrioSeleccionadoInicio: { label: string, value: string } | null = null;
  comunaSeleccionadaDestino: number | null = null;
  barrioSeleccionadoDestino: { label: string, value: string } | null = null;
  rutaSeleccionadaDesdeFiltro: string | null = null;
  

  rutas: { nombre: string, archivo: string }[] = [];

  constructor(private mapService: MapService, private routesService: RoutesService, private neighborhoodService : NeighborhoodService) {}

  ngOnInit(): void {
    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      this.rutas = rutas;
    });

    this.neighborhoodService.cargarBarrios().subscribe(data => {
      this.barrios = data.features;
      const comunasSet = new Set(this.barrios.map(b => b.properties.NO__COMUNA));
      this.comunas = Array.from(comunasSet).sort((a, b) => a - b);
      
      this.onComunaSeleccionadaInicio();
      this.onComunaSeleccionadaDestino();
    });
  }

  onComunaSeleccionadaInicio(): void {
    if (!this.comunaSeleccionadaInicio) {
      this.barriosFiltradosInicio = this.barrios
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase(),
          value: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase()
        }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    } else {
      this.barriosFiltradosInicio = this.barrios
        .filter(b => b.properties.NO__COMUNA == this.comunaSeleccionadaInicio)
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido'),
          value: (b.properties.NOM_BARRIO ?? 'Barrio desconocido')
        }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    }
  }


  onComunaSeleccionadaDestino(): void {
    if (!this.comunaSeleccionadaDestino) {
      this.barriosFiltradosDestino = this.barrios
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase(),
          value: (b.properties.NOM_BARRIO ?? 'Barrio desconocido')
        }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    } else {
      this.barriosFiltradosDestino = this.barrios
        .filter(b => b.properties.NO__COMUNA == this.comunaSeleccionadaDestino)
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase(),
          value: (b.properties.NOM_BARRIO ?? 'Barrio desconocido')
        }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    }
  }


  onSeleccionOrigenDestino() {
    const barrioOrigen = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoInicio?.value);
    const barrioDestino = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoDestino?.value);
  
    console.log(barrioOrigen)
    console.log(barrioDestino)
    if (!barrioOrigen || !barrioDestino) {
      console.error('Uno de los barrios no se encuentra');
      return;
    }
  
    console.log('[FilterComponent] Barrio origen:', barrioOrigen.properties.NOM_BARRIO);
    console.log('[FilterComponent] Barrio destino:', barrioDestino.properties.NOM_BARRIO);
  
    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      rutas.forEach(r => {
        this.routesService.cargarRuta(r.archivo).subscribe(rutaGeoJSON => {
          const rutaLinea = turf.lineString(rutaGeoJSON.features[0].geometry.coordinates);
  
          const origenPoly = barrioOrigen.geometry.type === 'MultiPolygon'
            ? turf.multiPolygon(barrioOrigen.geometry.coordinates)
            : turf.polygon(barrioOrigen.geometry.coordinates);
  
          const destinoPoly = barrioDestino.geometry.type === 'MultiPolygon'
            ? turf.multiPolygon(barrioDestino.geometry.coordinates)
            : turf.polygon(barrioDestino.geometry.coordinates);
  
          const centroOrigen = turf.centerOfMass(origenPoly);
          const centroDestino = turf.centerOfMass(destinoPoly);
  
          const distanciaOrigen = turf.pointToLineDistance(centroOrigen, rutaLinea, { units: 'meters' });
          const distanciaDestino = turf.pointToLineDistance(centroDestino, rutaLinea, { units: 'meters' });
  
          const estaCercaOrigen = distanciaOrigen <= 1000;
          const estaCercaDestino = distanciaDestino <= 1000;
  
          // 👉 Validar también la orientación
          const indexInicio = this.puntoMasCercano(rutaLinea, centroOrigen);
          const indexDestino = this.puntoMasCercano(rutaLinea, centroDestino);
  
          console.log('Índice del inicio en la ruta:', indexInicio);
          console.log('Índice del destino en la ruta:', indexDestino);
  
          const orientacionCorrecta = indexInicio > indexDestino;
  
          if (estaCercaOrigen && estaCercaDestino && orientacionCorrecta) {
            console.log('[FilterComponent] Ruta cercana y con orientación válida');
            this.rutaSeleccionada.emit(r.archivo);
            this.barriosSeleccionados.emit([barrioOrigen, barrioDestino]);
            this.actualizarComboRuta(r.nombre);
          }
          else {
            console.log("No hay ruta")
          }
        });
      });
    });
  }
  
  private puntoMasCercano(linea: any, punto: any): number {
    let menorDist = Infinity;
    let indexMasCercano = -1;
    const coords = linea.geometry.coordinates;
  
    coords.forEach((coord: any, index: number) => {
      const puntoLinea = turf.point(coord);
      const dist = turf.distance(punto, puntoLinea, { units: 'meters' });
      if (dist < menorDist) {
        menorDist = dist;
        indexMasCercano = index;
      }
    });
  
    return indexMasCercano;
  }
  
  verificarSeleccion() {
    console.log('[FilterComponent] Verificando selección...');
    if (this.barrioSeleccionadoInicio && this.barrioSeleccionadoDestino) {
      console.log('[FilterComponent] Ambos barrios seleccionados');
      this.onSeleccionOrigenDestino();
    }
  }
  
  actualizarComboRuta(nombre: string) {
    this.rutaSeleccionadaArchivo = nombre;
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

  
  // Función para actualizar la descripción
  addDescription(description: string) {
    this.description = description; // Guardar la descripción recibida
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
    this.mapService.clearMapLayers();
  }




}

