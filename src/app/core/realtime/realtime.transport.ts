import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ConnectionState } from './realtime.models';
export interface RealtimeTransport {
  // Streams survive disconnect/reconnect. Transport failures go through connectionState$.
  // A future WebSocket adapter owns decoding, handshake authentication and socket disposal.
  readonly events$: Observable<unknown>;
  readonly connectionState$: Observable<ConnectionState>;
  connect(): void;
  disconnect(): void;
}
export const REALTIME_TRANSPORT = new InjectionToken<RealtimeTransport>('RealtimeTransport');
