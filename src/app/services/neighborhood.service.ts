import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NeighborhoodService {

  constructor(private http: HttpClient) {}

  cargarBarrios(): Observable<any> {
    return this.http.get<any>('assets/neighborhood/barriosNeiva.geojson');
  }
}
