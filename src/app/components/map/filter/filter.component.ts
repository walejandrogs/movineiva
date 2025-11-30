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
  @Output() rutaSeleccionada = new EventEmitter<string | string[]|null>();
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
  coordsInicio: any | null = null;
  coordsFinal: any | null = null;
  puntoOrigen: any;
  puntoDestino: any;
  
  

  rutas: { nombre: string[]|string, archivo: string }[] = [];

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

  onBarrioSeleccionadoInicio(): void {
    if (this.barrioSeleccionadoInicio) {
      const barrioEncontrado = this.barrios.find(
        b => b.properties.NOM_BARRIO === this.barrioSeleccionadoInicio?.value
      );
      if (barrioEncontrado) {
        this.comunaSeleccionadaInicio = barrioEncontrado.properties.NO__COMUNA;
      }
    }
    this.verificarSeleccion("poligon");
  }

  onBarrioSeleccionadoDestino(): void {
    if (this.barrioSeleccionadoDestino) {
      const barrioEncontrado = this.barrios.find(
        b => b.properties.NOM_BARRIO === this.barrioSeleccionadoDestino?.value
      );
      if (barrioEncontrado) {
        this.comunaSeleccionadaDestino = barrioEncontrado.properties.NO__COMUNA;
      }
    }
    this.verificarSeleccion("poligon");
  }

  onComunaSeleccionadaInicio(): void {
    if (!this.comunaSeleccionadaInicio) {
      this.barriosFiltradosInicio = this.barrios
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase(),
          value: (b.properties.NOM_BARRIO ?? 'Barrio desconocido')
        }))
        .sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    } else {
      this.barriosFiltradosInicio = this.barrios
        .filter(b => b.properties.NO__COMUNA == this.comunaSeleccionadaInicio)
        .map(b => ({
          label: (b.properties.NOM_BARRIO ?? 'Barrio desconocido').toUpperCase(),
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


  private toPoint(coord: any) {
    // Si ya es Feature<Point>, lo retorna
    if (coord?.geometry?.type === "Point") {
      return coord;
    }

    // Si es array [lng, lat] o [lat, lng]
    if (Array.isArray(coord) && coord.length === 2) {
      const [a, b] = coord;

      let lng, lat;

      lng = b;
      lat = a;
      
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        properties: {}
      };
    }

    console.error("Coordenada inválida para point:", coord);
    return null;
  }


  onSeleccionOrigenDestino(type: "point" | "poligon") {
    let barrioOrigen;
    let barrioDestino;
    let estaCercaOrigen: any;
    let estaCercaDestino: any;
    let orientacionCorrecta: any;
    const rutasCercanasOrigen: { ruta: any, geojson: any }[] = [];
    const rutasCercanasDestino: { ruta: any, geojson: any }[] = [];
    let rutaDirectaEncontrada = false; // bandera para saber si ya encontramos ruta directa
    
    if(type == "point"){
      barrioOrigen = this.toPoint(this.coordsInicio);
      barrioDestino = this.toPoint(this.coordsFinal);
      console.error('datos' + barrioOrigen + barrioDestino);
      console.error('CONVERSION' + barrioOrigen + barrioDestino);

    } else if(type == "poligon"){
      barrioOrigen = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoInicio?.value);
      barrioDestino = this.barrios.find(b => b.properties.NOM_BARRIO === this.barrioSeleccionadoDestino?.value);
    }

    if (!barrioOrigen || !barrioDestino) {
      console.error('Uno de los puntos no se encuentra' + barrioOrigen + barrioDestino);
      return;
    }

    this.mapService.clearMapLayers();

    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      let rutasCargadas = 0;

      rutas.forEach(r => {
        this.routesService.cargarRuta(r.archivo).subscribe(rutaGeoJSON => {
          rutasCargadas++;

          const rutaLinea = turf.lineString(rutaGeoJSON.features[0].geometry.coordinates);

          if(type == "poligon"){
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

            estaCercaOrigen = distanciaOrigen <= 400;
            estaCercaDestino = distanciaDestino <= 400;
            const indexInicio = this.puntoMasCercano(rutaLinea, centroOrigen);
            const indexDestino = this.puntoMasCercano(rutaLinea, centroDestino);

            orientacionCorrecta = indexInicio > indexDestino;
          } else if(type == "point"){
            
            const distanciaOrigen = turf.pointToLineDistance(barrioOrigen, rutaLinea, { units: 'meters' });
            const distanciaDestino = turf.pointToLineDistance(barrioDestino, rutaLinea, { units: 'meters' });


            estaCercaOrigen = distanciaOrigen <= 400;
            estaCercaDestino = distanciaDestino <= 400;
            const indexInicio = this.puntoMasCercano(rutaLinea, barrioOrigen);
            const indexDestino = this.puntoMasCercano(rutaLinea, barrioDestino);

            orientacionCorrecta = indexInicio > indexDestino;

            console.log("REVISAAAAAAAr"+estaCercaOrigen + distanciaOrigen + estaCercaDestino +distanciaDestino+ orientacionCorrecta)
          }

          if (estaCercaOrigen && estaCercaDestino && orientacionCorrecta && !rutaDirectaEncontrada) {
            console.log('[FilterComponent] Ruta directa encontrada');
            this.rutaSeleccionada.emit([r.archivo]);
            this.barriosSeleccionados.emit([barrioOrigen, barrioDestino]);
            this.actualizarComboRuta(r.archivo);
            rutaDirectaEncontrada = true;
            return;
          }

          // Guardar rutas cercanas para combinación si no hay ruta directa todavía
          if (!rutaDirectaEncontrada) {
            if (estaCercaOrigen && !estaCercaDestino) {
              rutasCercanasOrigen.push({ ruta: r, geojson: rutaGeoJSON });
            }
            if (estaCercaDestino && !estaCercaOrigen) {
              rutasCercanasDestino.push({ ruta: r, geojson: rutaGeoJSON });

            }
          }

          // ⚡ Ahora que ya cargamos todas las rutas, si no hay ruta directa, buscar combinaciones
          if (rutasCargadas === rutas.length && !rutaDirectaEncontrada) {
            console.log("No se encontró ruta directa. Buscando combinaciones...");
            this.buscarCombinaciones(rutasCercanasOrigen, rutasCercanasDestino, barrioOrigen, barrioDestino);
          }

        });
      });
    });
  }
  
  
  /*
  onSeleccionOrigenDestino(type: "poligon" | "point") {
    const coordsInicio = this.coordsInicio; // [lat, lng]
    const coordsFinal = this.coordsFinal;

    // --- Obtención del origen/destino según tipo ---
    let puntoOrigen: any;
    let puntoDestino: any;

    if (type === "point") {
      if (!coordsInicio || !coordsFinal) {
        console.error("Faltan coordenadas de inicio o fin");
        return;
      }

      puntoOrigen = turf.point([coordsInicio[1], coordsInicio[0]]); // [lng, lat]
      puntoDestino = turf.point([coordsFinal[1], coordsFinal[0]]);

    } else {
      const barrioOrigen = this.barrios.find(b =>
        b.properties.NOM_BARRIO === this.barrioSeleccionadoInicio?.value
      );

      const barrioDestino = this.barrios.find(b =>
        b.properties.NOM_BARRIO === this.barrioSeleccionadoDestino?.value
      );

      if (!barrioOrigen || !barrioDestino) {
        console.error('Uno de los barrios no se encuentra');
        return;
      }

      const origenPoly = barrioOrigen.geometry.type === 'MultiPolygon'
        ? turf.multiPolygon(barrioOrigen.geometry.coordinates)
        : turf.polygon(barrioOrigen.geometry.coordinates);

      const destinoPoly = barrioDestino.geometry.type === 'MultiPolygon'
        ? turf.multiPolygon(barrioDestino.geometry.coordinates)
        : turf.polygon(barrioDestino.geometry.coordinates);

      puntoOrigen = turf.centerOfMass(origenPoly);
      puntoDestino = turf.centerOfMass(destinoPoly);
    }

    // --------------------
    //  LÓGICA GENERAL (igual para polígono o punto)
    // --------------------

    const rutasCercanasOrigen: { ruta: any, geojson: any }[] = [];
    const rutasCercanasDestino: { ruta: any, geojson: any }[] = [];
    let rutaDirectaEncontrada = false;

    this.mapService.clearMapLayers();

    this.routesService.cargarTodasLasRutas().subscribe(rutas => {
      let rutasCargadas = 0;

      rutas.forEach(r => {
        this.routesService.cargarRuta(r.archivo).subscribe(rutaGeoJSON => {
          rutasCargadas++;

          const rutaLinea = turf.lineString(rutaGeoJSON.features[0].geometry.coordinates);

          // Distancias independientemente del tipo
          const distanciaOrigen = turf.pointToLineDistance(puntoOrigen, rutaLinea, { units: 'meters' });
          const distanciaDestino = turf.pointToLineDistance(puntoDestino, rutaLinea, { units: 'meters' });

          const estaCercaOrigen = distanciaOrigen <= 400;
          const estaCercaDestino = distanciaDestino <= 400;

          // Índices sobre la línea
          const indexInicio = this.puntoMasCercano(rutaLinea, puntoOrigen);
          const indexDestino = this.puntoMasCercano(rutaLinea, puntoDestino);

          const orientacionCorrecta = indexInicio > indexDestino;

          // -----------------------
          // RUTA DIRECTA
          // -----------------------
          if (estaCercaOrigen && estaCercaDestino && orientacionCorrecta && !rutaDirectaEncontrada) {
            this.rutaSeleccionada.emit([r.archivo]);
            rutaDirectaEncontrada = true;
            return;
          }

          // -----------------------
          // RUTAS PARA COMBINACIÓN
          // -----------------------
          if (!rutaDirectaEncontrada) {
            if (estaCercaOrigen && !estaCercaDestino) {
              rutasCercanasOrigen.push({ ruta: r, geojson: rutaGeoJSON });
            }
            if (estaCercaDestino && !estaCercaOrigen) {
              rutasCercanasDestino.push({ ruta: r, geojson: rutaGeoJSON });
            }
          }

          // -----------------------
          // COMBINACIONES
          // -----------------------
          if (rutasCargadas === rutas.length && !rutaDirectaEncontrada) {
            this.buscarCombinaciones(
              rutasCercanasOrigen,
              rutasCercanasDestino,
              puntoOrigen,
              puntoDestino
            );
          }

        });
      });
    });
  }
*/
  private buscarCombinaciones(
    rutasCercanasOrigen: { ruta: any, geojson: any }[],
    rutasCercanasDestino: { ruta: any, geojson: any }[],
    barrioOrigen: any,
    barrioDestino: any
  ) {
    let encontroCombinacion = false;
    for (let a = 0; a < rutasCercanasOrigen.length; a++) {
      const rutaOrigen = rutasCercanasOrigen[a];
      const lineaOrigen = turf.lineString(rutaOrigen.geojson.features[0].geometry.coordinates);
      const puntosOrigen = rutaOrigen.geojson.features[0].geometry.coordinates;
  
      for (let b = 0; b < rutasCercanasDestino.length; b++) {
        const rutaDestino = rutasCercanasDestino[b];
        const lineaDestino = turf.lineString(rutaDestino.geojson.features[0].geometry.coordinates);
        const puntosDestino = rutaDestino.geojson.features[0].geometry.coordinates;
  
        for (let i = 0; i < puntosOrigen.length; i++) {
          const puntoO = turf.point(puntosOrigen[i]);
  
          for (let j = 0; j < puntosDestino.length; j++) {
            const puntoD = turf.point(puntosDestino[j]);
            const distancia = turf.distance(puntoO, puntoD, { units: 'meters' });
  
            if (distancia <= 500) {
              const indexOrigenInicio = this.puntoMasCercano(lineaOrigen, turf.centerOfMass(barrioOrigen));
              const indexOrigenTransbordo = i;
              const indexDestinoTransbordo = j;
              const indexDestinoFinal = this.puntoMasCercano(lineaDestino, turf.centerOfMass(barrioDestino));
  
              const orientacionValida = (indexOrigenInicio > indexOrigenTransbordo) && (indexDestinoTransbordo > indexDestinoFinal);
  
              if (orientacionValida) {
                console.log('Orientación válida en combinación de rutas');
                this.rutaSeleccionada.emit([rutaOrigen.ruta.archivo, rutaDestino.ruta.archivo]);
                this.barriosSeleccionados.emit([barrioOrigen, barrioDestino]);
                this.actualizarComboRuta(`${rutaOrigen.ruta.nombre} + ${rutaDestino.ruta.nombre}`);
                return; // Salimos de toda la función al encontrar una combinación válida
              }
            }
          }
        }
      }
    }
    if (!encontroCombinacion) {
      alert('No se encontró una ruta directa ni combinada para ir desde el punto de origen hasta el destino seleccionado. Intenta cambiar los puntos de partida o llegada.');
    }
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
  
  verificarSeleccion(type: "point" | "poligon") {
    console.log('[FilterComponent] Verificando selección...');
    if (this.barrioSeleccionadoInicio && this.barrioSeleccionadoDestino) {
      console.log('[FilterComponent] Ambos barrios seleccionados');
      this.onSeleccionOrigenDestino(type);
    }
  }
  
  actualizarComboRuta(archivo: string) {
    this.rutaSeleccionadaArchivo = archivo;
  }

  onSeleccionRuta(ruta: { nombre: string; archivo: string }) {
    this.comunaSeleccionadaInicio = null;
    this.barrioSeleccionadoInicio  = null;
    this.comunaSeleccionadaDestino = null;
    this.barrioSeleccionadoDestino  = null;
    this.mapService.clearMapLayers();
  
    if (ruta && ruta.archivo) {
      this.deshabilitarOrigenDestino = true;
      this.rutaSeleccionada.emit([ruta.archivo]); // emitimos el nombre del archivo
    } else {
      console.error('Ruta no válida');
    }
  }

  useMyLocation(): void {
    this.mapService.getUserLocation((coords) => {
      console.log('Ubicación desde filtro:', coords);
      this.procesarSeleccion(coords,"start");
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

  activarSeleccionInicio() {
    this.mapService.enablePointSelection("start").then(coords => {
      console.log("Inicio seleccionado:", coords);
      this.procesarSeleccion(coords,"start");
    });
  }

  activarSeleccionFinal() {
    this.mapService.enablePointSelection("end").then(coords => {
      console.log("Fin seleccionado:", coords);
      this.procesarSeleccion(coords,"end");
    });
  }

  
  limpiarFiltros() {
    this.comunaSeleccionadaInicio = null;
    this.barrioSeleccionadoInicio  = null;
    this.onComunaSeleccionadaInicio()
    this.comunaSeleccionadaDestino = null;
    this.barrioSeleccionadoDestino  = null;
    this.onComunaSeleccionadaDestino()
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
  
  private procesarSeleccion(coords: [number, number], type : "start" | "end") {
    if (!coords) {
      console.error('No se pudo obtener coordenadas.');
      return;
    }

    const puntoUsuario = turf.point([coords[1], coords[0]]); // [lng, lat]

    let barrioMasCercano = null;
    let menorDistancia = Infinity;

    for (const barrio of this.barrios) {
      const geom = barrio.geometry;
      const poly = geom.type === 'MultiPolygon'
        ? turf.multiPolygon(geom.coordinates)
        : turf.polygon(geom.coordinates);

      const distancia = turf.pointToPolygonDistance(puntoUsuario, poly, { units: 'meters' });

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        barrioMasCercano = barrio;
      }
    }

    if (type == "start"){
      this.coordsInicio=coords;
      if (barrioMasCercano) {
        console.log('Barrio más cercano encontrado:', barrioMasCercano.properties.NOM_BARRIO);

        this.barrioSeleccionadoInicio = {
          label: barrioMasCercano.properties.NOM_BARRIO,
          value: barrioMasCercano.properties.NOM_BARRIO
        };

        this.comunaSeleccionadaInicio = barrioMasCercano.properties.NO__COMUNA;

        this.verificarSeleccion("point");

      } else {
        console.error('No se encontró barrio cercano.');
      }
    }else if(type == "end"){
      this.coordsFinal=coords;
      if (barrioMasCercano) {
        console.log('Barrio más cercano encontrado:', barrioMasCercano.properties.NOM_BARRIO);

        this.barrioSeleccionadoDestino = {
          label: barrioMasCercano.properties.NOM_BARRIO,
          value: barrioMasCercano.properties.NOM_BARRIO
        };

        this.comunaSeleccionadaDestino = barrioMasCercano.properties.NO__COMUNA;

        this.verificarSeleccion("point");
      } else {
        console.error('No se encontró barrio cercano.');
      }
    }
  }
}


