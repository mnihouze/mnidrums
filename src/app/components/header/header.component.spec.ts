import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SITE_NAME } from '../../site-config';

@Component({ standalone: true, template: '' })
class DummyPageComponent {}

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideRouter([{ path: '**', component: DummyPageComponent }])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows the site name', () => {
    expect(el.querySelector('.brand-text')?.textContent).toContain(SITE_NAME);
  });

  it('renders a link for every nav item', () => {
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.nav-link'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      fixture.componentInstance.navItems.map((i) => i.path),
    );
  });

  it('toggles the menu when the menu button is clicked', () => {
    const button = el.querySelector<HTMLButtonElement>('.menu-toggle')!;
    const nav = el.querySelector('.main-nav')!;

    button.click();
    fixture.detectChanges();
    expect(nav.classList).toContain('open');

    button.click();
    fixture.detectChanges();
    expect(nav.classList).not.toContain('open');
  });

  it('closes the menu when a nav link is clicked', () => {
    fixture.componentInstance.menuOpen = true;
    fixture.detectChanges();

    el.querySelector<HTMLAnchorElement>('a.nav-link')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.menuOpen).toBe(false);
  });
});
