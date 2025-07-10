import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Onemap } from './onemap';

describe('Onemap', () => {
  let component: Onemap;
  let fixture: ComponentFixture<Onemap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Onemap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Onemap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
