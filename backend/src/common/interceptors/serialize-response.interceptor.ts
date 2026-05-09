import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response Interceptor global que preserva todas las propiedades de objetos serializados
 * Soluciona el problema de NestJS filtrando propiedades no mapeadas en entidades TypeORM
 */
@Injectable()
export class SerializeResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Si el servicio retornó POJOs (Plain Old JavaScript Objects), 
        // asegurar que todas las propiedades se serialicen correctamente
        // Esto resuelve el problema de propiedades adicionales como "conflictoHorario"
        // que se calculan dinámicamente pero no están en la entidad TypeORM
        
        if (Array.isArray(data)) {
          // Serializar array completo para preservar todas las propiedades
          return JSON.parse(JSON.stringify(data));
        }
        
        if (data && typeof data === 'object') {
          // Serializar objeto individual
          return JSON.parse(JSON.stringify(data));
        }
        
        // Valores primitivos se retornan tal como están
        return data;
      }),
    );
  }
}

