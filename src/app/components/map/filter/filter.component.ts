import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { RoutesService } from '../../../services/routes.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter',
  imports: [CommonModule,HttpClientModule,FormsModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css'
})
export class FilterComponent {
  @Output() rutaSeleccionada = new EventEmitter<string|null>();
  deshabilitarRutas = false;
  deshabilitarOrigenDestino = false;

  origenSeleccionado: string | null = null;
  destinoSeleccionado: string | null = null;
  rutaSeleccionadaArchivo: string | null = null;
  description: string = '';
  
  lugaresInicio = ['Punto A', 'Punto B'];
  lugaresDestino = ['Punto X', 'Punto Y'];

  rutas: { nombre: string, archivo: string }[] = [];

  constructor(private mapService: MapService, private routesService: RoutesService) {}

  ngOnInit(): void {
    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      this.rutas = rutas;
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

  onSeleccionOrigenDestino() {
    if (this.origenSeleccionado || this.destinoSeleccionado) {
      this.deshabilitarRutas = true;
      // Aquí podrías emitir algún evento si planeas usar estos valores
    }
  }

  // Función para actualizar la descripción
  addDescription(description: string) {
    this.description = description; // Guardar la descripción recibida
  }
  

  limpiarFiltros() {
    this.origenSeleccionado = null;
    this.destinoSeleccionado = null;
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

