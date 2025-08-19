import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StagingSyncUi } from './staging-sync-ui';

describe('StagingSyncUi', () => {
  let component: StagingSyncUi;
  let fixture: ComponentFixture<StagingSyncUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StagingSyncUi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StagingSyncUi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
