import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { Device, DeviceAction, DeviceId } from '../models/device.models';
import { allowedDeviceActions, canDeviceAct, devicePosture } from '../utils/device-rules';
import { DEVICE_REPOSITORY } from './device.repository';
@Injectable()
export class DeviceDetailStore {
  private readonly repository = inject(DEVICE_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly record = signal<Device | null>(null);
  private readonly pending = signal(false);
  private readonly updating = signal(false);
  private readonly failure = signal<string | null>(null);
  private readonly actionFailure = signal<string | null>(null);
  private readonly missing = signal(false);
  private readonly assessedAt = signal(new Date());
  private request?: Subscription;
  private mutation?: Subscription;
  private version = 0;
  private id: DeviceId = '';
  readonly data = this.record.asReadonly();
  readonly isLoading = this.pending.asReadonly();
  readonly isUpdating = this.updating.asReadonly();
  readonly error = this.failure.asReadonly();
  readonly actionError = this.actionFailure.asReadonly();
  readonly notFound = this.missing.asReadonly();
  readonly canManage = computed(() => this.auth.hasPermission(PERMISSIONS.DEVICES_MANAGE));
  readonly actions = computed(() =>
    this.canManage() && this.data() ? allowedDeviceActions(this.data()!.status) : [],
  );
  readonly posture = computed(() =>
    this.data() ? devicePosture(this.data()!, this.assessedAt()) : null,
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.version++;
      this.request?.unsubscribe();
      this.mutation?.unsubscribe();
    });
  }
  load(id: DeviceId): void {
    this.id = id;
    const version = ++this.version;
    this.request?.unsubscribe();
    this.mutation?.unsubscribe();
    this.record.set(null);
    this.pending.set(true);
    this.updating.set(false);
    this.failure.set(null);
    this.actionFailure.set(null);
    this.missing.set(false);
    this.request = this.repository.getById(id).subscribe({
      next: (device) => {
        if (version !== this.version) return;
        this.record.set(device);
        this.assessedAt.set(new Date());
        this.missing.set(device === null);
        this.pending.set(false);
      },
      error: () => {
        if (version !== this.version) return;
        this.failure.set('Unable to load device details.');
        this.pending.set(false);
      },
    });
  }
  retry(): void {
    this.load(this.id);
  }
  perform(action: DeviceAction, onSuccess: () => void = () => undefined): void {
    if (this.isUpdating()) return;
    this.actionFailure.set(null);
    if (!this.auth.hasPermission(PERMISSIONS.DEVICES_MANAGE)) {
      this.actionFailure.set('You do not have permission to manage devices.');
      return;
    }
    const device = this.data();
    if (!device || !canDeviceAct(device.status, action)) {
      this.actionFailure.set('This action is not available for the current device status.');
      return;
    }
    this.updating.set(true);
    const version = this.version;
    const operation =
      action === 'scan'
        ? this.repository.runMockScan(device.id)
        : this.repository.updateProtectionStatus(
            device.id,
            action === 'isolate' ? 'isolated' : 'online',
          );
    this.mutation = operation.subscribe({
      next: (updated) => {
        if (version !== this.version) return;
        this.record.set(updated);
        this.assessedAt.set(new Date());
        this.updating.set(false);
        onSuccess();
      },
      error: () => {
        if (version !== this.version) return;
        this.actionFailure.set(
          'Unable to update this device. Check your permissions and try again.',
        );
        this.updating.set(false);
      },
    });
  }
}
