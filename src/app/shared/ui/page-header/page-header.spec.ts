import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeader } from './page-header';
@Component({
  imports: [PageHeader],
  template:
    '<app-page-header title="Security Overview"><button page-header-actions>Example action</button></app-page-header>',
})
class TestPage {}
describe('PageHeader composition', () => {
  it('keeps a single h1 and projects optional page actions', async () => {
    const fixture = TestBed.createComponent(TestPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toBe('Security Overview');
    expect(element.querySelector('.actions button')?.textContent).toBe('Example action');
    expect(element.querySelector('.page-icon')).toBeNull();
    expect(element.querySelector('p')).toBeNull();
  });
});
