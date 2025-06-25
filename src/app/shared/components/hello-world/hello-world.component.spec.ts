import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HelloWorldComponent } from './hello-world.component';

describe('HelloWorldComponent', () => {
  let component: HelloWorldComponent;
  let fixture: ComponentFixture<HelloWorldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelloWorldComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HelloWorldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the correct message', () => {
    expect(component.message).toBe('Hello from Claude Code!');
  });

  it('should display the correct description', () => {
    expect(component.description).toContain('test component');
    expect(component.description).toContain('Claude Code GitHub Actions');
  });

  it('should log message when test button is clicked', () => {
    spyOn(console, 'log');
    component.onTestClick();
    expect(console.log).toHaveBeenCalledWith('Hello World component test button clicked!');
  });

  it('should render the greeting message in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card-title')?.textContent).toContain('Hello from Claude Code!');
  });

  it('should render all status items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statusItems = compiled.querySelectorAll('.status-item');
    expect(statusItems.length).toBe(4);
    
    expect(statusItems[0]?.textContent).toContain('Angular v20 Standalone Component');
    expect(statusItems[1]?.textContent).toContain('FibreFlow Theme Variables');
    expect(statusItems[2]?.textContent).toContain('Material Design Components');
    expect(statusItems[3]?.textContent).toContain('Claude Code GitHub Actions');
  });

  it('should have a test button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.textContent?.trim()).toContain('Test Component');
  });
});