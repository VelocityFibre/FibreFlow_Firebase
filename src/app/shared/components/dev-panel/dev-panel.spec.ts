import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevPanel } from './dev-panel';

describe('DevPanel', () => {
  let component: DevPanel;
  let fixture: ComponentFixture<DevPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(DevPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
