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
    { nombre: 'Ruta 110 - Antigua ruta 60 - Ida', archivo: 'ruta110Ida.geojson' },
    { nombre: 'Ruta 110 - Antigua ruta 60 - Regreso', archivo: 'ruta110Regreso.geojson' },
    { nombre: 'Ruta 112 - Antigua ruta 18+13 - Ida', archivo: 'ruta112Ida.geojson' },
    { nombre: 'Ruta 112 - Antigua ruta 18+13 - Regreso', archivo: 'ruta112Regreso.geojson' },
    { nombre: 'Ruta 146 - Antigua ruta 90 - Ida', archivo: 'ruta146Ida.geojson' },
    { nombre: 'Ruta 146 - Antigua ruta 90 - Regreso', archivo: 'ruta146Regreso.geojson' },
    { nombre: 'Ruta 210 - Antigua ruta 29 - Ida', archivo: 'ruta210Ida.geojson' },
    { nombre: 'Ruta 210 - Antigua ruta 29 - Regreso', archivo: 'ruta210Regreso.geojson' },
    { nombre: 'Ruta 246 - Antigua ruta 22 - Ida', archivo: 'ruta246Ida.geojson' },
    { nombre: 'Ruta 246 - Antigua ruta 22 - Regreso', archivo: 'ruta246Regreso.geojson' },
    { nombre: 'Ruta 247 - Antigua ruta 61 - Ida', archivo: 'ruta247Ida.geojson' },
    { nombre: 'Ruta 247 - Antigua ruta 61 - Regreso', archivo: 'ruta247Regreso.geojson' },
    { nombre: 'Ruta 248 - Antigua ruta 33 - Ida', archivo: 'ruta248Ida.geojson' },
    { nombre: 'Ruta 248 - Antigua ruta 33 - Regreso', archivo: 'ruta248Regreso.geojson' },
    { nombre: 'Ruta 641 - Antigua ruta 73 - Ida', archivo: 'ruta641Ida.geojson' },
    { nombre: 'Ruta 641 - Antigua ruta 73 - Regreso', archivo: 'ruta641Regreso.geojson' },
    { nombre: 'Ruta 910 - Antigua ruta 11 - Ida', archivo: 'ruta910Ida.geojson' },
    { nombre: 'Ruta 910 - Antigua ruta 11 - Regreso', archivo: 'ruta910Regreso.geojson' },
    { nombre: 'Ruta 936 - Antigua ruta 19 - Ida', archivo: 'ruta936Ida.geojson' },
    { nombre: 'Ruta 936 - Antigua ruta 19 - Regreso', archivo: 'ruta936Regreso.geojson' },
    { nombre: 'Ruta 938 - Antigua ruta 7 - Ida', archivo: 'ruta938Ida.geojson' },
    { nombre: 'Ruta 938 - Antigua ruta 7 - Regreso', archivo: 'ruta938Regreso.geojson' },
    { nombre: 'Ruta 941 - Antigua ruta 9 - Ida', archivo: 'ruta941Ida.geojson' },
    { nombre: 'Ruta 941 - Antigua ruta 9 - Regreso', archivo: 'ruta941Regreso.geojson' },
    { nombre: 'Ruta 946 - Antigua ruta 49 - Ida', archivo: 'ruta946Ida.geojson' },
    { nombre: 'Ruta 946 - Antigua ruta 49 - Regreso', archivo: 'ruta946Regreso.geojson' },
    { nombre: 'Ruta 947 - Antigua ruta 61 - Ida', archivo: 'ruta947Ida.geojson' },
    { nombre: 'Ruta 947 - Antigua ruta 61 - Regreso', archivo: 'ruta947Regreso.geojson' },
    { nombre: 'Ruta 949 - Antigua ruta 62 - Ida', archivo: 'ruta949Ida.geojson' },
    { nombre: 'Ruta 949 - Antigua ruta 62 - Regreso', archivo: 'ruta949Regreso.geojson' },
    { nombre: 'Ruta 999 - Antigua ruta 63 - Ida', archivo: 'ruta999Ida.geojson' },
    { nombre: 'Ruta 999 - Antigua ruta 63 - Regreso', archivo: 'ruta999Regreso.geojson' },
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