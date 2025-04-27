import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoutesService {

  constructor(private http: HttpClient) {}

  private rutas = [
    { nombre: 'Ruta 106 - Antigua ruta 20 - Ida', archivo: 'ruta106Ida.geojson' },
    { nombre: 'Ruta 106 - Antigua ruta 20 - Regreso', archivo: 'ruta106Regreso.geojson' },
    { nombre: 'Ruta 936 - Antigua ruta 19 - Ida', archivo: 'ruta936Ida.geojson' },
    { nombre: 'Ruta 936 - Antigua ruta 19 - Regreso', archivo: 'ruta936Regreso.geojson' },
    // etc.
  ];
  
  cargarParaderosGeoJSON(): Observable<any> {
    return this.http.get<any>('assets/routes/paraderos.geojson'); // Asegúrate de que la ruta sea correcta
  }

  // Devuelve solo la lista de rutas disponibles con nombre y archivo
  cargarTodasLasRutas(): Observable<{ nombre: string, archivo: string }[]> {
    return of(this.rutas); // devuelve la lista directamente
  }

  // Carga un archivo específico
  cargarRuta(nombre: string): Observable<any> {
    return this.http.get(`assets/routes/${nombre}`).pipe(
      map((data: any) => {
        // Verifica que los datos sean un GeoJSON válido
        if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          return data;
        } else {
          throw new Error('El objeto no es un GeoJSON válido');
        }
      })
    );
  }
}