import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NotificationStore } from '../../../core/notifications/notification.store';
import { Notification } from '../../../core/notifications/notification.models';
import { NotificationCenter } from './notification-center';
describe('Notification Center presentation', () => {
  let records: ReturnType<typeof signal<readonly Notification[]>>;
  let mark: ReturnType<typeof vi.fn>;
  let all: ReturnType<typeof vi.fn>;
  let clear: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    records = signal([]);
    mark = vi.fn();
    all = vi.fn();
    clear = vi.fn();
    navigate = vi.fn();
    close = vi.fn();
    TestBed.configureTestingModule({
      imports: [NotificationCenter],
      providers: [
        {
          provide: NotificationStore,
          useValue: {
            notifications: records,
            unreadCount: computed(() => records().filter((item) => !item.readAt).length),
            hasUnread: computed(() => records().some((item) => !item.readAt)),
            markAsRead: mark,
            markAllAsRead: all,
            clearRead: clear,
            navigate,
            canNavigate: () => true,
            remove: vi.fn(),
            close,
          },
        },
      ],
    });
  });
  it('renders the existing empty state and disables bulk read actions', () => {
    const fixture = TestBed.createComponent(NotificationCenter);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain("You're all caught up");
    expect(element.querySelectorAll('.toolbar button:disabled')).toHaveLength(2);
  });
  it('shows type, priority, relative timestamp and explicit unread state and binds actions', () => {
    records.set([
      {
        id: 'test',
        type: 'threat',
        priority: 'critical',
        title: 'Critical threat detected',
        message: 'Fictional threat',
        createdAt: new Date().toISOString(),
        source: 'realtime',
        action: { kind: 'view-threat', entityId: 'THR-22001', label: 'View threat' },
      },
    ]);
    const fixture = TestBed.createComponent(NotificationCenter);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.metadata')?.textContent).toContain('Threat · Critical');
    expect(element.querySelector('.read-state')?.textContent).toBe('Unread');
    expect(element.querySelector('time')?.textContent).toBe('Just now');
    element.querySelector<HTMLButtonElement>('.item-actions button')?.click();
    expect(navigate).toHaveBeenCalledWith('test');
    element
      .querySelector<HTMLButtonElement>('[aria-label="Mark as read: Critical threat detected"]')
      ?.click();
    expect(mark).toHaveBeenCalledWith('test');
    element.querySelector<HTMLButtonElement>('.toolbar button')?.click();
    expect(all).toHaveBeenCalled();
    element.querySelector<HTMLButtonElement>('[aria-label="Close notifications"]')?.click();
    expect(close).toHaveBeenCalled();
  });
  it('does not expose mark-read for an already read notification and enables clear read', () => {
    records.set([
      {
        id: 'read',
        type: 'security',
        priority: 'low',
        title: 'Score update',
        message: 'Updated score',
        createdAt: new Date(Date.now() - 120000).toISOString(),
        readAt: new Date().toISOString(),
        source: 'realtime',
      },
    ]);
    const fixture = TestBed.createComponent(NotificationCenter);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.read-state')?.textContent).toBe('Read');
    expect(element.querySelector('time')?.textContent).toBe('2m ago');
    expect(element.querySelector('.item-actions button')).toBeNull();
    const buttons = element.querySelectorAll<HTMLButtonElement>('.toolbar button');
    expect(buttons[1].disabled).toBe(false);
    buttons[1].click();
    expect(clear).toHaveBeenCalled();
  });
});
