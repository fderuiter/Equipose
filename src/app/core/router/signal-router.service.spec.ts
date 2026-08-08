import { TestBed } from '@angular/core/testing';
import { SignalRouter } from './signal-router.service';

describe('SignalRouter', () => {
  let service: SignalRouter;
  let originalHref: string;

  beforeEach(() => {
    originalHref = window.location.href;
    // Reset location before each test if needed
    window.history.replaceState(null, '', '/');

    TestBed.configureTestingModule({
      providers: [SignalRouter]
    });
    service = TestBed.inject(SignalRouter);
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalHref);
  });

  it('should initialize path and queryParams from window.location', () => {
    window.history.replaceState(null, '', '/dashboard?filter=active');
    
    // Create a new instance to test constructor logic
    const newService = TestBed.runInInjectionContext(() => new SignalRouter());
    
    expect(newService.path()).toBe('/dashboard');
    expect(newService.queryParams()).toEqual({ filter: 'active' });
  });

  it('should resolve standard paths correctly', () => {
    service.navigate('/settings');
    expect(service.path()).toBe('/settings');
    expect(service.queryParams()).toEqual({});
  });

  it('should resolve paths with query params', () => {
    service.navigate('/users', { sort: 'desc', page: '2' });
    expect(service.path()).toBe('/users');
    expect(service.queryParams()).toEqual({ sort: 'desc', page: '2' });
    expect(window.location.search).toBe('?sort=desc&page=2');
  });

  it('should handle encoded characters in query parameters natively', () => {
    service.navigate('/search', { q: 'hello world' });
    expect(service.queryParams()).toEqual({ q: 'hello world' });
    expect(window.location.search).toBe('?q=hello+world'); // URLSearchParams might use + or %20.
  });

  it('should handle hash fragments properly', () => {
    // If we navigate to a path with a hash
    service.navigate('/docs#section1');
    expect(service.path()).toBe('/docs');
    expect(window.location.hash).toBe('#section1');
  });

  it('should handle popstate event', () => {
    // Set an initial state
    service.navigate('/initial');
    expect(service.path()).toBe('/initial');
    
    // Simulate user clicking back button (which triggers popstate)
    window.history.pushState(null, '', '/changed?foo=bar');
    window.dispatchEvent(new Event('popstate'));

    expect(service.path()).toBe('/changed');
    expect(service.queryParams()).toEqual({ foo: 'bar' });
  });

  it('should trim trailing slashes from the path computed signal but keep / for root', () => {
    window.history.replaceState(null, '', '/about/');
    const newService = TestBed.runInInjectionContext(() => new SignalRouter());
    expect(newService.path()).toBe('/about');
    expect(window.location.pathname).toBe('/about');
  });

  it('should preserve single slash / for root path', () => {
    window.history.replaceState(null, '', '/');
    const newService = TestBed.runInInjectionContext(() => new SignalRouter());
    expect(newService.path()).toBe('/');
    expect(window.location.pathname).toBe('/');
  });

  it('should trim trailing slashes during programmatic navigation', () => {
    service.navigate('/generator/');
    expect(service.path()).toBe('/generator');
    expect(window.location.pathname).toBe('/generator');
  });

  it('should trim trailing slashes while keeping query parameters and hash fragments intact', () => {
    service.navigate('/verify/?mode=test#results');
    expect(service.path()).toBe('/verify');
    expect(service.queryParams()).toEqual({ mode: 'test' });
    expect(window.location.pathname).toBe('/verify');
    expect(window.location.search).toBe('?mode=test');
    expect(window.location.hash).toBe('#results');
  });
});
