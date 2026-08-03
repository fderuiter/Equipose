import { test as base, expect, Page } from '@playwright/test';

// Extend base test to add zero-trust security audit capability
export const test = base.extend<{ zeroTrustAudit: void }>({
  zeroTrustAudit: [
    async ({ page, context }, use) => {
      // List of tracking errors or violations encountered during the test run
      const violations: string[] = [];

      // Helper function to inject guardrails into a page
      const injectGuardrails = async (targetPage: Page) => {
        await targetPage.addInitScript(() => {
          // Intercept WebSockets inside the page
          const OriginalWebSocket = window.WebSocket;
          window.WebSocket = new Proxy(OriginalWebSocket, {
            construct(target, args) {
              const urlStr = args[0];
              let url: URL;
              try {
                url = new URL(urlStr);
              } catch (e) {
                try {
                  url = new URL(urlStr, window.location.href);
                } catch {
                  // Fallback for completely invalid/malformed URLs
                  const errMsg = `Invalid/Forbidden WebSocket attempt blocked: ${urlStr}`;
                  (window as any).__security_violation__ = errMsg;
                  throw new Error(errMsg);
                }
              }
              const isAllowed = 
                url.hostname === 'localhost' || 
                url.hostname === '127.0.0.1';

              if (!isAllowed) {
                const errMsg = `Unauthorized WebSocket connection attempt to ${urlStr} was blocked.`;
                (window as any).__security_violation__ = errMsg;
                throw new Error(errMsg);
              }
              return Reflect.construct(target, args);
            }
          });

          // Intercept Web Worker creation (safe wrapping without changing URL to blob, avoiding CSP violation)
          const OriginalWorker = window.Worker;
          window.Worker = new Proxy(OriginalWorker, {
            construct(target, args) {
              const worker = Reflect.construct(target, args);

              // Listen for __security_violation__ posted from the worker
              const originalAddEventListener = worker.addEventListener;
              worker.addEventListener = function(type, listener, options) {
                if (type === 'message') {
                  const wrappedListener = function(event) {
                    if (event.data && event.data.__security_violation__) {
                      window.__security_violation__ = event.data.__security_violation__;
                    }
                    listener.call(this, event);
                  };
                  return originalAddEventListener.call(this, type, wrappedListener, options);
                }
                return originalAddEventListener.apply(this, arguments);
              };

              let userOnMessage = null;
              Object.defineProperty(worker, 'onmessage', {
                get() {
                  return userOnMessage;
                },
                set(val) {
                  userOnMessage = val;
                  worker.onmessage_wrapped = function(event) {
                    if (event.data && event.data.__security_violation__) {
                      window.__security_violation__ = event.data.__security_violation__;
                    }
                    if (userOnMessage) {
                      userOnMessage.call(this, event);
                    }
                  };
                  worker.addEventListener('message', worker.onmessage_wrapped);
                }
              });

              return worker;
            }
          });
        }).catch(() => {});
      };

      // 1. Intercept network requests (includes those from Web Workers in supported browsers)
      await context.route('**/*', async (route) => {
        const urlStr = route.request().url();

        // A. Fulfill dummy worker for tests
        if (urlStr.includes('/assets/dummy-worker.js')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: `
              fetch('https://unauthorized-external-tracker.com/ping');
            `
          });
          return;
        }

        // B. Intercept and instrument Web Workers with zero-trust guardrails
        if (route.request().resourceType() === 'worker') {
          try {
            const response = await route.fetch();
            const originalText = await response.text();
            
            const guardrails = `
              // Overwrite global fetch inside Worker
              const originalFetch = self.fetch;
              self.fetch = function(input, init) {
                let urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
                let url;
                try {
                  url = new URL(urlStr, self.location.href);
                } catch(e) {
                  url = new URL(urlStr);
                }
                const isAllowed = 
                  url.hostname === 'localhost' || 
                  url.hostname === '127.0.0.1' || 
                  url.protocol === 'data:' || 
                  url.protocol === 'blob:';
                if (!isAllowed) {
                  const errMsg = 'Unauthorized fetch inside Web Worker was blocked: ' + urlStr;
                  self.postMessage({ __security_violation__: errMsg });
                  throw new Error(errMsg);
                }
                return originalFetch.apply(this, arguments);
              };

              // Overwrite global WebSocket inside Worker
              if (self.WebSocket) {
                const OriginalWS = self.WebSocket;
                self.WebSocket = new Proxy(OriginalWS, {
                  construct(target, args) {
                    const urlStr = args[0];
                    let url;
                    try {
                      url = new URL(urlStr);
                    } catch(e) {
                      url = new URL(urlStr, self.location.href);
                    }
                    const isAllowed = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
                    if (!isAllowed) {
                      const errMsg = 'Unauthorized WebSocket inside Web Worker was blocked: ' + urlStr;
                      self.postMessage({ __security_violation__: errMsg });
                      throw new Error(errMsg);
                    }
                    return Reflect.construct(target, args);
                  }
                });
              }

              // Overwrite global XMLHttpRequest inside Worker
              if (self.XMLHttpRequest) {
                const OriginalXHR = self.XMLHttpRequest;
                self.XMLHttpRequest = function() {
                  const xhr = new OriginalXHR();
                  const originalOpen = xhr.open;
                  xhr.open = function(method, urlStr) {
                    let url;
                    try {
                      url = new URL(urlStr, self.location.href);
                    } catch(e) {
                      url = new URL(urlStr);
                    }
                    const isAllowed = 
                      url.hostname === 'localhost' || 
                      url.hostname === '127.0.0.1' || 
                      url.protocol === 'data:' || 
                      url.protocol === 'blob:';
                    if (!isAllowed) {
                      const errMsg = 'Unauthorized XMLHttpRequest inside Web Worker was blocked: ' + urlStr;
                      self.postMessage({ __security_violation__: errMsg });
                      throw new Error(errMsg);
                    }
                    return originalOpen.apply(this, arguments);
                  };
                  return xhr;
                };
              }
            `;

            const modifiedText = guardrails + '\n' + originalText;
            await route.fulfill({
              response,
              contentType: 'application/javascript',
              body: modifiedText,
            });
            return;
          } catch (err) {
            console.error('Failed to instrument Web Worker:', err);
          }
        }
        
        // C. General permitted hostnames filter
        const isAllowed = 
          urlStr.startsWith('data:') || 
          urlStr.startsWith('blob:') || 
          urlStr.startsWith('http://127.0.0.1') || 
          urlStr.startsWith('http://localhost') || 
          urlStr.startsWith('https://127.0.0.1') || 
          urlStr.startsWith('https://localhost');

        if (isAllowed) {
          await route.continue();
        } else {
          const errMsg = `Forbidden external request blocked: ${urlStr}`;
          violations.push(errMsg);
          console.error(errMsg);
          await route.abort('failed');
        }
      });

      // 2. Setup WebSocket handshakes listening
      const listenWebSocket = (ws) => {
        const wsUrl = ws.url();
        try {
          const url = new URL(wsUrl);
          const isAllowed = 
            url.hostname === 'localhost' || 
            url.hostname === '127.0.0.1';

          if (!isAllowed) {
            const errMsg = `Forbidden WebSocket attempt blocked: ${wsUrl}`;
            violations.push(errMsg);
            console.error(errMsg);
            ws.close();
          }
        } catch {
          const errMsg = `Forbidden WebSocket attempt blocked (malformed URL): ${wsUrl}`;
          violations.push(errMsg);
          console.error(errMsg);
          ws.close();
        }
      };

      page.on('websocket', listenWebSocket);
      context.on('page', (newPage) => {
        newPage.on('websocket', listenWebSocket);
        injectGuardrails(newPage).catch(() => {});
      });

      // 3. Inject Client-Side Guardrails on initial page
      await injectGuardrails(page);

      // Proceed with the test execution
      await use();

      // 4. Assert no security violations occurred during the test run
      // Check both our collected list of violations and any violations thrown/logged in client window context
      const clientViolation = await page.evaluate(() => (window as any).__security_violation__).catch(() => null);
      if (clientViolation) {
        violations.push(clientViolation);
      }

      const isViolationExpected = test.info().title.includes('[expect-violation]');
      if (!isViolationExpected) {
        expect(violations, `Zero-Trust Audit failed with ${violations.length} violations:\n${violations.join('\n')}`).toHaveLength(0);
      } else {
        expect(violations.length, `Expected violations, but none occurred.`).toBeGreaterThan(0);
      }
    },
    { auto: true } // Auto-runs for every test that imports 'test' from this fixture
  ]
});

export { expect };
