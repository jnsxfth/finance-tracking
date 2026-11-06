// Playwright-Ersatz auf jsdom. Grund: Playwright gibt es weder auf dem Rechner noch in
// der Shell daneben, und die echte finanzdaten.json darf den Ordner nicht verlassen.
// Deckt genau die Playwright-Aufrufe ab, die diese Tests benutzen.
// Aufruf:  NODE_PATH=<ordner mit jsdom> node -r tests/pw-jsdom.js tests/t21-historie.js …
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');

class Page {
  constructor() { this.initScripts = []; this.err = []; }
  on(ev, fn) { if (ev === 'pageerror') this._errFn = fn; if (ev === 'dialog') this._dlg = fn; }
  async addInitScript(fn, arg) { this.initScripts.push([fn, arg]); }
  _fehler(e) {
    const s = e && e.stack ? String(e.stack).split('\n')[0] : String(e);
    if (/Not implemented/.test(s)) return;          // jsdom kennt kein Layout
    this.err.push(s); if (this._errFn) this._errFn(s);
  }
  async goto(url) {
    const pfad = decodeURIComponent(String(url).replace(/^file:\/\//, ''));
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => this._fehler(e));
    const self = this;
    this.dom = new JSDOM(fs.readFileSync(pfad, 'utf8'), {
      runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://finanztracker.test/',          // file:// hätte keinen localStorage
      virtualConsole: vc,
      beforeParse(w) {
        w.addEventListener('error', e => self._fehler(e.error || e.message));
        w.confirm = () => { if (self._dlg) self._dlg({ accept: () => {} }); return true; };
        w.alert = () => {};
        w.scrollTo = () => {};
        w.Element.prototype.scrollIntoView = function () {};
        const D = w.HTMLDialogElement && w.HTMLDialogElement.prototype;   // jsdom kennt kein <dialog>
        if (D && !D.showModal) { D.showModal = function () { this.open = true; }; D.close = function () { this.open = false; }; }
        self.initScripts.forEach(([fn, arg]) => w.eval('(' + fn.toString() + ')')(arg));
      },
    });
    this.window = this.dom.window;
  }
  // Die Funktion wird im Fenster übersetzt und sieht darum dessen globale Namen.
  async evaluate(fn, arg) { return await this.window.eval('(' + fn.toString() + ')')(arg); }
  async waitForTimeout(ms) { return new Promise(r => setTimeout(r, Math.min(ms, 1200))); }
  async close() { try { this.window.close(); } catch (e) {} }
}

const chromium = { async launch() { return { async newPage() { return new Page(); }, async close() {} }; } };
module.exports = { chromium };

// Als Vorladung (-r) eingehängt: require('playwright') liefert diesen Ersatz.
const Module = require('module'), orig = Module._load;
Module._load = function (req, ...rest) {
  return req === 'playwright' ? module.exports : orig.call(this, req, ...rest);
};
