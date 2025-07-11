import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestAuthComponent } from './test-auth.component';

describe('TestAuthComponent', () => {
  let component: TestAuthComponent;
  let fixture: ComponentFixture<TestAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAuthComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
