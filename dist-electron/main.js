import It, { desktopCapturer as Lc, app as pt, BrowserWindow as zl, Notification as zr, ipcMain as Sr } from "electron";
import Gt from "node:path";
import { fileURLToPath as Uc } from "node:url";
import gt from "fs";
import kc from "constants";
import Rr from "stream";
import pa from "util";
import Xl from "assert";
import Ie from "path";
import Kr from "child_process";
import Jl from "events";
import Ar from "crypto";
import Kl from "tty";
import Qr from "os";
import vt from "url";
import Ql from "zlib";
import $c from "http";
import { uIOhook as Yr } from "uiohook-napi";
import qc from "active-win";
import { execFile as Mc } from "node:child_process";
import { promisify as Bc } from "node:util";
import ca from "node:fs";
var Qe = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, At = {}, cn = {}, xr = {}, Ba;
function Ve() {
  return Ba || (Ba = 1, xr.fromCallback = function(e) {
    return Object.defineProperty(function(...d) {
      if (typeof d[d.length - 1] == "function") e.apply(this, d);
      else
        return new Promise((h, c) => {
          d.push((f, l) => f != null ? c(f) : h(l)), e.apply(this, d);
        });
    }, "name", { value: e.name });
  }, xr.fromPromise = function(e) {
    return Object.defineProperty(function(...d) {
      const h = d[d.length - 1];
      if (typeof h != "function") return e.apply(this, d);
      d.pop(), e.apply(this, d).then((c) => h(null, c), h);
    }, "name", { value: e.name });
  }), xr;
}
var fn, Ha;
function Hc() {
  if (Ha) return fn;
  Ha = 1;
  var e = kc, d = process.cwd, h = null, c = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    return h || (h = d.call(process)), h;
  };
  try {
    process.cwd();
  } catch {
  }
  if (typeof process.chdir == "function") {
    var f = process.chdir;
    process.chdir = function(i) {
      h = null, f.call(process, i);
    }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, f);
  }
  fn = l;
  function l(i) {
    e.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && u(i), i.lutimes || o(i), i.chown = r(i.chown), i.fchown = r(i.fchown), i.lchown = r(i.lchown), i.chmod = s(i.chmod), i.fchmod = s(i.fchmod), i.lchmod = s(i.lchmod), i.chownSync = n(i.chownSync), i.fchownSync = n(i.fchownSync), i.lchownSync = n(i.lchownSync), i.chmodSync = a(i.chmodSync), i.fchmodSync = a(i.fchmodSync), i.lchmodSync = a(i.lchmodSync), i.stat = p(i.stat), i.fstat = p(i.fstat), i.lstat = p(i.lstat), i.statSync = g(i.statSync), i.fstatSync = g(i.fstatSync), i.lstatSync = g(i.lstatSync), i.chmod && !i.lchmod && (i.lchmod = function(m, _, A) {
      A && process.nextTick(A);
    }, i.lchmodSync = function() {
    }), i.chown && !i.lchown && (i.lchown = function(m, _, A, P) {
      P && process.nextTick(P);
    }, i.lchownSync = function() {
    }), c === "win32" && (i.rename = typeof i.rename != "function" ? i.rename : (function(m) {
      function _(A, P, O) {
        var b = Date.now(), I = 0;
        m(A, P, function T(R) {
          if (R && (R.code === "EACCES" || R.code === "EPERM" || R.code === "EBUSY") && Date.now() - b < 6e4) {
            setTimeout(function() {
              i.stat(P, function(E, k) {
                E && E.code === "ENOENT" ? m(A, P, T) : O(R);
              });
            }, I), I < 100 && (I += 10);
            return;
          }
          O && O(R);
        });
      }
      return Object.setPrototypeOf && Object.setPrototypeOf(_, m), _;
    })(i.rename)), i.read = typeof i.read != "function" ? i.read : (function(m) {
      function _(A, P, O, b, I, T) {
        var R;
        if (T && typeof T == "function") {
          var E = 0;
          R = function(k, $, L) {
            if (k && k.code === "EAGAIN" && E < 10)
              return E++, m.call(i, A, P, O, b, I, R);
            T.apply(this, arguments);
          };
        }
        return m.call(i, A, P, O, b, I, R);
      }
      return Object.setPrototypeOf && Object.setPrototypeOf(_, m), _;
    })(i.read), i.readSync = typeof i.readSync != "function" ? i.readSync : /* @__PURE__ */ (function(m) {
      return function(_, A, P, O, b) {
        for (var I = 0; ; )
          try {
            return m.call(i, _, A, P, O, b);
          } catch (T) {
            if (T.code === "EAGAIN" && I < 10) {
              I++;
              continue;
            }
            throw T;
          }
      };
    })(i.readSync);
    function u(m) {
      m.lchmod = function(_, A, P) {
        m.open(
          _,
          e.O_WRONLY | e.O_SYMLINK,
          A,
          function(O, b) {
            if (O) {
              P && P(O);
              return;
            }
            m.fchmod(b, A, function(I) {
              m.close(b, function(T) {
                P && P(I || T);
              });
            });
          }
        );
      }, m.lchmodSync = function(_, A) {
        var P = m.openSync(_, e.O_WRONLY | e.O_SYMLINK, A), O = !0, b;
        try {
          b = m.fchmodSync(P, A), O = !1;
        } finally {
          if (O)
            try {
              m.closeSync(P);
            } catch {
            }
          else
            m.closeSync(P);
        }
        return b;
      };
    }
    function o(m) {
      e.hasOwnProperty("O_SYMLINK") && m.futimes ? (m.lutimes = function(_, A, P, O) {
        m.open(_, e.O_SYMLINK, function(b, I) {
          if (b) {
            O && O(b);
            return;
          }
          m.futimes(I, A, P, function(T) {
            m.close(I, function(R) {
              O && O(T || R);
            });
          });
        });
      }, m.lutimesSync = function(_, A, P) {
        var O = m.openSync(_, e.O_SYMLINK), b, I = !0;
        try {
          b = m.futimesSync(O, A, P), I = !1;
        } finally {
          if (I)
            try {
              m.closeSync(O);
            } catch {
            }
          else
            m.closeSync(O);
        }
        return b;
      }) : m.futimes && (m.lutimes = function(_, A, P, O) {
        O && process.nextTick(O);
      }, m.lutimesSync = function() {
      });
    }
    function s(m) {
      return m && function(_, A, P) {
        return m.call(i, _, A, function(O) {
          y(O) && (O = null), P && P.apply(this, arguments);
        });
      };
    }
    function a(m) {
      return m && function(_, A) {
        try {
          return m.call(i, _, A);
        } catch (P) {
          if (!y(P)) throw P;
        }
      };
    }
    function r(m) {
      return m && function(_, A, P, O) {
        return m.call(i, _, A, P, function(b) {
          y(b) && (b = null), O && O.apply(this, arguments);
        });
      };
    }
    function n(m) {
      return m && function(_, A, P) {
        try {
          return m.call(i, _, A, P);
        } catch (O) {
          if (!y(O)) throw O;
        }
      };
    }
    function p(m) {
      return m && function(_, A, P) {
        typeof A == "function" && (P = A, A = null);
        function O(b, I) {
          I && (I.uid < 0 && (I.uid += 4294967296), I.gid < 0 && (I.gid += 4294967296)), P && P.apply(this, arguments);
        }
        return A ? m.call(i, _, A, O) : m.call(i, _, O);
      };
    }
    function g(m) {
      return m && function(_, A) {
        var P = A ? m.call(i, _, A) : m.call(i, _);
        return P && (P.uid < 0 && (P.uid += 4294967296), P.gid < 0 && (P.gid += 4294967296)), P;
      };
    }
    function y(m) {
      if (!m || m.code === "ENOSYS")
        return !0;
      var _ = !process.getuid || process.getuid() !== 0;
      return !!(_ && (m.code === "EINVAL" || m.code === "EPERM"));
    }
  }
  return fn;
}
var dn, ja;
function jc() {
  if (ja) return dn;
  ja = 1;
  var e = Rr.Stream;
  dn = d;
  function d(h) {
    return {
      ReadStream: c,
      WriteStream: f
    };
    function c(l, i) {
      if (!(this instanceof c)) return new c(l, i);
      e.call(this);
      var u = this;
      this.path = l, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, i = i || {};
      for (var o = Object.keys(i), s = 0, a = o.length; s < a; s++) {
        var r = o[s];
        this[r] = i[r];
      }
      if (this.encoding && this.setEncoding(this.encoding), this.start !== void 0) {
        if (typeof this.start != "number")
          throw TypeError("start must be a Number");
        if (this.end === void 0)
          this.end = 1 / 0;
        else if (typeof this.end != "number")
          throw TypeError("end must be a Number");
        if (this.start > this.end)
          throw new Error("start must be <= end");
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          u._read();
        });
        return;
      }
      h.open(this.path, this.flags, this.mode, function(n, p) {
        if (n) {
          u.emit("error", n), u.readable = !1;
          return;
        }
        u.fd = p, u.emit("open", p), u._read();
      });
    }
    function f(l, i) {
      if (!(this instanceof f)) return new f(l, i);
      e.call(this), this.path = l, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, i = i || {};
      for (var u = Object.keys(i), o = 0, s = u.length; o < s; o++) {
        var a = u[o];
        this[a] = i[a];
      }
      if (this.start !== void 0) {
        if (typeof this.start != "number")
          throw TypeError("start must be a Number");
        if (this.start < 0)
          throw new Error("start must be >= zero");
        this.pos = this.start;
      }
      this.busy = !1, this._queue = [], this.fd === null && (this._open = h.open, this._queue.push([this._open, this.path, this.flags, this.mode, void 0]), this.flush());
    }
  }
  return dn;
}
var hn, Ga;
function Gc() {
  if (Ga) return hn;
  Ga = 1, hn = d;
  var e = Object.getPrototypeOf || function(h) {
    return h.__proto__;
  };
  function d(h) {
    if (h === null || typeof h != "object")
      return h;
    if (h instanceof Object)
      var c = { __proto__: e(h) };
    else
      var c = /* @__PURE__ */ Object.create(null);
    return Object.getOwnPropertyNames(h).forEach(function(f) {
      Object.defineProperty(c, f, Object.getOwnPropertyDescriptor(h, f));
    }), c;
  }
  return hn;
}
var Lr, Wa;
function je() {
  if (Wa) return Lr;
  Wa = 1;
  var e = gt, d = Hc(), h = jc(), c = Gc(), f = pa, l, i;
  typeof Symbol == "function" && typeof Symbol.for == "function" ? (l = /* @__PURE__ */ Symbol.for("graceful-fs.queue"), i = /* @__PURE__ */ Symbol.for("graceful-fs.previous")) : (l = "___graceful-fs.queue", i = "___graceful-fs.previous");
  function u() {
  }
  function o(m, _) {
    Object.defineProperty(m, l, {
      get: function() {
        return _;
      }
    });
  }
  var s = u;
  if (f.debuglog ? s = f.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (s = function() {
    var m = f.format.apply(f, arguments);
    m = "GFS4: " + m.split(/\n/).join(`
GFS4: `), console.error(m);
  }), !e[l]) {
    var a = Qe[l] || [];
    o(e, a), e.close = (function(m) {
      function _(A, P) {
        return m.call(e, A, function(O) {
          O || g(), typeof P == "function" && P.apply(this, arguments);
        });
      }
      return Object.defineProperty(_, i, {
        value: m
      }), _;
    })(e.close), e.closeSync = (function(m) {
      function _(A) {
        m.apply(e, arguments), g();
      }
      return Object.defineProperty(_, i, {
        value: m
      }), _;
    })(e.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
      s(e[l]), Xl.equal(e[l].length, 0);
    });
  }
  Qe[l] || o(Qe, e[l]), Lr = r(c(e)), process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !e.__patched && (Lr = r(e), e.__patched = !0);
  function r(m) {
    d(m), m.gracefulify = r, m.createReadStream = de, m.createWriteStream = ie;
    var _ = m.readFile;
    m.readFile = A;
    function A(Q, ge, w) {
      return typeof ge == "function" && (w = ge, ge = null), v(Q, ge, w);
      function v(B, F, ce, he) {
        return _(B, F, function(pe) {
          pe && (pe.code === "EMFILE" || pe.code === "ENFILE") ? n([v, [B, F, ce], pe, he || Date.now(), Date.now()]) : typeof ce == "function" && ce.apply(this, arguments);
        });
      }
    }
    var P = m.writeFile;
    m.writeFile = O;
    function O(Q, ge, w, v) {
      return typeof w == "function" && (v = w, w = null), B(Q, ge, w, v);
      function B(F, ce, he, pe, _e) {
        return P(F, ce, he, function(Ee) {
          Ee && (Ee.code === "EMFILE" || Ee.code === "ENFILE") ? n([B, [F, ce, he, pe], Ee, _e || Date.now(), Date.now()]) : typeof pe == "function" && pe.apply(this, arguments);
        });
      }
    }
    var b = m.appendFile;
    b && (m.appendFile = I);
    function I(Q, ge, w, v) {
      return typeof w == "function" && (v = w, w = null), B(Q, ge, w, v);
      function B(F, ce, he, pe, _e) {
        return b(F, ce, he, function(Ee) {
          Ee && (Ee.code === "EMFILE" || Ee.code === "ENFILE") ? n([B, [F, ce, he, pe], Ee, _e || Date.now(), Date.now()]) : typeof pe == "function" && pe.apply(this, arguments);
        });
      }
    }
    var T = m.copyFile;
    T && (m.copyFile = R);
    function R(Q, ge, w, v) {
      return typeof w == "function" && (v = w, w = 0), B(Q, ge, w, v);
      function B(F, ce, he, pe, _e) {
        return T(F, ce, he, function(Ee) {
          Ee && (Ee.code === "EMFILE" || Ee.code === "ENFILE") ? n([B, [F, ce, he, pe], Ee, _e || Date.now(), Date.now()]) : typeof pe == "function" && pe.apply(this, arguments);
        });
      }
    }
    var E = m.readdir;
    m.readdir = $;
    var k = /^v[0-5]\./;
    function $(Q, ge, w) {
      typeof ge == "function" && (w = ge, ge = null);
      var v = k.test(process.version) ? function(ce, he, pe, _e) {
        return E(ce, B(
          ce,
          he,
          pe,
          _e
        ));
      } : function(ce, he, pe, _e) {
        return E(ce, he, B(
          ce,
          he,
          pe,
          _e
        ));
      };
      return v(Q, ge, w);
      function B(F, ce, he, pe) {
        return function(_e, Ee) {
          _e && (_e.code === "EMFILE" || _e.code === "ENFILE") ? n([
            v,
            [F, ce, he],
            _e,
            pe || Date.now(),
            Date.now()
          ]) : (Ee && Ee.sort && Ee.sort(), typeof he == "function" && he.call(this, _e, Ee));
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var L = h(m);
      D = L.ReadStream, V = L.WriteStream;
    }
    var q = m.ReadStream;
    q && (D.prototype = Object.create(q.prototype), D.prototype.open = G);
    var x = m.WriteStream;
    x && (V.prototype = Object.create(x.prototype), V.prototype.open = te), Object.defineProperty(m, "ReadStream", {
      get: function() {
        return D;
      },
      set: function(Q) {
        D = Q;
      },
      enumerable: !0,
      configurable: !0
    }), Object.defineProperty(m, "WriteStream", {
      get: function() {
        return V;
      },
      set: function(Q) {
        V = Q;
      },
      enumerable: !0,
      configurable: !0
    });
    var N = D;
    Object.defineProperty(m, "FileReadStream", {
      get: function() {
        return N;
      },
      set: function(Q) {
        N = Q;
      },
      enumerable: !0,
      configurable: !0
    });
    var j = V;
    Object.defineProperty(m, "FileWriteStream", {
      get: function() {
        return j;
      },
      set: function(Q) {
        j = Q;
      },
      enumerable: !0,
      configurable: !0
    });
    function D(Q, ge) {
      return this instanceof D ? (q.apply(this, arguments), this) : D.apply(Object.create(D.prototype), arguments);
    }
    function G() {
      var Q = this;
      ve(Q.path, Q.flags, Q.mode, function(ge, w) {
        ge ? (Q.autoClose && Q.destroy(), Q.emit("error", ge)) : (Q.fd = w, Q.emit("open", w), Q.read());
      });
    }
    function V(Q, ge) {
      return this instanceof V ? (x.apply(this, arguments), this) : V.apply(Object.create(V.prototype), arguments);
    }
    function te() {
      var Q = this;
      ve(Q.path, Q.flags, Q.mode, function(ge, w) {
        ge ? (Q.destroy(), Q.emit("error", ge)) : (Q.fd = w, Q.emit("open", w));
      });
    }
    function de(Q, ge) {
      return new m.ReadStream(Q, ge);
    }
    function ie(Q, ge) {
      return new m.WriteStream(Q, ge);
    }
    var we = m.open;
    m.open = ve;
    function ve(Q, ge, w, v) {
      return typeof w == "function" && (v = w, w = null), B(Q, ge, w, v);
      function B(F, ce, he, pe, _e) {
        return we(F, ce, he, function(Ee, He) {
          Ee && (Ee.code === "EMFILE" || Ee.code === "ENFILE") ? n([B, [F, ce, he, pe], Ee, _e || Date.now(), Date.now()]) : typeof pe == "function" && pe.apply(this, arguments);
        });
      }
    }
    return m;
  }
  function n(m) {
    s("ENQUEUE", m[0].name, m[1]), e[l].push(m), y();
  }
  var p;
  function g() {
    for (var m = Date.now(), _ = 0; _ < e[l].length; ++_)
      e[l][_].length > 2 && (e[l][_][3] = m, e[l][_][4] = m);
    y();
  }
  function y() {
    if (clearTimeout(p), p = void 0, e[l].length !== 0) {
      var m = e[l].shift(), _ = m[0], A = m[1], P = m[2], O = m[3], b = m[4];
      if (O === void 0)
        s("RETRY", _.name, A), _.apply(null, A);
      else if (Date.now() - O >= 6e4) {
        s("TIMEOUT", _.name, A);
        var I = A.pop();
        typeof I == "function" && I.call(null, P);
      } else {
        var T = Date.now() - b, R = Math.max(b - O, 1), E = Math.min(R * 1.2, 100);
        T >= E ? (s("RETRY", _.name, A), _.apply(null, A.concat([O]))) : e[l].push(m);
      }
      p === void 0 && (p = setTimeout(y, 0));
    }
  }
  return Lr;
}
var Va;
function Vt() {
  return Va || (Va = 1, (function(e) {
    const d = Ve().fromCallback, h = je(), c = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchmod",
      "lchown",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((f) => typeof h[f] == "function");
    Object.assign(e, h), c.forEach((f) => {
      e[f] = d(h[f]);
    }), e.exists = function(f, l) {
      return typeof l == "function" ? h.exists(f, l) : new Promise((i) => h.exists(f, i));
    }, e.read = function(f, l, i, u, o, s) {
      return typeof s == "function" ? h.read(f, l, i, u, o, s) : new Promise((a, r) => {
        h.read(f, l, i, u, o, (n, p, g) => {
          if (n) return r(n);
          a({ bytesRead: p, buffer: g });
        });
      });
    }, e.write = function(f, l, ...i) {
      return typeof i[i.length - 1] == "function" ? h.write(f, l, ...i) : new Promise((u, o) => {
        h.write(f, l, ...i, (s, a, r) => {
          if (s) return o(s);
          u({ bytesWritten: a, buffer: r });
        });
      });
    }, typeof h.writev == "function" && (e.writev = function(f, l, ...i) {
      return typeof i[i.length - 1] == "function" ? h.writev(f, l, ...i) : new Promise((u, o) => {
        h.writev(f, l, ...i, (s, a, r) => {
          if (s) return o(s);
          u({ bytesWritten: a, buffers: r });
        });
      });
    }), typeof h.realpath.native == "function" ? e.realpath.native = d(h.realpath.native) : process.emitWarning(
      "fs.realpath.native is not a function. Is fs being monkey-patched?",
      "Warning",
      "fs-extra-WARN0003"
    );
  })(cn)), cn;
}
var Ur = {}, pn = {}, Ya;
function Wc() {
  if (Ya) return pn;
  Ya = 1;
  const e = Ie;
  return pn.checkPath = function(h) {
    if (process.platform === "win32" && /[<>:"|?*]/.test(h.replace(e.parse(h).root, ""))) {
      const f = new Error(`Path contains invalid characters: ${h}`);
      throw f.code = "EINVAL", f;
    }
  }, pn;
}
var za;
function Vc() {
  if (za) return Ur;
  za = 1;
  const e = /* @__PURE__ */ Vt(), { checkPath: d } = /* @__PURE__ */ Wc(), h = (c) => {
    const f = { mode: 511 };
    return typeof c == "number" ? c : { ...f, ...c }.mode;
  };
  return Ur.makeDir = async (c, f) => (d(c), e.mkdir(c, {
    mode: h(f),
    recursive: !0
  })), Ur.makeDirSync = (c, f) => (d(c), e.mkdirSync(c, {
    mode: h(f),
    recursive: !0
  })), Ur;
}
var mn, Xa;
function nt() {
  if (Xa) return mn;
  Xa = 1;
  const e = Ve().fromPromise, { makeDir: d, makeDirSync: h } = /* @__PURE__ */ Vc(), c = e(d);
  return mn = {
    mkdirs: c,
    mkdirsSync: h,
    // alias
    mkdirp: c,
    mkdirpSync: h,
    ensureDir: c,
    ensureDirSync: h
  }, mn;
}
var gn, Ja;
function Dt() {
  if (Ja) return gn;
  Ja = 1;
  const e = Ve().fromPromise, d = /* @__PURE__ */ Vt();
  function h(c) {
    return d.access(c).then(() => !0).catch(() => !1);
  }
  return gn = {
    pathExists: e(h),
    pathExistsSync: d.existsSync
  }, gn;
}
var vn, Ka;
function Zl() {
  if (Ka) return vn;
  Ka = 1;
  const e = je();
  function d(c, f, l, i) {
    e.open(c, "r+", (u, o) => {
      if (u) return i(u);
      e.futimes(o, f, l, (s) => {
        e.close(o, (a) => {
          i && i(s || a);
        });
      });
    });
  }
  function h(c, f, l) {
    const i = e.openSync(c, "r+");
    return e.futimesSync(i, f, l), e.closeSync(i);
  }
  return vn = {
    utimesMillis: d,
    utimesMillisSync: h
  }, vn;
}
var En, Qa;
function Yt() {
  if (Qa) return En;
  Qa = 1;
  const e = /* @__PURE__ */ Vt(), d = Ie, h = pa;
  function c(n, p, g) {
    const y = g.dereference ? (m) => e.stat(m, { bigint: !0 }) : (m) => e.lstat(m, { bigint: !0 });
    return Promise.all([
      y(n),
      y(p).catch((m) => {
        if (m.code === "ENOENT") return null;
        throw m;
      })
    ]).then(([m, _]) => ({ srcStat: m, destStat: _ }));
  }
  function f(n, p, g) {
    let y;
    const m = g.dereference ? (A) => e.statSync(A, { bigint: !0 }) : (A) => e.lstatSync(A, { bigint: !0 }), _ = m(n);
    try {
      y = m(p);
    } catch (A) {
      if (A.code === "ENOENT") return { srcStat: _, destStat: null };
      throw A;
    }
    return { srcStat: _, destStat: y };
  }
  function l(n, p, g, y, m) {
    h.callbackify(c)(n, p, y, (_, A) => {
      if (_) return m(_);
      const { srcStat: P, destStat: O } = A;
      if (O) {
        if (s(P, O)) {
          const b = d.basename(n), I = d.basename(p);
          return g === "move" && b !== I && b.toLowerCase() === I.toLowerCase() ? m(null, { srcStat: P, destStat: O, isChangingCase: !0 }) : m(new Error("Source and destination must not be the same."));
        }
        if (P.isDirectory() && !O.isDirectory())
          return m(new Error(`Cannot overwrite non-directory '${p}' with directory '${n}'.`));
        if (!P.isDirectory() && O.isDirectory())
          return m(new Error(`Cannot overwrite directory '${p}' with non-directory '${n}'.`));
      }
      return P.isDirectory() && a(n, p) ? m(new Error(r(n, p, g))) : m(null, { srcStat: P, destStat: O });
    });
  }
  function i(n, p, g, y) {
    const { srcStat: m, destStat: _ } = f(n, p, y);
    if (_) {
      if (s(m, _)) {
        const A = d.basename(n), P = d.basename(p);
        if (g === "move" && A !== P && A.toLowerCase() === P.toLowerCase())
          return { srcStat: m, destStat: _, isChangingCase: !0 };
        throw new Error("Source and destination must not be the same.");
      }
      if (m.isDirectory() && !_.isDirectory())
        throw new Error(`Cannot overwrite non-directory '${p}' with directory '${n}'.`);
      if (!m.isDirectory() && _.isDirectory())
        throw new Error(`Cannot overwrite directory '${p}' with non-directory '${n}'.`);
    }
    if (m.isDirectory() && a(n, p))
      throw new Error(r(n, p, g));
    return { srcStat: m, destStat: _ };
  }
  function u(n, p, g, y, m) {
    const _ = d.resolve(d.dirname(n)), A = d.resolve(d.dirname(g));
    if (A === _ || A === d.parse(A).root) return m();
    e.stat(A, { bigint: !0 }, (P, O) => P ? P.code === "ENOENT" ? m() : m(P) : s(p, O) ? m(new Error(r(n, g, y))) : u(n, p, A, y, m));
  }
  function o(n, p, g, y) {
    const m = d.resolve(d.dirname(n)), _ = d.resolve(d.dirname(g));
    if (_ === m || _ === d.parse(_).root) return;
    let A;
    try {
      A = e.statSync(_, { bigint: !0 });
    } catch (P) {
      if (P.code === "ENOENT") return;
      throw P;
    }
    if (s(p, A))
      throw new Error(r(n, g, y));
    return o(n, p, _, y);
  }
  function s(n, p) {
    return p.ino && p.dev && p.ino === n.ino && p.dev === n.dev;
  }
  function a(n, p) {
    const g = d.resolve(n).split(d.sep).filter((m) => m), y = d.resolve(p).split(d.sep).filter((m) => m);
    return g.reduce((m, _, A) => m && y[A] === _, !0);
  }
  function r(n, p, g) {
    return `Cannot ${g} '${n}' to a subdirectory of itself, '${p}'.`;
  }
  return En = {
    checkPaths: l,
    checkPathsSync: i,
    checkParentPaths: u,
    checkParentPathsSync: o,
    isSrcSubdir: a,
    areIdentical: s
  }, En;
}
var yn, Za;
function Yc() {
  if (Za) return yn;
  Za = 1;
  const e = je(), d = Ie, h = nt().mkdirs, c = Dt().pathExists, f = Zl().utimesMillis, l = /* @__PURE__ */ Yt();
  function i($, L, q, x) {
    typeof q == "function" && !x ? (x = q, q = {}) : typeof q == "function" && (q = { filter: q }), x = x || function() {
    }, q = q || {}, q.clobber = "clobber" in q ? !!q.clobber : !0, q.overwrite = "overwrite" in q ? !!q.overwrite : q.clobber, q.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
      `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
      "Warning",
      "fs-extra-WARN0001"
    ), l.checkPaths($, L, "copy", q, (N, j) => {
      if (N) return x(N);
      const { srcStat: D, destStat: G } = j;
      l.checkParentPaths($, D, L, "copy", (V) => V ? x(V) : q.filter ? o(u, G, $, L, q, x) : u(G, $, L, q, x));
    });
  }
  function u($, L, q, x, N) {
    const j = d.dirname(q);
    c(j, (D, G) => {
      if (D) return N(D);
      if (G) return a($, L, q, x, N);
      h(j, (V) => V ? N(V) : a($, L, q, x, N));
    });
  }
  function o($, L, q, x, N, j) {
    Promise.resolve(N.filter(q, x)).then((D) => D ? $(L, q, x, N, j) : j(), (D) => j(D));
  }
  function s($, L, q, x, N) {
    return x.filter ? o(a, $, L, q, x, N) : a($, L, q, x, N);
  }
  function a($, L, q, x, N) {
    (x.dereference ? e.stat : e.lstat)(L, (D, G) => D ? N(D) : G.isDirectory() ? O(G, $, L, q, x, N) : G.isFile() || G.isCharacterDevice() || G.isBlockDevice() ? r(G, $, L, q, x, N) : G.isSymbolicLink() ? E($, L, q, x, N) : G.isSocket() ? N(new Error(`Cannot copy a socket file: ${L}`)) : G.isFIFO() ? N(new Error(`Cannot copy a FIFO pipe: ${L}`)) : N(new Error(`Unknown file: ${L}`)));
  }
  function r($, L, q, x, N, j) {
    return L ? n($, q, x, N, j) : p($, q, x, N, j);
  }
  function n($, L, q, x, N) {
    if (x.overwrite)
      e.unlink(q, (j) => j ? N(j) : p($, L, q, x, N));
    else return x.errorOnExist ? N(new Error(`'${q}' already exists`)) : N();
  }
  function p($, L, q, x, N) {
    e.copyFile(L, q, (j) => j ? N(j) : x.preserveTimestamps ? g($.mode, L, q, N) : A(q, $.mode, N));
  }
  function g($, L, q, x) {
    return y($) ? m(q, $, (N) => N ? x(N) : _($, L, q, x)) : _($, L, q, x);
  }
  function y($) {
    return ($ & 128) === 0;
  }
  function m($, L, q) {
    return A($, L | 128, q);
  }
  function _($, L, q, x) {
    P(L, q, (N) => N ? x(N) : A(q, $, x));
  }
  function A($, L, q) {
    return e.chmod($, L, q);
  }
  function P($, L, q) {
    e.stat($, (x, N) => x ? q(x) : f(L, N.atime, N.mtime, q));
  }
  function O($, L, q, x, N, j) {
    return L ? I(q, x, N, j) : b($.mode, q, x, N, j);
  }
  function b($, L, q, x, N) {
    e.mkdir(q, (j) => {
      if (j) return N(j);
      I(L, q, x, (D) => D ? N(D) : A(q, $, N));
    });
  }
  function I($, L, q, x) {
    e.readdir($, (N, j) => N ? x(N) : T(j, $, L, q, x));
  }
  function T($, L, q, x, N) {
    const j = $.pop();
    return j ? R($, j, L, q, x, N) : N();
  }
  function R($, L, q, x, N, j) {
    const D = d.join(q, L), G = d.join(x, L);
    l.checkPaths(D, G, "copy", N, (V, te) => {
      if (V) return j(V);
      const { destStat: de } = te;
      s(de, D, G, N, (ie) => ie ? j(ie) : T($, q, x, N, j));
    });
  }
  function E($, L, q, x, N) {
    e.readlink(L, (j, D) => {
      if (j) return N(j);
      if (x.dereference && (D = d.resolve(process.cwd(), D)), $)
        e.readlink(q, (G, V) => G ? G.code === "EINVAL" || G.code === "UNKNOWN" ? e.symlink(D, q, N) : N(G) : (x.dereference && (V = d.resolve(process.cwd(), V)), l.isSrcSubdir(D, V) ? N(new Error(`Cannot copy '${D}' to a subdirectory of itself, '${V}'.`)) : $.isDirectory() && l.isSrcSubdir(V, D) ? N(new Error(`Cannot overwrite '${V}' with '${D}'.`)) : k(D, q, N)));
      else
        return e.symlink(D, q, N);
    });
  }
  function k($, L, q) {
    e.unlink(L, (x) => x ? q(x) : e.symlink($, L, q));
  }
  return yn = i, yn;
}
var wn, eo;
function zc() {
  if (eo) return wn;
  eo = 1;
  const e = je(), d = Ie, h = nt().mkdirsSync, c = Zl().utimesMillisSync, f = /* @__PURE__ */ Yt();
  function l(T, R, E) {
    typeof E == "function" && (E = { filter: E }), E = E || {}, E.clobber = "clobber" in E ? !!E.clobber : !0, E.overwrite = "overwrite" in E ? !!E.overwrite : E.clobber, E.preserveTimestamps && process.arch === "ia32" && process.emitWarning(
      `Using the preserveTimestamps option in 32-bit node is not recommended;

	see https://github.com/jprichardson/node-fs-extra/issues/269`,
      "Warning",
      "fs-extra-WARN0002"
    );
    const { srcStat: k, destStat: $ } = f.checkPathsSync(T, R, "copy", E);
    return f.checkParentPathsSync(T, k, R, "copy"), i($, T, R, E);
  }
  function i(T, R, E, k) {
    if (k.filter && !k.filter(R, E)) return;
    const $ = d.dirname(E);
    return e.existsSync($) || h($), o(T, R, E, k);
  }
  function u(T, R, E, k) {
    if (!(k.filter && !k.filter(R, E)))
      return o(T, R, E, k);
  }
  function o(T, R, E, k) {
    const L = (k.dereference ? e.statSync : e.lstatSync)(R);
    if (L.isDirectory()) return _(L, T, R, E, k);
    if (L.isFile() || L.isCharacterDevice() || L.isBlockDevice()) return s(L, T, R, E, k);
    if (L.isSymbolicLink()) return b(T, R, E, k);
    throw L.isSocket() ? new Error(`Cannot copy a socket file: ${R}`) : L.isFIFO() ? new Error(`Cannot copy a FIFO pipe: ${R}`) : new Error(`Unknown file: ${R}`);
  }
  function s(T, R, E, k, $) {
    return R ? a(T, E, k, $) : r(T, E, k, $);
  }
  function a(T, R, E, k) {
    if (k.overwrite)
      return e.unlinkSync(E), r(T, R, E, k);
    if (k.errorOnExist)
      throw new Error(`'${E}' already exists`);
  }
  function r(T, R, E, k) {
    return e.copyFileSync(R, E), k.preserveTimestamps && n(T.mode, R, E), y(E, T.mode);
  }
  function n(T, R, E) {
    return p(T) && g(E, T), m(R, E);
  }
  function p(T) {
    return (T & 128) === 0;
  }
  function g(T, R) {
    return y(T, R | 128);
  }
  function y(T, R) {
    return e.chmodSync(T, R);
  }
  function m(T, R) {
    const E = e.statSync(T);
    return c(R, E.atime, E.mtime);
  }
  function _(T, R, E, k, $) {
    return R ? P(E, k, $) : A(T.mode, E, k, $);
  }
  function A(T, R, E, k) {
    return e.mkdirSync(E), P(R, E, k), y(E, T);
  }
  function P(T, R, E) {
    e.readdirSync(T).forEach((k) => O(k, T, R, E));
  }
  function O(T, R, E, k) {
    const $ = d.join(R, T), L = d.join(E, T), { destStat: q } = f.checkPathsSync($, L, "copy", k);
    return u(q, $, L, k);
  }
  function b(T, R, E, k) {
    let $ = e.readlinkSync(R);
    if (k.dereference && ($ = d.resolve(process.cwd(), $)), T) {
      let L;
      try {
        L = e.readlinkSync(E);
      } catch (q) {
        if (q.code === "EINVAL" || q.code === "UNKNOWN") return e.symlinkSync($, E);
        throw q;
      }
      if (k.dereference && (L = d.resolve(process.cwd(), L)), f.isSrcSubdir($, L))
        throw new Error(`Cannot copy '${$}' to a subdirectory of itself, '${L}'.`);
      if (e.statSync(E).isDirectory() && f.isSrcSubdir(L, $))
        throw new Error(`Cannot overwrite '${L}' with '${$}'.`);
      return I($, E);
    } else
      return e.symlinkSync($, E);
  }
  function I(T, R) {
    return e.unlinkSync(R), e.symlinkSync(T, R);
  }
  return wn = l, wn;
}
var _n, to;
function ma() {
  if (to) return _n;
  to = 1;
  const e = Ve().fromCallback;
  return _n = {
    copy: e(/* @__PURE__ */ Yc()),
    copySync: /* @__PURE__ */ zc()
  }, _n;
}
var Sn, ro;
function Xc() {
  if (ro) return Sn;
  ro = 1;
  const e = je(), d = Ie, h = Xl, c = process.platform === "win32";
  function f(g) {
    [
      "unlink",
      "chmod",
      "stat",
      "lstat",
      "rmdir",
      "readdir"
    ].forEach((m) => {
      g[m] = g[m] || e[m], m = m + "Sync", g[m] = g[m] || e[m];
    }), g.maxBusyTries = g.maxBusyTries || 3;
  }
  function l(g, y, m) {
    let _ = 0;
    typeof y == "function" && (m = y, y = {}), h(g, "rimraf: missing path"), h.strictEqual(typeof g, "string", "rimraf: path should be a string"), h.strictEqual(typeof m, "function", "rimraf: callback function required"), h(y, "rimraf: invalid options argument provided"), h.strictEqual(typeof y, "object", "rimraf: options should be object"), f(y), i(g, y, function A(P) {
      if (P) {
        if ((P.code === "EBUSY" || P.code === "ENOTEMPTY" || P.code === "EPERM") && _ < y.maxBusyTries) {
          _++;
          const O = _ * 100;
          return setTimeout(() => i(g, y, A), O);
        }
        P.code === "ENOENT" && (P = null);
      }
      m(P);
    });
  }
  function i(g, y, m) {
    h(g), h(y), h(typeof m == "function"), y.lstat(g, (_, A) => {
      if (_ && _.code === "ENOENT")
        return m(null);
      if (_ && _.code === "EPERM" && c)
        return u(g, y, _, m);
      if (A && A.isDirectory())
        return s(g, y, _, m);
      y.unlink(g, (P) => {
        if (P) {
          if (P.code === "ENOENT")
            return m(null);
          if (P.code === "EPERM")
            return c ? u(g, y, P, m) : s(g, y, P, m);
          if (P.code === "EISDIR")
            return s(g, y, P, m);
        }
        return m(P);
      });
    });
  }
  function u(g, y, m, _) {
    h(g), h(y), h(typeof _ == "function"), y.chmod(g, 438, (A) => {
      A ? _(A.code === "ENOENT" ? null : m) : y.stat(g, (P, O) => {
        P ? _(P.code === "ENOENT" ? null : m) : O.isDirectory() ? s(g, y, m, _) : y.unlink(g, _);
      });
    });
  }
  function o(g, y, m) {
    let _;
    h(g), h(y);
    try {
      y.chmodSync(g, 438);
    } catch (A) {
      if (A.code === "ENOENT")
        return;
      throw m;
    }
    try {
      _ = y.statSync(g);
    } catch (A) {
      if (A.code === "ENOENT")
        return;
      throw m;
    }
    _.isDirectory() ? n(g, y, m) : y.unlinkSync(g);
  }
  function s(g, y, m, _) {
    h(g), h(y), h(typeof _ == "function"), y.rmdir(g, (A) => {
      A && (A.code === "ENOTEMPTY" || A.code === "EEXIST" || A.code === "EPERM") ? a(g, y, _) : A && A.code === "ENOTDIR" ? _(m) : _(A);
    });
  }
  function a(g, y, m) {
    h(g), h(y), h(typeof m == "function"), y.readdir(g, (_, A) => {
      if (_) return m(_);
      let P = A.length, O;
      if (P === 0) return y.rmdir(g, m);
      A.forEach((b) => {
        l(d.join(g, b), y, (I) => {
          if (!O) {
            if (I) return m(O = I);
            --P === 0 && y.rmdir(g, m);
          }
        });
      });
    });
  }
  function r(g, y) {
    let m;
    y = y || {}, f(y), h(g, "rimraf: missing path"), h.strictEqual(typeof g, "string", "rimraf: path should be a string"), h(y, "rimraf: missing options"), h.strictEqual(typeof y, "object", "rimraf: options should be object");
    try {
      m = y.lstatSync(g);
    } catch (_) {
      if (_.code === "ENOENT")
        return;
      _.code === "EPERM" && c && o(g, y, _);
    }
    try {
      m && m.isDirectory() ? n(g, y, null) : y.unlinkSync(g);
    } catch (_) {
      if (_.code === "ENOENT")
        return;
      if (_.code === "EPERM")
        return c ? o(g, y, _) : n(g, y, _);
      if (_.code !== "EISDIR")
        throw _;
      n(g, y, _);
    }
  }
  function n(g, y, m) {
    h(g), h(y);
    try {
      y.rmdirSync(g);
    } catch (_) {
      if (_.code === "ENOTDIR")
        throw m;
      if (_.code === "ENOTEMPTY" || _.code === "EEXIST" || _.code === "EPERM")
        p(g, y);
      else if (_.code !== "ENOENT")
        throw _;
    }
  }
  function p(g, y) {
    if (h(g), h(y), y.readdirSync(g).forEach((m) => r(d.join(g, m), y)), c) {
      const m = Date.now();
      do
        try {
          return y.rmdirSync(g, y);
        } catch {
        }
      while (Date.now() - m < 500);
    } else
      return y.rmdirSync(g, y);
  }
  return Sn = l, l.sync = r, Sn;
}
var Rn, no;
function Zr() {
  if (no) return Rn;
  no = 1;
  const e = je(), d = Ve().fromCallback, h = /* @__PURE__ */ Xc();
  function c(l, i) {
    if (e.rm) return e.rm(l, { recursive: !0, force: !0 }, i);
    h(l, i);
  }
  function f(l) {
    if (e.rmSync) return e.rmSync(l, { recursive: !0, force: !0 });
    h.sync(l);
  }
  return Rn = {
    remove: d(c),
    removeSync: f
  }, Rn;
}
var An, io;
function Jc() {
  if (io) return An;
  io = 1;
  const e = Ve().fromPromise, d = /* @__PURE__ */ Vt(), h = Ie, c = /* @__PURE__ */ nt(), f = /* @__PURE__ */ Zr(), l = e(async function(o) {
    let s;
    try {
      s = await d.readdir(o);
    } catch {
      return c.mkdirs(o);
    }
    return Promise.all(s.map((a) => f.remove(h.join(o, a))));
  });
  function i(u) {
    let o;
    try {
      o = d.readdirSync(u);
    } catch {
      return c.mkdirsSync(u);
    }
    o.forEach((s) => {
      s = h.join(u, s), f.removeSync(s);
    });
  }
  return An = {
    emptyDirSync: i,
    emptydirSync: i,
    emptyDir: l,
    emptydir: l
  }, An;
}
var Tn, ao;
function Kc() {
  if (ao) return Tn;
  ao = 1;
  const e = Ve().fromCallback, d = Ie, h = je(), c = /* @__PURE__ */ nt();
  function f(i, u) {
    function o() {
      h.writeFile(i, "", (s) => {
        if (s) return u(s);
        u();
      });
    }
    h.stat(i, (s, a) => {
      if (!s && a.isFile()) return u();
      const r = d.dirname(i);
      h.stat(r, (n, p) => {
        if (n)
          return n.code === "ENOENT" ? c.mkdirs(r, (g) => {
            if (g) return u(g);
            o();
          }) : u(n);
        p.isDirectory() ? o() : h.readdir(r, (g) => {
          if (g) return u(g);
        });
      });
    });
  }
  function l(i) {
    let u;
    try {
      u = h.statSync(i);
    } catch {
    }
    if (u && u.isFile()) return;
    const o = d.dirname(i);
    try {
      h.statSync(o).isDirectory() || h.readdirSync(o);
    } catch (s) {
      if (s && s.code === "ENOENT") c.mkdirsSync(o);
      else throw s;
    }
    h.writeFileSync(i, "");
  }
  return Tn = {
    createFile: e(f),
    createFileSync: l
  }, Tn;
}
var Cn, oo;
function Qc() {
  if (oo) return Cn;
  oo = 1;
  const e = Ve().fromCallback, d = Ie, h = je(), c = /* @__PURE__ */ nt(), f = Dt().pathExists, { areIdentical: l } = /* @__PURE__ */ Yt();
  function i(o, s, a) {
    function r(n, p) {
      h.link(n, p, (g) => {
        if (g) return a(g);
        a(null);
      });
    }
    h.lstat(s, (n, p) => {
      h.lstat(o, (g, y) => {
        if (g)
          return g.message = g.message.replace("lstat", "ensureLink"), a(g);
        if (p && l(y, p)) return a(null);
        const m = d.dirname(s);
        f(m, (_, A) => {
          if (_) return a(_);
          if (A) return r(o, s);
          c.mkdirs(m, (P) => {
            if (P) return a(P);
            r(o, s);
          });
        });
      });
    });
  }
  function u(o, s) {
    let a;
    try {
      a = h.lstatSync(s);
    } catch {
    }
    try {
      const p = h.lstatSync(o);
      if (a && l(p, a)) return;
    } catch (p) {
      throw p.message = p.message.replace("lstat", "ensureLink"), p;
    }
    const r = d.dirname(s);
    return h.existsSync(r) || c.mkdirsSync(r), h.linkSync(o, s);
  }
  return Cn = {
    createLink: e(i),
    createLinkSync: u
  }, Cn;
}
var bn, so;
function Zc() {
  if (so) return bn;
  so = 1;
  const e = Ie, d = je(), h = Dt().pathExists;
  function c(l, i, u) {
    if (e.isAbsolute(l))
      return d.lstat(l, (o) => o ? (o.message = o.message.replace("lstat", "ensureSymlink"), u(o)) : u(null, {
        toCwd: l,
        toDst: l
      }));
    {
      const o = e.dirname(i), s = e.join(o, l);
      return h(s, (a, r) => a ? u(a) : r ? u(null, {
        toCwd: s,
        toDst: l
      }) : d.lstat(l, (n) => n ? (n.message = n.message.replace("lstat", "ensureSymlink"), u(n)) : u(null, {
        toCwd: l,
        toDst: e.relative(o, l)
      })));
    }
  }
  function f(l, i) {
    let u;
    if (e.isAbsolute(l)) {
      if (u = d.existsSync(l), !u) throw new Error("absolute srcpath does not exist");
      return {
        toCwd: l,
        toDst: l
      };
    } else {
      const o = e.dirname(i), s = e.join(o, l);
      if (u = d.existsSync(s), u)
        return {
          toCwd: s,
          toDst: l
        };
      if (u = d.existsSync(l), !u) throw new Error("relative srcpath does not exist");
      return {
        toCwd: l,
        toDst: e.relative(o, l)
      };
    }
  }
  return bn = {
    symlinkPaths: c,
    symlinkPathsSync: f
  }, bn;
}
var Pn, lo;
function ef() {
  if (lo) return Pn;
  lo = 1;
  const e = je();
  function d(c, f, l) {
    if (l = typeof f == "function" ? f : l, f = typeof f == "function" ? !1 : f, f) return l(null, f);
    e.lstat(c, (i, u) => {
      if (i) return l(null, "file");
      f = u && u.isDirectory() ? "dir" : "file", l(null, f);
    });
  }
  function h(c, f) {
    let l;
    if (f) return f;
    try {
      l = e.lstatSync(c);
    } catch {
      return "file";
    }
    return l && l.isDirectory() ? "dir" : "file";
  }
  return Pn = {
    symlinkType: d,
    symlinkTypeSync: h
  }, Pn;
}
var On, uo;
function tf() {
  if (uo) return On;
  uo = 1;
  const e = Ve().fromCallback, d = Ie, h = /* @__PURE__ */ Vt(), c = /* @__PURE__ */ nt(), f = c.mkdirs, l = c.mkdirsSync, i = /* @__PURE__ */ Zc(), u = i.symlinkPaths, o = i.symlinkPathsSync, s = /* @__PURE__ */ ef(), a = s.symlinkType, r = s.symlinkTypeSync, n = Dt().pathExists, { areIdentical: p } = /* @__PURE__ */ Yt();
  function g(_, A, P, O) {
    O = typeof P == "function" ? P : O, P = typeof P == "function" ? !1 : P, h.lstat(A, (b, I) => {
      !b && I.isSymbolicLink() ? Promise.all([
        h.stat(_),
        h.stat(A)
      ]).then(([T, R]) => {
        if (p(T, R)) return O(null);
        y(_, A, P, O);
      }) : y(_, A, P, O);
    });
  }
  function y(_, A, P, O) {
    u(_, A, (b, I) => {
      if (b) return O(b);
      _ = I.toDst, a(I.toCwd, P, (T, R) => {
        if (T) return O(T);
        const E = d.dirname(A);
        n(E, (k, $) => {
          if (k) return O(k);
          if ($) return h.symlink(_, A, R, O);
          f(E, (L) => {
            if (L) return O(L);
            h.symlink(_, A, R, O);
          });
        });
      });
    });
  }
  function m(_, A, P) {
    let O;
    try {
      O = h.lstatSync(A);
    } catch {
    }
    if (O && O.isSymbolicLink()) {
      const R = h.statSync(_), E = h.statSync(A);
      if (p(R, E)) return;
    }
    const b = o(_, A);
    _ = b.toDst, P = r(b.toCwd, P);
    const I = d.dirname(A);
    return h.existsSync(I) || l(I), h.symlinkSync(_, A, P);
  }
  return On = {
    createSymlink: e(g),
    createSymlinkSync: m
  }, On;
}
var In, co;
function rf() {
  if (co) return In;
  co = 1;
  const { createFile: e, createFileSync: d } = /* @__PURE__ */ Kc(), { createLink: h, createLinkSync: c } = /* @__PURE__ */ Qc(), { createSymlink: f, createSymlinkSync: l } = /* @__PURE__ */ tf();
  return In = {
    // file
    createFile: e,
    createFileSync: d,
    ensureFile: e,
    ensureFileSync: d,
    // link
    createLink: h,
    createLinkSync: c,
    ensureLink: h,
    ensureLinkSync: c,
    // symlink
    createSymlink: f,
    createSymlinkSync: l,
    ensureSymlink: f,
    ensureSymlinkSync: l
  }, In;
}
var Dn, fo;
function ga() {
  if (fo) return Dn;
  fo = 1;
  function e(h, { EOL: c = `
`, finalEOL: f = !0, replacer: l = null, spaces: i } = {}) {
    const u = f ? c : "";
    return JSON.stringify(h, l, i).replace(/\n/g, c) + u;
  }
  function d(h) {
    return Buffer.isBuffer(h) && (h = h.toString("utf8")), h.replace(/^\uFEFF/, "");
  }
  return Dn = { stringify: e, stripBom: d }, Dn;
}
var Nn, ho;
function nf() {
  if (ho) return Nn;
  ho = 1;
  let e;
  try {
    e = je();
  } catch {
    e = gt;
  }
  const d = Ve(), { stringify: h, stripBom: c } = ga();
  async function f(a, r = {}) {
    typeof r == "string" && (r = { encoding: r });
    const n = r.fs || e, p = "throws" in r ? r.throws : !0;
    let g = await d.fromCallback(n.readFile)(a, r);
    g = c(g);
    let y;
    try {
      y = JSON.parse(g, r ? r.reviver : null);
    } catch (m) {
      if (p)
        throw m.message = `${a}: ${m.message}`, m;
      return null;
    }
    return y;
  }
  const l = d.fromPromise(f);
  function i(a, r = {}) {
    typeof r == "string" && (r = { encoding: r });
    const n = r.fs || e, p = "throws" in r ? r.throws : !0;
    try {
      let g = n.readFileSync(a, r);
      return g = c(g), JSON.parse(g, r.reviver);
    } catch (g) {
      if (p)
        throw g.message = `${a}: ${g.message}`, g;
      return null;
    }
  }
  async function u(a, r, n = {}) {
    const p = n.fs || e, g = h(r, n);
    await d.fromCallback(p.writeFile)(a, g, n);
  }
  const o = d.fromPromise(u);
  function s(a, r, n = {}) {
    const p = n.fs || e, g = h(r, n);
    return p.writeFileSync(a, g, n);
  }
  return Nn = {
    readFile: l,
    readFileSync: i,
    writeFile: o,
    writeFileSync: s
  }, Nn;
}
var Fn, po;
function af() {
  if (po) return Fn;
  po = 1;
  const e = nf();
  return Fn = {
    // jsonfile exports
    readJson: e.readFile,
    readJsonSync: e.readFileSync,
    writeJson: e.writeFile,
    writeJsonSync: e.writeFileSync
  }, Fn;
}
var xn, mo;
function va() {
  if (mo) return xn;
  mo = 1;
  const e = Ve().fromCallback, d = je(), h = Ie, c = /* @__PURE__ */ nt(), f = Dt().pathExists;
  function l(u, o, s, a) {
    typeof s == "function" && (a = s, s = "utf8");
    const r = h.dirname(u);
    f(r, (n, p) => {
      if (n) return a(n);
      if (p) return d.writeFile(u, o, s, a);
      c.mkdirs(r, (g) => {
        if (g) return a(g);
        d.writeFile(u, o, s, a);
      });
    });
  }
  function i(u, ...o) {
    const s = h.dirname(u);
    if (d.existsSync(s))
      return d.writeFileSync(u, ...o);
    c.mkdirsSync(s), d.writeFileSync(u, ...o);
  }
  return xn = {
    outputFile: e(l),
    outputFileSync: i
  }, xn;
}
var Ln, go;
function of() {
  if (go) return Ln;
  go = 1;
  const { stringify: e } = ga(), { outputFile: d } = /* @__PURE__ */ va();
  async function h(c, f, l = {}) {
    const i = e(f, l);
    await d(c, i, l);
  }
  return Ln = h, Ln;
}
var Un, vo;
function sf() {
  if (vo) return Un;
  vo = 1;
  const { stringify: e } = ga(), { outputFileSync: d } = /* @__PURE__ */ va();
  function h(c, f, l) {
    const i = e(f, l);
    d(c, i, l);
  }
  return Un = h, Un;
}
var kn, Eo;
function lf() {
  if (Eo) return kn;
  Eo = 1;
  const e = Ve().fromPromise, d = /* @__PURE__ */ af();
  return d.outputJson = e(/* @__PURE__ */ of()), d.outputJsonSync = /* @__PURE__ */ sf(), d.outputJSON = d.outputJson, d.outputJSONSync = d.outputJsonSync, d.writeJSON = d.writeJson, d.writeJSONSync = d.writeJsonSync, d.readJSON = d.readJson, d.readJSONSync = d.readJsonSync, kn = d, kn;
}
var $n, yo;
function uf() {
  if (yo) return $n;
  yo = 1;
  const e = je(), d = Ie, h = ma().copy, c = Zr().remove, f = nt().mkdirp, l = Dt().pathExists, i = /* @__PURE__ */ Yt();
  function u(n, p, g, y) {
    typeof g == "function" && (y = g, g = {}), g = g || {};
    const m = g.overwrite || g.clobber || !1;
    i.checkPaths(n, p, "move", g, (_, A) => {
      if (_) return y(_);
      const { srcStat: P, isChangingCase: O = !1 } = A;
      i.checkParentPaths(n, P, p, "move", (b) => {
        if (b) return y(b);
        if (o(p)) return s(n, p, m, O, y);
        f(d.dirname(p), (I) => I ? y(I) : s(n, p, m, O, y));
      });
    });
  }
  function o(n) {
    const p = d.dirname(n);
    return d.parse(p).root === p;
  }
  function s(n, p, g, y, m) {
    if (y) return a(n, p, g, m);
    if (g)
      return c(p, (_) => _ ? m(_) : a(n, p, g, m));
    l(p, (_, A) => _ ? m(_) : A ? m(new Error("dest already exists.")) : a(n, p, g, m));
  }
  function a(n, p, g, y) {
    e.rename(n, p, (m) => m ? m.code !== "EXDEV" ? y(m) : r(n, p, g, y) : y());
  }
  function r(n, p, g, y) {
    h(n, p, {
      overwrite: g,
      errorOnExist: !0
    }, (_) => _ ? y(_) : c(n, y));
  }
  return $n = u, $n;
}
var qn, wo;
function cf() {
  if (wo) return qn;
  wo = 1;
  const e = je(), d = Ie, h = ma().copySync, c = Zr().removeSync, f = nt().mkdirpSync, l = /* @__PURE__ */ Yt();
  function i(r, n, p) {
    p = p || {};
    const g = p.overwrite || p.clobber || !1, { srcStat: y, isChangingCase: m = !1 } = l.checkPathsSync(r, n, "move", p);
    return l.checkParentPathsSync(r, y, n, "move"), u(n) || f(d.dirname(n)), o(r, n, g, m);
  }
  function u(r) {
    const n = d.dirname(r);
    return d.parse(n).root === n;
  }
  function o(r, n, p, g) {
    if (g) return s(r, n, p);
    if (p)
      return c(n), s(r, n, p);
    if (e.existsSync(n)) throw new Error("dest already exists.");
    return s(r, n, p);
  }
  function s(r, n, p) {
    try {
      e.renameSync(r, n);
    } catch (g) {
      if (g.code !== "EXDEV") throw g;
      return a(r, n, p);
    }
  }
  function a(r, n, p) {
    return h(r, n, {
      overwrite: p,
      errorOnExist: !0
    }), c(r);
  }
  return qn = i, qn;
}
var Mn, _o;
function ff() {
  if (_o) return Mn;
  _o = 1;
  const e = Ve().fromCallback;
  return Mn = {
    move: e(/* @__PURE__ */ uf()),
    moveSync: /* @__PURE__ */ cf()
  }, Mn;
}
var Bn, So;
function Et() {
  return So || (So = 1, Bn = {
    // Export promiseified graceful-fs:
    .../* @__PURE__ */ Vt(),
    // Export extra methods:
    .../* @__PURE__ */ ma(),
    .../* @__PURE__ */ Jc(),
    .../* @__PURE__ */ rf(),
    .../* @__PURE__ */ lf(),
    .../* @__PURE__ */ nt(),
    .../* @__PURE__ */ ff(),
    .../* @__PURE__ */ va(),
    .../* @__PURE__ */ Dt(),
    .../* @__PURE__ */ Zr()
  }), Bn;
}
var Kt = {}, Tt = {}, Hn = {}, Ct = {}, Ro;
function Ea() {
  if (Ro) return Ct;
  Ro = 1, Object.defineProperty(Ct, "__esModule", { value: !0 }), Ct.CancellationError = Ct.CancellationToken = void 0;
  const e = Jl;
  let d = class extends e.EventEmitter {
    get cancelled() {
      return this._cancelled || this._parent != null && this._parent.cancelled;
    }
    set parent(f) {
      this.removeParentCancelHandler(), this._parent = f, this.parentCancelHandler = () => this.cancel(), this._parent.onCancel(this.parentCancelHandler);
    }
    // babel cannot compile ... correctly for super calls
    constructor(f) {
      super(), this.parentCancelHandler = null, this._parent = null, this._cancelled = !1, f != null && (this.parent = f);
    }
    cancel() {
      this._cancelled = !0, this.emit("cancel");
    }
    onCancel(f) {
      this.cancelled ? f() : this.once("cancel", f);
    }
    createPromise(f) {
      if (this.cancelled)
        return Promise.reject(new h());
      const l = () => {
        if (i != null)
          try {
            this.removeListener("cancel", i), i = null;
          } catch {
          }
      };
      let i = null;
      return new Promise((u, o) => {
        let s = null;
        if (i = () => {
          try {
            s != null && (s(), s = null);
          } finally {
            o(new h());
          }
        }, this.cancelled) {
          i();
          return;
        }
        this.onCancel(i), f(u, o, (a) => {
          s = a;
        });
      }).then((u) => (l(), u)).catch((u) => {
        throw l(), u;
      });
    }
    removeParentCancelHandler() {
      const f = this._parent;
      f != null && this.parentCancelHandler != null && (f.removeListener("cancel", this.parentCancelHandler), this.parentCancelHandler = null);
    }
    dispose() {
      try {
        this.removeParentCancelHandler();
      } finally {
        this.removeAllListeners(), this._parent = null;
      }
    }
  };
  Ct.CancellationToken = d;
  class h extends Error {
    constructor() {
      super("cancelled");
    }
  }
  return Ct.CancellationError = h, Ct;
}
var kr = {}, Ao;
function en() {
  if (Ao) return kr;
  Ao = 1, Object.defineProperty(kr, "__esModule", { value: !0 }), kr.newError = e;
  function e(d, h) {
    const c = new Error(d);
    return c.code = h, c;
  }
  return kr;
}
var ke = {}, $r = { exports: {} }, qr = { exports: {} }, jn, To;
function df() {
  if (To) return jn;
  To = 1;
  var e = 1e3, d = e * 60, h = d * 60, c = h * 24, f = c * 7, l = c * 365.25;
  jn = function(a, r) {
    r = r || {};
    var n = typeof a;
    if (n === "string" && a.length > 0)
      return i(a);
    if (n === "number" && isFinite(a))
      return r.long ? o(a) : u(a);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(a)
    );
  };
  function i(a) {
    if (a = String(a), !(a.length > 100)) {
      var r = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        a
      );
      if (r) {
        var n = parseFloat(r[1]), p = (r[2] || "ms").toLowerCase();
        switch (p) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * l;
          case "weeks":
          case "week":
          case "w":
            return n * f;
          case "days":
          case "day":
          case "d":
            return n * c;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * d;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * e;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return;
        }
      }
    }
  }
  function u(a) {
    var r = Math.abs(a);
    return r >= c ? Math.round(a / c) + "d" : r >= h ? Math.round(a / h) + "h" : r >= d ? Math.round(a / d) + "m" : r >= e ? Math.round(a / e) + "s" : a + "ms";
  }
  function o(a) {
    var r = Math.abs(a);
    return r >= c ? s(a, r, c, "day") : r >= h ? s(a, r, h, "hour") : r >= d ? s(a, r, d, "minute") : r >= e ? s(a, r, e, "second") : a + " ms";
  }
  function s(a, r, n, p) {
    var g = r >= n * 1.5;
    return Math.round(a / n) + " " + p + (g ? "s" : "");
  }
  return jn;
}
var Gn, Co;
function eu() {
  if (Co) return Gn;
  Co = 1;
  function e(d) {
    c.debug = c, c.default = c, c.coerce = s, c.disable = u, c.enable = l, c.enabled = o, c.humanize = df(), c.destroy = a, Object.keys(d).forEach((r) => {
      c[r] = d[r];
    }), c.names = [], c.skips = [], c.formatters = {};
    function h(r) {
      let n = 0;
      for (let p = 0; p < r.length; p++)
        n = (n << 5) - n + r.charCodeAt(p), n |= 0;
      return c.colors[Math.abs(n) % c.colors.length];
    }
    c.selectColor = h;
    function c(r) {
      let n, p = null, g, y;
      function m(..._) {
        if (!m.enabled)
          return;
        const A = m, P = Number(/* @__PURE__ */ new Date()), O = P - (n || P);
        A.diff = O, A.prev = n, A.curr = P, n = P, _[0] = c.coerce(_[0]), typeof _[0] != "string" && _.unshift("%O");
        let b = 0;
        _[0] = _[0].replace(/%([a-zA-Z%])/g, (T, R) => {
          if (T === "%%")
            return "%";
          b++;
          const E = c.formatters[R];
          if (typeof E == "function") {
            const k = _[b];
            T = E.call(A, k), _.splice(b, 1), b--;
          }
          return T;
        }), c.formatArgs.call(A, _), (A.log || c.log).apply(A, _);
      }
      return m.namespace = r, m.useColors = c.useColors(), m.color = c.selectColor(r), m.extend = f, m.destroy = c.destroy, Object.defineProperty(m, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => p !== null ? p : (g !== c.namespaces && (g = c.namespaces, y = c.enabled(r)), y),
        set: (_) => {
          p = _;
        }
      }), typeof c.init == "function" && c.init(m), m;
    }
    function f(r, n) {
      const p = c(this.namespace + (typeof n > "u" ? ":" : n) + r);
      return p.log = this.log, p;
    }
    function l(r) {
      c.save(r), c.namespaces = r, c.names = [], c.skips = [];
      const n = (typeof r == "string" ? r : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const p of n)
        p[0] === "-" ? c.skips.push(p.slice(1)) : c.names.push(p);
    }
    function i(r, n) {
      let p = 0, g = 0, y = -1, m = 0;
      for (; p < r.length; )
        if (g < n.length && (n[g] === r[p] || n[g] === "*"))
          n[g] === "*" ? (y = g, m = p, g++) : (p++, g++);
        else if (y !== -1)
          g = y + 1, m++, p = m;
        else
          return !1;
      for (; g < n.length && n[g] === "*"; )
        g++;
      return g === n.length;
    }
    function u() {
      const r = [
        ...c.names,
        ...c.skips.map((n) => "-" + n)
      ].join(",");
      return c.enable(""), r;
    }
    function o(r) {
      for (const n of c.skips)
        if (i(r, n))
          return !1;
      for (const n of c.names)
        if (i(r, n))
          return !0;
      return !1;
    }
    function s(r) {
      return r instanceof Error ? r.stack || r.message : r;
    }
    function a() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return c.enable(c.load()), c;
  }
  return Gn = e, Gn;
}
var bo;
function hf() {
  return bo || (bo = 1, (function(e, d) {
    d.formatArgs = c, d.save = f, d.load = l, d.useColors = h, d.storage = i(), d.destroy = /* @__PURE__ */ (() => {
      let o = !1;
      return () => {
        o || (o = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), d.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function h() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let o;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (o = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(o[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function c(o) {
      if (o[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + o[0] + (this.useColors ? "%c " : " ") + "+" + e.exports.humanize(this.diff), !this.useColors)
        return;
      const s = "color: " + this.color;
      o.splice(1, 0, s, "color: inherit");
      let a = 0, r = 0;
      o[0].replace(/%[a-zA-Z%]/g, (n) => {
        n !== "%%" && (a++, n === "%c" && (r = a));
      }), o.splice(r, 0, s);
    }
    d.log = console.debug || console.log || (() => {
    });
    function f(o) {
      try {
        o ? d.storage.setItem("debug", o) : d.storage.removeItem("debug");
      } catch {
      }
    }
    function l() {
      let o;
      try {
        o = d.storage.getItem("debug") || d.storage.getItem("DEBUG");
      } catch {
      }
      return !o && typeof process < "u" && "env" in process && (o = process.env.DEBUG), o;
    }
    function i() {
      try {
        return localStorage;
      } catch {
      }
    }
    e.exports = eu()(d);
    const { formatters: u } = e.exports;
    u.j = function(o) {
      try {
        return JSON.stringify(o);
      } catch (s) {
        return "[UnexpectedJSONParseError]: " + s.message;
      }
    };
  })(qr, qr.exports)), qr.exports;
}
var Mr = { exports: {} }, Wn, Po;
function pf() {
  return Po || (Po = 1, Wn = (e, d = process.argv) => {
    const h = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--", c = d.indexOf(h + e), f = d.indexOf("--");
    return c !== -1 && (f === -1 || c < f);
  }), Wn;
}
var Vn, Oo;
function mf() {
  if (Oo) return Vn;
  Oo = 1;
  const e = Qr, d = Kl, h = pf(), { env: c } = process;
  let f;
  h("no-color") || h("no-colors") || h("color=false") || h("color=never") ? f = 0 : (h("color") || h("colors") || h("color=true") || h("color=always")) && (f = 1), "FORCE_COLOR" in c && (c.FORCE_COLOR === "true" ? f = 1 : c.FORCE_COLOR === "false" ? f = 0 : f = c.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(c.FORCE_COLOR, 10), 3));
  function l(o) {
    return o === 0 ? !1 : {
      level: o,
      hasBasic: !0,
      has256: o >= 2,
      has16m: o >= 3
    };
  }
  function i(o, s) {
    if (f === 0)
      return 0;
    if (h("color=16m") || h("color=full") || h("color=truecolor"))
      return 3;
    if (h("color=256"))
      return 2;
    if (o && !s && f === void 0)
      return 0;
    const a = f || 0;
    if (c.TERM === "dumb")
      return a;
    if (process.platform === "win32") {
      const r = e.release().split(".");
      return Number(r[0]) >= 10 && Number(r[2]) >= 10586 ? Number(r[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in c)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((r) => r in c) || c.CI_NAME === "codeship" ? 1 : a;
    if ("TEAMCITY_VERSION" in c)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(c.TEAMCITY_VERSION) ? 1 : 0;
    if (c.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in c) {
      const r = parseInt((c.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (c.TERM_PROGRAM) {
        case "iTerm.app":
          return r >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(c.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(c.TERM) || "COLORTERM" in c ? 1 : a;
  }
  function u(o) {
    const s = i(o, o && o.isTTY);
    return l(s);
  }
  return Vn = {
    supportsColor: u,
    stdout: l(i(!0, d.isatty(1))),
    stderr: l(i(!0, d.isatty(2)))
  }, Vn;
}
var Io;
function gf() {
  return Io || (Io = 1, (function(e, d) {
    const h = Kl, c = pa;
    d.init = a, d.log = u, d.formatArgs = l, d.save = o, d.load = s, d.useColors = f, d.destroy = c.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), d.colors = [6, 2, 3, 4, 5, 1];
    try {
      const n = mf();
      n && (n.stderr || n).level >= 2 && (d.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    d.inspectOpts = Object.keys(process.env).filter((n) => /^debug_/i.test(n)).reduce((n, p) => {
      const g = p.substring(6).toLowerCase().replace(/_([a-z])/g, (m, _) => _.toUpperCase());
      let y = process.env[p];
      return /^(yes|on|true|enabled)$/i.test(y) ? y = !0 : /^(no|off|false|disabled)$/i.test(y) ? y = !1 : y === "null" ? y = null : y = Number(y), n[g] = y, n;
    }, {});
    function f() {
      return "colors" in d.inspectOpts ? !!d.inspectOpts.colors : h.isatty(process.stderr.fd);
    }
    function l(n) {
      const { namespace: p, useColors: g } = this;
      if (g) {
        const y = this.color, m = "\x1B[3" + (y < 8 ? y : "8;5;" + y), _ = `  ${m};1m${p} \x1B[0m`;
        n[0] = _ + n[0].split(`
`).join(`
` + _), n.push(m + "m+" + e.exports.humanize(this.diff) + "\x1B[0m");
      } else
        n[0] = i() + p + " " + n[0];
    }
    function i() {
      return d.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function u(...n) {
      return process.stderr.write(c.formatWithOptions(d.inspectOpts, ...n) + `
`);
    }
    function o(n) {
      n ? process.env.DEBUG = n : delete process.env.DEBUG;
    }
    function s() {
      return process.env.DEBUG;
    }
    function a(n) {
      n.inspectOpts = {};
      const p = Object.keys(d.inspectOpts);
      for (let g = 0; g < p.length; g++)
        n.inspectOpts[p[g]] = d.inspectOpts[p[g]];
    }
    e.exports = eu()(d);
    const { formatters: r } = e.exports;
    r.o = function(n) {
      return this.inspectOpts.colors = this.useColors, c.inspect(n, this.inspectOpts).split(`
`).map((p) => p.trim()).join(" ");
    }, r.O = function(n) {
      return this.inspectOpts.colors = this.useColors, c.inspect(n, this.inspectOpts);
    };
  })(Mr, Mr.exports)), Mr.exports;
}
var Do;
function vf() {
  return Do || (Do = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? $r.exports = hf() : $r.exports = gf()), $r.exports;
}
var Qt = {}, No;
function tu() {
  if (No) return Qt;
  No = 1, Object.defineProperty(Qt, "__esModule", { value: !0 }), Qt.ProgressCallbackTransform = void 0;
  const e = Rr;
  let d = class extends e.Transform {
    constructor(c, f, l) {
      super(), this.total = c, this.cancellationToken = f, this.onProgress = l, this.start = Date.now(), this.transferred = 0, this.delta = 0, this.nextUpdate = this.start + 1e3;
    }
    _transform(c, f, l) {
      if (this.cancellationToken.cancelled) {
        l(new Error("cancelled"), null);
        return;
      }
      this.transferred += c.length, this.delta += c.length;
      const i = Date.now();
      i >= this.nextUpdate && this.transferred !== this.total && (this.nextUpdate = i + 1e3, this.onProgress({
        total: this.total,
        delta: this.delta,
        transferred: this.transferred,
        percent: this.transferred / this.total * 100,
        bytesPerSecond: Math.round(this.transferred / ((i - this.start) / 1e3))
      }), this.delta = 0), l(null, c);
    }
    _flush(c) {
      if (this.cancellationToken.cancelled) {
        c(new Error("cancelled"));
        return;
      }
      this.onProgress({
        total: this.total,
        delta: this.delta,
        transferred: this.total,
        percent: 100,
        bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
      }), this.delta = 0, c(null);
    }
  };
  return Qt.ProgressCallbackTransform = d, Qt;
}
var Fo;
function Ef() {
  if (Fo) return ke;
  Fo = 1, Object.defineProperty(ke, "__esModule", { value: !0 }), ke.DigestTransform = ke.HttpExecutor = ke.HttpError = void 0, ke.createHttpError = s, ke.parseJson = n, ke.configureRequestOptionsFromUrl = y, ke.configureRequestUrl = m, ke.safeGetHeader = P, ke.configureRequestOptions = b, ke.safeStringifyJson = I;
  const e = Ar, d = vf(), h = gt, c = Rr, f = vt, l = Ea(), i = en(), u = tu(), o = (0, d.default)("electron-builder");
  function s(T, R = null) {
    return new r(T.statusCode || -1, `${T.statusCode} ${T.statusMessage}` + (R == null ? "" : `
` + JSON.stringify(R, null, "  ")) + `
Headers: ` + I(T.headers), R);
  }
  const a = /* @__PURE__ */ new Map([
    [429, "Too many requests"],
    [400, "Bad request"],
    [403, "Forbidden"],
    [404, "Not found"],
    [405, "Method not allowed"],
    [406, "Not acceptable"],
    [408, "Request timeout"],
    [413, "Request entity too large"],
    [500, "Internal server error"],
    [502, "Bad gateway"],
    [503, "Service unavailable"],
    [504, "Gateway timeout"],
    [505, "HTTP version not supported"]
  ]);
  class r extends Error {
    constructor(R, E = `HTTP error: ${a.get(R) || R}`, k = null) {
      super(E), this.statusCode = R, this.description = k, this.name = "HttpError", this.code = `HTTP_ERROR_${R}`;
    }
    isServerError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
  }
  ke.HttpError = r;
  function n(T) {
    return T.then((R) => R == null || R.length === 0 ? null : JSON.parse(R));
  }
  class p {
    constructor() {
      this.maxRedirects = 10;
    }
    request(R, E = new l.CancellationToken(), k) {
      b(R);
      const $ = k == null ? void 0 : JSON.stringify(k), L = $ ? Buffer.from($) : void 0;
      if (L != null) {
        o($);
        const { headers: q, ...x } = R;
        R = {
          method: "post",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": L.length,
            ...q
          },
          ...x
        };
      }
      return this.doApiRequest(R, E, (q) => q.end(L));
    }
    doApiRequest(R, E, k, $ = 0) {
      return o.enabled && o(`Request: ${I(R)}`), E.createPromise((L, q, x) => {
        const N = this.createRequest(R, (j) => {
          try {
            this.handleResponse(j, R, E, L, q, $, k);
          } catch (D) {
            q(D);
          }
        });
        this.addErrorAndTimeoutHandlers(N, q, R.timeout), this.addRedirectHandlers(N, R, q, $, (j) => {
          this.doApiRequest(j, E, k, $).then(L).catch(q);
        }), k(N, q), x(() => N.abort());
      });
    }
    // noinspection JSUnusedLocalSymbols
    // eslint-disable-next-line
    addRedirectHandlers(R, E, k, $, L) {
    }
    addErrorAndTimeoutHandlers(R, E, k = 60 * 1e3) {
      this.addTimeOutHandler(R, E, k), R.on("error", E), R.on("aborted", () => {
        E(new Error("Request has been aborted by the server"));
      });
    }
    handleResponse(R, E, k, $, L, q, x) {
      var N;
      if (o.enabled && o(`Response: ${R.statusCode} ${R.statusMessage}, request options: ${I(E)}`), R.statusCode === 404) {
        L(s(R, `method: ${E.method || "GET"} url: ${E.protocol || "https:"}//${E.hostname}${E.port ? `:${E.port}` : ""}${E.path}

Please double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.
`));
        return;
      } else if (R.statusCode === 204) {
        $();
        return;
      }
      const j = (N = R.statusCode) !== null && N !== void 0 ? N : 0, D = j >= 300 && j < 400, G = P(R, "location");
      if (D && G != null) {
        if (q > this.maxRedirects) {
          L(this.createMaxRedirectError());
          return;
        }
        this.doApiRequest(p.prepareRedirectUrlOptions(G, E), k, x, q).then($).catch(L);
        return;
      }
      R.setEncoding("utf8");
      let V = "";
      R.on("error", L), R.on("data", (te) => V += te), R.on("end", () => {
        try {
          if (R.statusCode != null && R.statusCode >= 400) {
            const te = P(R, "content-type"), de = te != null && (Array.isArray(te) ? te.find((ie) => ie.includes("json")) != null : te.includes("json"));
            L(s(R, `method: ${E.method || "GET"} url: ${E.protocol || "https:"}//${E.hostname}${E.port ? `:${E.port}` : ""}${E.path}

          Data:
          ${de ? JSON.stringify(JSON.parse(V)) : V}
          `));
          } else
            $(V.length === 0 ? null : V);
        } catch (te) {
          L(te);
        }
      });
    }
    async downloadToBuffer(R, E) {
      return await E.cancellationToken.createPromise((k, $, L) => {
        const q = [], x = {
          headers: E.headers || void 0,
          // because PrivateGitHubProvider requires HttpExecutor.prepareRedirectUrlOptions logic, so, we need to redirect manually
          redirect: "manual"
        };
        m(R, x), b(x), this.doDownload(x, {
          destination: null,
          options: E,
          onCancel: L,
          callback: (N) => {
            N == null ? k(Buffer.concat(q)) : $(N);
          },
          responseHandler: (N, j) => {
            let D = 0;
            N.on("data", (G) => {
              if (D += G.length, D > 524288e3) {
                j(new Error("Maximum allowed size is 500 MB"));
                return;
              }
              q.push(G);
            }), N.on("end", () => {
              j(null);
            });
          }
        }, 0);
      });
    }
    doDownload(R, E, k) {
      const $ = this.createRequest(R, (L) => {
        if (L.statusCode >= 400) {
          E.callback(new Error(`Cannot download "${R.protocol || "https:"}//${R.hostname}${R.path}", status ${L.statusCode}: ${L.statusMessage}`));
          return;
        }
        L.on("error", E.callback);
        const q = P(L, "location");
        if (q != null) {
          k < this.maxRedirects ? this.doDownload(p.prepareRedirectUrlOptions(q, R), E, k++) : E.callback(this.createMaxRedirectError());
          return;
        }
        E.responseHandler == null ? O(E, L) : E.responseHandler(L, E.callback);
      });
      this.addErrorAndTimeoutHandlers($, E.callback, R.timeout), this.addRedirectHandlers($, R, E.callback, k, (L) => {
        this.doDownload(L, E, k++);
      }), $.end();
    }
    createMaxRedirectError() {
      return new Error(`Too many redirects (> ${this.maxRedirects})`);
    }
    addTimeOutHandler(R, E, k) {
      R.on("socket", ($) => {
        $.setTimeout(k, () => {
          R.abort(), E(new Error("Request timed out"));
        });
      });
    }
    static prepareRedirectUrlOptions(R, E) {
      const k = y(R, { ...E }), $ = k.headers;
      if ($?.authorization) {
        const L = p.reconstructOriginalUrl(E), q = g(R, E);
        p.isCrossOriginRedirect(L, q) && (o.enabled && o(`Given the cross-origin redirect (from ${L.host} to ${q.host}), the Authorization header will be stripped out.`), delete $.authorization);
      }
      return k;
    }
    static reconstructOriginalUrl(R) {
      const E = R.protocol || "https:";
      if (!R.hostname)
        throw new Error("Missing hostname in request options");
      const k = R.hostname, $ = R.port ? `:${R.port}` : "", L = R.path || "/";
      return new f.URL(`${E}//${k}${$}${L}`);
    }
    static isCrossOriginRedirect(R, E) {
      if (R.hostname.toLowerCase() !== E.hostname.toLowerCase())
        return !0;
      if (R.protocol === "http:" && // This can be replaced with `!originalUrl.port`, but for the sake of clarity.
      ["80", ""].includes(R.port) && E.protocol === "https:" && // This can be replaced with `!redirectUrl.port`, but for the sake of clarity.
      ["443", ""].includes(E.port))
        return !1;
      if (R.protocol !== E.protocol)
        return !0;
      const k = R.port, $ = E.port;
      return k !== $;
    }
    static retryOnServerError(R, E = 3) {
      for (let k = 0; ; k++)
        try {
          return R();
        } catch ($) {
          if (k < E && ($ instanceof r && $.isServerError() || $.code === "EPIPE"))
            continue;
          throw $;
        }
    }
  }
  ke.HttpExecutor = p;
  function g(T, R) {
    try {
      return new f.URL(T);
    } catch {
      const E = R.hostname, k = R.protocol || "https:", $ = R.port ? `:${R.port}` : "", L = `${k}//${E}${$}`;
      return new f.URL(T, L);
    }
  }
  function y(T, R) {
    const E = b(R), k = g(T, R);
    return m(k, E), E;
  }
  function m(T, R) {
    R.protocol = T.protocol, R.hostname = T.hostname, T.port ? R.port = T.port : R.port && delete R.port, R.path = T.pathname + T.search;
  }
  class _ extends c.Transform {
    // noinspection JSUnusedGlobalSymbols
    get actual() {
      return this._actual;
    }
    constructor(R, E = "sha512", k = "base64") {
      super(), this.expected = R, this.algorithm = E, this.encoding = k, this._actual = null, this.isValidateOnEnd = !0, this.digester = (0, e.createHash)(E);
    }
    // noinspection JSUnusedGlobalSymbols
    _transform(R, E, k) {
      this.digester.update(R), k(null, R);
    }
    // noinspection JSUnusedGlobalSymbols
    _flush(R) {
      if (this._actual = this.digester.digest(this.encoding), this.isValidateOnEnd)
        try {
          this.validate();
        } catch (E) {
          R(E);
          return;
        }
      R(null);
    }
    validate() {
      if (this._actual == null)
        throw (0, i.newError)("Not finished yet", "ERR_STREAM_NOT_FINISHED");
      if (this._actual !== this.expected)
        throw (0, i.newError)(`${this.algorithm} checksum mismatch, expected ${this.expected}, got ${this._actual}`, "ERR_CHECKSUM_MISMATCH");
      return null;
    }
  }
  ke.DigestTransform = _;
  function A(T, R, E) {
    return T != null && R != null && T !== R ? (E(new Error(`checksum mismatch: expected ${R} but got ${T} (X-Checksum-Sha2 header)`)), !1) : !0;
  }
  function P(T, R) {
    const E = T.headers[R];
    return E == null ? null : Array.isArray(E) ? E.length === 0 ? null : E[E.length - 1] : E;
  }
  function O(T, R) {
    if (!A(P(R, "X-Checksum-Sha2"), T.options.sha2, T.callback))
      return;
    const E = [];
    if (T.options.onProgress != null) {
      const q = P(R, "content-length");
      q != null && E.push(new u.ProgressCallbackTransform(parseInt(q, 10), T.options.cancellationToken, T.options.onProgress));
    }
    const k = T.options.sha512;
    k != null ? E.push(new _(k, "sha512", k.length === 128 && !k.includes("+") && !k.includes("Z") && !k.includes("=") ? "hex" : "base64")) : T.options.sha2 != null && E.push(new _(T.options.sha2, "sha256", "hex"));
    const $ = (0, h.createWriteStream)(T.destination);
    E.push($);
    let L = R;
    for (const q of E)
      q.on("error", (x) => {
        $.close(), T.options.cancellationToken.cancelled || T.callback(x);
      }), L = L.pipe(q);
    $.on("finish", () => {
      $.close(T.callback);
    });
  }
  function b(T, R, E) {
    E != null && (T.method = E), T.headers = { ...T.headers };
    const k = T.headers;
    return R != null && (k.authorization = R.startsWith("Basic") || R.startsWith("Bearer") ? R : `token ${R}`), k["User-Agent"] == null && (k["User-Agent"] = "electron-builder"), (E == null || E === "GET" || k["Cache-Control"] == null) && (k["Cache-Control"] = "no-cache"), T.protocol == null && process.versions.electron != null && (T.protocol = "https:"), T;
  }
  function I(T, R) {
    return JSON.stringify(T, (E, k) => E.endsWith("Authorization") || E.endsWith("authorization") || E.endsWith("Password") || E.endsWith("PASSWORD") || E.endsWith("Token") || E.includes("password") || E.includes("token") || R != null && R.has(E) ? "<stripped sensitive data>" : k, 2);
  }
  return ke;
}
var Zt = {}, xo;
function yf() {
  if (xo) return Zt;
  xo = 1, Object.defineProperty(Zt, "__esModule", { value: !0 }), Zt.MemoLazy = void 0;
  let e = class {
    constructor(c, f) {
      this.selector = c, this.creator = f, this.selected = void 0, this._value = void 0;
    }
    get hasValue() {
      return this._value !== void 0;
    }
    get value() {
      const c = this.selector();
      if (this._value !== void 0 && d(this.selected, c))
        return this._value;
      this.selected = c;
      const f = this.creator(c);
      return this.value = f, f;
    }
    set value(c) {
      this._value = c;
    }
  };
  Zt.MemoLazy = e;
  function d(h, c) {
    if (typeof h == "object" && h !== null && (typeof c == "object" && c !== null)) {
      const i = Object.keys(h), u = Object.keys(c);
      return i.length === u.length && i.every((o) => d(h[o], c[o]));
    }
    return h === c;
  }
  return Zt;
}
var Ut = {}, Lo;
function wf() {
  if (Lo) return Ut;
  Lo = 1, Object.defineProperty(Ut, "__esModule", { value: !0 }), Ut.githubUrl = e, Ut.githubTagPrefix = d, Ut.getS3LikeProviderBaseUrl = h;
  function e(i, u = "github.com") {
    return `${i.protocol || "https"}://${i.host || u}`;
  }
  function d(i) {
    var u;
    return i.tagNamePrefix ? i.tagNamePrefix : !((u = i.vPrefixedTagName) !== null && u !== void 0) || u ? "v" : "";
  }
  function h(i) {
    const u = i.provider;
    if (u === "s3")
      return c(i);
    if (u === "spaces")
      return l(i);
    throw new Error(`Not supported provider: ${u}`);
  }
  function c(i) {
    let u;
    if (i.accelerate == !0)
      u = `https://${i.bucket}.s3-accelerate.amazonaws.com`;
    else if (i.endpoint != null)
      u = `${i.endpoint}/${i.bucket}`;
    else if (i.bucket.includes(".")) {
      if (i.region == null)
        throw new Error(`Bucket name "${i.bucket}" includes a dot, but S3 region is missing`);
      i.region === "us-east-1" ? u = `https://s3.amazonaws.com/${i.bucket}` : u = `https://s3-${i.region}.amazonaws.com/${i.bucket}`;
    } else i.region === "cn-north-1" ? u = `https://${i.bucket}.s3.${i.region}.amazonaws.com.cn` : u = `https://${i.bucket}.s3.amazonaws.com`;
    return f(u, i.path);
  }
  function f(i, u) {
    return u != null && u.length > 0 && (u.startsWith("/") || (i += "/"), i += u), i;
  }
  function l(i) {
    if (i.name == null)
      throw new Error("name is missing");
    if (i.region == null)
      throw new Error("region is missing");
    return f(`https://${i.name}.${i.region}.digitaloceanspaces.com`, i.path);
  }
  return Ut;
}
var Br = {}, Uo;
function _f() {
  if (Uo) return Br;
  Uo = 1, Object.defineProperty(Br, "__esModule", { value: !0 }), Br.retry = d;
  const e = Ea();
  async function d(h, c) {
    var f;
    const { retries: l, interval: i, backoff: u = 0, attempt: o = 0, shouldRetry: s, cancellationToken: a = new e.CancellationToken() } = c;
    try {
      return await h();
    } catch (r) {
      if (await Promise.resolve((f = s?.(r)) !== null && f !== void 0 ? f : !0) && l > 0 && !a.cancelled)
        return await new Promise((n) => setTimeout(n, i + u * o)), await d(h, { ...c, retries: l - 1, attempt: o + 1 });
      throw r;
    }
  }
  return Br;
}
var Hr = {}, ko;
function Sf() {
  if (ko) return Hr;
  ko = 1, Object.defineProperty(Hr, "__esModule", { value: !0 }), Hr.parseDn = e;
  function e(d) {
    let h = !1, c = null, f = "", l = 0;
    d = d.trim();
    const i = /* @__PURE__ */ new Map();
    for (let u = 0; u <= d.length; u++) {
      if (u === d.length) {
        c !== null && i.set(c, f);
        break;
      }
      const o = d[u];
      if (h) {
        if (o === '"') {
          h = !1;
          continue;
        }
      } else {
        if (o === '"') {
          h = !0;
          continue;
        }
        if (o === "\\") {
          u++;
          const s = parseInt(d.slice(u, u + 2), 16);
          Number.isNaN(s) ? f += d[u] : (u++, f += String.fromCharCode(s));
          continue;
        }
        if (c === null && o === "=") {
          c = f, f = "";
          continue;
        }
        if (o === "," || o === ";" || o === "+") {
          c !== null && i.set(c, f), c = null, f = "";
          continue;
        }
      }
      if (o === " " && !h) {
        if (f.length === 0)
          continue;
        if (u > l) {
          let s = u;
          for (; d[s] === " "; )
            s++;
          l = s;
        }
        if (l >= d.length || d[l] === "," || d[l] === ";" || c === null && d[l] === "=" || c !== null && d[l] === "+") {
          u = l - 1;
          continue;
        }
      }
      f += o;
    }
    return i;
  }
  return Hr;
}
var bt = {}, $o;
function Rf() {
  if ($o) return bt;
  $o = 1, Object.defineProperty(bt, "__esModule", { value: !0 }), bt.nil = bt.UUID = void 0;
  const e = Ar, d = en(), h = "options.name must be either a string or a Buffer", c = (0, e.randomBytes)(16);
  c[0] = c[0] | 1;
  const f = {}, l = [];
  for (let r = 0; r < 256; r++) {
    const n = (r + 256).toString(16).substr(1);
    f[n] = r, l[r] = n;
  }
  class i {
    constructor(n) {
      this.ascii = null, this.binary = null;
      const p = i.check(n);
      if (!p)
        throw new Error("not a UUID");
      this.version = p.version, p.format === "ascii" ? this.ascii = n : this.binary = n;
    }
    static v5(n, p) {
      return s(n, "sha1", 80, p);
    }
    toString() {
      return this.ascii == null && (this.ascii = a(this.binary)), this.ascii;
    }
    inspect() {
      return `UUID v${this.version} ${this.toString()}`;
    }
    static check(n, p = 0) {
      if (typeof n == "string")
        return n = n.toLowerCase(), /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-([a-f0-9]{12})$/.test(n) ? n === "00000000-0000-0000-0000-000000000000" ? { version: void 0, variant: "nil", format: "ascii" } : {
          version: (f[n[14] + n[15]] & 240) >> 4,
          variant: u((f[n[19] + n[20]] & 224) >> 5),
          format: "ascii"
        } : !1;
      if (Buffer.isBuffer(n)) {
        if (n.length < p + 16)
          return !1;
        let g = 0;
        for (; g < 16 && n[p + g] === 0; g++)
          ;
        return g === 16 ? { version: void 0, variant: "nil", format: "binary" } : {
          version: (n[p + 6] & 240) >> 4,
          variant: u((n[p + 8] & 224) >> 5),
          format: "binary"
        };
      }
      throw (0, d.newError)("Unknown type of uuid", "ERR_UNKNOWN_UUID_TYPE");
    }
    // read stringified uuid into a Buffer
    static parse(n) {
      const p = Buffer.allocUnsafe(16);
      let g = 0;
      for (let y = 0; y < 16; y++)
        p[y] = f[n[g++] + n[g++]], (y === 3 || y === 5 || y === 7 || y === 9) && (g += 1);
      return p;
    }
  }
  bt.UUID = i, i.OID = i.parse("6ba7b812-9dad-11d1-80b4-00c04fd430c8");
  function u(r) {
    switch (r) {
      case 0:
      case 1:
      case 3:
        return "ncs";
      case 4:
      case 5:
        return "rfc4122";
      case 6:
        return "microsoft";
      default:
        return "future";
    }
  }
  var o;
  (function(r) {
    r[r.ASCII = 0] = "ASCII", r[r.BINARY = 1] = "BINARY", r[r.OBJECT = 2] = "OBJECT";
  })(o || (o = {}));
  function s(r, n, p, g, y = o.ASCII) {
    const m = (0, e.createHash)(n);
    if (typeof r != "string" && !Buffer.isBuffer(r))
      throw (0, d.newError)(h, "ERR_INVALID_UUID_NAME");
    m.update(g), m.update(r);
    const A = m.digest();
    let P;
    switch (y) {
      case o.BINARY:
        A[6] = A[6] & 15 | p, A[8] = A[8] & 63 | 128, P = A;
        break;
      case o.OBJECT:
        A[6] = A[6] & 15 | p, A[8] = A[8] & 63 | 128, P = new i(A);
        break;
      default:
        P = l[A[0]] + l[A[1]] + l[A[2]] + l[A[3]] + "-" + l[A[4]] + l[A[5]] + "-" + l[A[6] & 15 | p] + l[A[7]] + "-" + l[A[8] & 63 | 128] + l[A[9]] + "-" + l[A[10]] + l[A[11]] + l[A[12]] + l[A[13]] + l[A[14]] + l[A[15]];
        break;
    }
    return P;
  }
  function a(r) {
    return l[r[0]] + l[r[1]] + l[r[2]] + l[r[3]] + "-" + l[r[4]] + l[r[5]] + "-" + l[r[6]] + l[r[7]] + "-" + l[r[8]] + l[r[9]] + "-" + l[r[10]] + l[r[11]] + l[r[12]] + l[r[13]] + l[r[14]] + l[r[15]];
  }
  return bt.nil = new i("00000000-0000-0000-0000-000000000000"), bt;
}
var kt = {}, Yn = {}, qo;
function Af() {
  return qo || (qo = 1, (function(e) {
    (function(d) {
      d.parser = function(w, v) {
        return new c(w, v);
      }, d.SAXParser = c, d.SAXStream = a, d.createStream = s, d.MAX_BUFFER_LENGTH = 64 * 1024;
      var h = [
        "comment",
        "sgmlDecl",
        "textNode",
        "tagName",
        "doctype",
        "procInstName",
        "procInstBody",
        "entity",
        "attribName",
        "attribValue",
        "cdata",
        "script"
      ];
      d.EVENTS = [
        "text",
        "processinginstruction",
        "sgmldeclaration",
        "doctype",
        "comment",
        "opentagstart",
        "attribute",
        "opentag",
        "closetag",
        "opencdata",
        "cdata",
        "closecdata",
        "error",
        "end",
        "ready",
        "script",
        "opennamespace",
        "closenamespace"
      ];
      function c(w, v) {
        if (!(this instanceof c))
          return new c(w, v);
        var B = this;
        l(B), B.q = B.c = "", B.bufferCheckPosition = d.MAX_BUFFER_LENGTH, B.opt = v || {}, B.opt.lowercase = B.opt.lowercase || B.opt.lowercasetags, B.looseCase = B.opt.lowercase ? "toLowerCase" : "toUpperCase", B.opt.maxEntityCount = B.opt.maxEntityCount || 512, B.opt.maxEntityDepth = B.opt.maxEntityDepth || 4, B.entityCount = B.entityDepth = 0, B.tags = [], B.closed = B.closedRoot = B.sawRoot = !1, B.tag = B.error = null, B.strict = !!w, B.noscript = !!(w || B.opt.noscript), B.state = E.BEGIN, B.strictEntities = B.opt.strictEntities, B.ENTITIES = B.strictEntities ? Object.create(d.XML_ENTITIES) : Object.create(d.ENTITIES), B.attribList = [], B.opt.xmlns && (B.ns = Object.create(y)), B.opt.unquotedAttributeValues === void 0 && (B.opt.unquotedAttributeValues = !w), B.trackPosition = B.opt.position !== !1, B.trackPosition && (B.position = B.line = B.column = 0), $(B, "onready");
      }
      Object.create || (Object.create = function(w) {
        function v() {
        }
        v.prototype = w;
        var B = new v();
        return B;
      }), Object.keys || (Object.keys = function(w) {
        var v = [];
        for (var B in w) w.hasOwnProperty(B) && v.push(B);
        return v;
      });
      function f(w) {
        for (var v = Math.max(d.MAX_BUFFER_LENGTH, 10), B = 0, F = 0, ce = h.length; F < ce; F++) {
          var he = w[h[F]].length;
          if (he > v)
            switch (h[F]) {
              case "textNode":
                q(w);
                break;
              case "cdata":
                L(w, "oncdata", w.cdata), w.cdata = "";
                break;
              case "script":
                L(w, "onscript", w.script), w.script = "";
                break;
              default:
                N(w, "Max buffer length exceeded: " + h[F]);
            }
          B = Math.max(B, he);
        }
        var pe = d.MAX_BUFFER_LENGTH - B;
        w.bufferCheckPosition = pe + w.position;
      }
      function l(w) {
        for (var v = 0, B = h.length; v < B; v++)
          w[h[v]] = "";
      }
      function i(w) {
        q(w), w.cdata !== "" && (L(w, "oncdata", w.cdata), w.cdata = ""), w.script !== "" && (L(w, "onscript", w.script), w.script = "");
      }
      c.prototype = {
        end: function() {
          j(this);
        },
        write: ge,
        resume: function() {
          return this.error = null, this;
        },
        close: function() {
          return this.write(null);
        },
        flush: function() {
          i(this);
        }
      };
      var u;
      try {
        u = require("stream").Stream;
      } catch {
        u = function() {
        };
      }
      u || (u = function() {
      });
      var o = d.EVENTS.filter(function(w) {
        return w !== "error" && w !== "end";
      });
      function s(w, v) {
        return new a(w, v);
      }
      function a(w, v) {
        if (!(this instanceof a))
          return new a(w, v);
        u.apply(this), this._parser = new c(w, v), this.writable = !0, this.readable = !0;
        var B = this;
        this._parser.onend = function() {
          B.emit("end");
        }, this._parser.onerror = function(F) {
          B.emit("error", F), B._parser.error = null;
        }, this._decoder = null, o.forEach(function(F) {
          Object.defineProperty(B, "on" + F, {
            get: function() {
              return B._parser["on" + F];
            },
            set: function(ce) {
              if (!ce)
                return B.removeAllListeners(F), B._parser["on" + F] = ce, ce;
              B.on(F, ce);
            },
            enumerable: !0,
            configurable: !1
          });
        });
      }
      a.prototype = Object.create(u.prototype, {
        constructor: {
          value: a
        }
      }), a.prototype.write = function(w) {
        return typeof Buffer == "function" && typeof Buffer.isBuffer == "function" && Buffer.isBuffer(w) && (this._decoder || (this._decoder = new TextDecoder("utf8")), w = this._decoder.decode(w, { stream: !0 })), this._parser.write(w.toString()), this.emit("data", w), !0;
      }, a.prototype.end = function(w) {
        if (w && w.length && this.write(w), this._decoder) {
          var v = this._decoder.decode();
          v && (this._parser.write(v), this.emit("data", v));
        }
        return this._parser.end(), !0;
      }, a.prototype.on = function(w, v) {
        var B = this;
        return !B._parser["on" + w] && o.indexOf(w) !== -1 && (B._parser["on" + w] = function() {
          var F = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
          F.splice(0, 0, w), B.emit.apply(B, F);
        }), u.prototype.on.call(B, w, v);
      };
      var r = "[CDATA[", n = "DOCTYPE", p = "http://www.w3.org/XML/1998/namespace", g = "http://www.w3.org/2000/xmlns/", y = { xml: p, xmlns: g }, m = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, _ = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/, A = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, P = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;
      function O(w) {
        return w === " " || w === `
` || w === "\r" || w === "	";
      }
      function b(w) {
        return w === '"' || w === "'";
      }
      function I(w) {
        return w === ">" || O(w);
      }
      function T(w, v) {
        return w.test(v);
      }
      function R(w, v) {
        return !T(w, v);
      }
      var E = 0;
      d.STATE = {
        BEGIN: E++,
        // leading byte order mark or whitespace
        BEGIN_WHITESPACE: E++,
        // leading whitespace
        TEXT: E++,
        // general stuff
        TEXT_ENTITY: E++,
        // &amp and such.
        OPEN_WAKA: E++,
        // <
        SGML_DECL: E++,
        // <!BLARG
        SGML_DECL_QUOTED: E++,
        // <!BLARG foo "bar
        DOCTYPE: E++,
        // <!DOCTYPE
        DOCTYPE_QUOTED: E++,
        // <!DOCTYPE "//blah
        DOCTYPE_DTD: E++,
        // <!DOCTYPE "//blah" [ ...
        DOCTYPE_DTD_QUOTED: E++,
        // <!DOCTYPE "//blah" [ "foo
        COMMENT_STARTING: E++,
        // <!-
        COMMENT: E++,
        // <!--
        COMMENT_ENDING: E++,
        // <!-- blah -
        COMMENT_ENDED: E++,
        // <!-- blah --
        CDATA: E++,
        // <![CDATA[ something
        CDATA_ENDING: E++,
        // ]
        CDATA_ENDING_2: E++,
        // ]]
        PROC_INST: E++,
        // <?hi
        PROC_INST_BODY: E++,
        // <?hi there
        PROC_INST_ENDING: E++,
        // <?hi "there" ?
        OPEN_TAG: E++,
        // <strong
        OPEN_TAG_SLASH: E++,
        // <strong /
        ATTRIB: E++,
        // <a
        ATTRIB_NAME: E++,
        // <a foo
        ATTRIB_NAME_SAW_WHITE: E++,
        // <a foo _
        ATTRIB_VALUE: E++,
        // <a foo=
        ATTRIB_VALUE_QUOTED: E++,
        // <a foo="bar
        ATTRIB_VALUE_CLOSED: E++,
        // <a foo="bar"
        ATTRIB_VALUE_UNQUOTED: E++,
        // <a foo=bar
        ATTRIB_VALUE_ENTITY_Q: E++,
        // <foo bar="&quot;"
        ATTRIB_VALUE_ENTITY_U: E++,
        // <foo bar=&quot
        CLOSE_TAG: E++,
        // </a
        CLOSE_TAG_SAW_WHITE: E++,
        // </a   >
        SCRIPT: E++,
        // <script> ...
        SCRIPT_ENDING: E++
        // <script> ... <
      }, d.XML_ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'"
      }, d.ENTITIES = {
        amp: "&",
        gt: ">",
        lt: "<",
        quot: '"',
        apos: "'",
        AElig: 198,
        Aacute: 193,
        Acirc: 194,
        Agrave: 192,
        Aring: 197,
        Atilde: 195,
        Auml: 196,
        Ccedil: 199,
        ETH: 208,
        Eacute: 201,
        Ecirc: 202,
        Egrave: 200,
        Euml: 203,
        Iacute: 205,
        Icirc: 206,
        Igrave: 204,
        Iuml: 207,
        Ntilde: 209,
        Oacute: 211,
        Ocirc: 212,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Ouml: 214,
        THORN: 222,
        Uacute: 218,
        Ucirc: 219,
        Ugrave: 217,
        Uuml: 220,
        Yacute: 221,
        aacute: 225,
        acirc: 226,
        aelig: 230,
        agrave: 224,
        aring: 229,
        atilde: 227,
        auml: 228,
        ccedil: 231,
        eacute: 233,
        ecirc: 234,
        egrave: 232,
        eth: 240,
        euml: 235,
        iacute: 237,
        icirc: 238,
        igrave: 236,
        iuml: 239,
        ntilde: 241,
        oacute: 243,
        ocirc: 244,
        ograve: 242,
        oslash: 248,
        otilde: 245,
        ouml: 246,
        szlig: 223,
        thorn: 254,
        uacute: 250,
        ucirc: 251,
        ugrave: 249,
        uuml: 252,
        yacute: 253,
        yuml: 255,
        copy: 169,
        reg: 174,
        nbsp: 160,
        iexcl: 161,
        cent: 162,
        pound: 163,
        curren: 164,
        yen: 165,
        brvbar: 166,
        sect: 167,
        uml: 168,
        ordf: 170,
        laquo: 171,
        not: 172,
        shy: 173,
        macr: 175,
        deg: 176,
        plusmn: 177,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        acute: 180,
        micro: 181,
        para: 182,
        middot: 183,
        cedil: 184,
        ordm: 186,
        raquo: 187,
        frac14: 188,
        frac12: 189,
        frac34: 190,
        iquest: 191,
        times: 215,
        divide: 247,
        OElig: 338,
        oelig: 339,
        Scaron: 352,
        scaron: 353,
        Yuml: 376,
        fnof: 402,
        circ: 710,
        tilde: 732,
        Alpha: 913,
        Beta: 914,
        Gamma: 915,
        Delta: 916,
        Epsilon: 917,
        Zeta: 918,
        Eta: 919,
        Theta: 920,
        Iota: 921,
        Kappa: 922,
        Lambda: 923,
        Mu: 924,
        Nu: 925,
        Xi: 926,
        Omicron: 927,
        Pi: 928,
        Rho: 929,
        Sigma: 931,
        Tau: 932,
        Upsilon: 933,
        Phi: 934,
        Chi: 935,
        Psi: 936,
        Omega: 937,
        alpha: 945,
        beta: 946,
        gamma: 947,
        delta: 948,
        epsilon: 949,
        zeta: 950,
        eta: 951,
        theta: 952,
        iota: 953,
        kappa: 954,
        lambda: 955,
        mu: 956,
        nu: 957,
        xi: 958,
        omicron: 959,
        pi: 960,
        rho: 961,
        sigmaf: 962,
        sigma: 963,
        tau: 964,
        upsilon: 965,
        phi: 966,
        chi: 967,
        psi: 968,
        omega: 969,
        thetasym: 977,
        upsih: 978,
        piv: 982,
        ensp: 8194,
        emsp: 8195,
        thinsp: 8201,
        zwnj: 8204,
        zwj: 8205,
        lrm: 8206,
        rlm: 8207,
        ndash: 8211,
        mdash: 8212,
        lsquo: 8216,
        rsquo: 8217,
        sbquo: 8218,
        ldquo: 8220,
        rdquo: 8221,
        bdquo: 8222,
        dagger: 8224,
        Dagger: 8225,
        bull: 8226,
        hellip: 8230,
        permil: 8240,
        prime: 8242,
        Prime: 8243,
        lsaquo: 8249,
        rsaquo: 8250,
        oline: 8254,
        frasl: 8260,
        euro: 8364,
        image: 8465,
        weierp: 8472,
        real: 8476,
        trade: 8482,
        alefsym: 8501,
        larr: 8592,
        uarr: 8593,
        rarr: 8594,
        darr: 8595,
        harr: 8596,
        crarr: 8629,
        lArr: 8656,
        uArr: 8657,
        rArr: 8658,
        dArr: 8659,
        hArr: 8660,
        forall: 8704,
        part: 8706,
        exist: 8707,
        empty: 8709,
        nabla: 8711,
        isin: 8712,
        notin: 8713,
        ni: 8715,
        prod: 8719,
        sum: 8721,
        minus: 8722,
        lowast: 8727,
        radic: 8730,
        prop: 8733,
        infin: 8734,
        ang: 8736,
        and: 8743,
        or: 8744,
        cap: 8745,
        cup: 8746,
        int: 8747,
        there4: 8756,
        sim: 8764,
        cong: 8773,
        asymp: 8776,
        ne: 8800,
        equiv: 8801,
        le: 8804,
        ge: 8805,
        sub: 8834,
        sup: 8835,
        nsub: 8836,
        sube: 8838,
        supe: 8839,
        oplus: 8853,
        otimes: 8855,
        perp: 8869,
        sdot: 8901,
        lceil: 8968,
        rceil: 8969,
        lfloor: 8970,
        rfloor: 8971,
        lang: 9001,
        rang: 9002,
        loz: 9674,
        spades: 9824,
        clubs: 9827,
        hearts: 9829,
        diams: 9830
      }, Object.keys(d.ENTITIES).forEach(function(w) {
        var v = d.ENTITIES[w], B = typeof v == "number" ? String.fromCharCode(v) : v;
        d.ENTITIES[w] = B;
      });
      for (var k in d.STATE)
        d.STATE[d.STATE[k]] = k;
      E = d.STATE;
      function $(w, v, B) {
        w[v] && w[v](B);
      }
      function L(w, v, B) {
        w.textNode && q(w), $(w, v, B);
      }
      function q(w) {
        w.textNode = x(w.opt, w.textNode), w.textNode && $(w, "ontext", w.textNode), w.textNode = "";
      }
      function x(w, v) {
        return w.trim && (v = v.trim()), w.normalize && (v = v.replace(/\s+/g, " ")), v;
      }
      function N(w, v) {
        return q(w), w.trackPosition && (v += `
Line: ` + w.line + `
Column: ` + w.column + `
Char: ` + w.c), v = new Error(v), w.error = v, $(w, "onerror", v), w;
      }
      function j(w) {
        return w.sawRoot && !w.closedRoot && D(w, "Unclosed root tag"), w.state !== E.BEGIN && w.state !== E.BEGIN_WHITESPACE && w.state !== E.TEXT && N(w, "Unexpected end"), q(w), w.c = "", w.closed = !0, $(w, "onend"), c.call(w, w.strict, w.opt), w;
      }
      function D(w, v) {
        if (typeof w != "object" || !(w instanceof c))
          throw new Error("bad call to strictFail");
        w.strict && N(w, v);
      }
      function G(w) {
        w.strict || (w.tagName = w.tagName[w.looseCase]());
        var v = w.tags[w.tags.length - 1] || w, B = w.tag = { name: w.tagName, attributes: {} };
        w.opt.xmlns && (B.ns = v.ns), w.attribList.length = 0, L(w, "onopentagstart", B);
      }
      function V(w, v) {
        var B = w.indexOf(":"), F = B < 0 ? ["", w] : w.split(":"), ce = F[0], he = F[1];
        return v && w === "xmlns" && (ce = "xmlns", he = ""), { prefix: ce, local: he };
      }
      function te(w) {
        if (w.strict || (w.attribName = w.attribName[w.looseCase]()), w.attribList.indexOf(w.attribName) !== -1 || w.tag.attributes.hasOwnProperty(w.attribName)) {
          w.attribName = w.attribValue = "";
          return;
        }
        if (w.opt.xmlns) {
          var v = V(w.attribName, !0), B = v.prefix, F = v.local;
          if (B === "xmlns")
            if (F === "xml" && w.attribValue !== p)
              D(
                w,
                "xml: prefix must be bound to " + p + `
Actual: ` + w.attribValue
              );
            else if (F === "xmlns" && w.attribValue !== g)
              D(
                w,
                "xmlns: prefix must be bound to " + g + `
Actual: ` + w.attribValue
              );
            else {
              var ce = w.tag, he = w.tags[w.tags.length - 1] || w;
              ce.ns === he.ns && (ce.ns = Object.create(he.ns)), ce.ns[F] = w.attribValue;
            }
          w.attribList.push([w.attribName, w.attribValue]);
        } else
          w.tag.attributes[w.attribName] = w.attribValue, L(w, "onattribute", {
            name: w.attribName,
            value: w.attribValue
          });
        w.attribName = w.attribValue = "";
      }
      function de(w, v) {
        if (w.opt.xmlns) {
          var B = w.tag, F = V(w.tagName);
          B.prefix = F.prefix, B.local = F.local, B.uri = B.ns[F.prefix] || "", B.prefix && !B.uri && (D(
            w,
            "Unbound namespace prefix: " + JSON.stringify(w.tagName)
          ), B.uri = F.prefix);
          var ce = w.tags[w.tags.length - 1] || w;
          B.ns && ce.ns !== B.ns && Object.keys(B.ns).forEach(function(t) {
            L(w, "onopennamespace", {
              prefix: t,
              uri: B.ns[t]
            });
          });
          for (var he = 0, pe = w.attribList.length; he < pe; he++) {
            var _e = w.attribList[he], Ee = _e[0], He = _e[1], Re = V(Ee, !0), qe = Re.prefix, lt = Re.local, it = qe === "" ? "" : B.ns[qe] || "", rt = {
              name: Ee,
              value: He,
              prefix: qe,
              local: lt,
              uri: it
            };
            qe && qe !== "xmlns" && !it && (D(
              w,
              "Unbound namespace prefix: " + JSON.stringify(qe)
            ), rt.uri = qe), w.tag.attributes[Ee] = rt, L(w, "onattribute", rt);
          }
          w.attribList.length = 0;
        }
        w.tag.isSelfClosing = !!v, w.sawRoot = !0, w.tags.push(w.tag), L(w, "onopentag", w.tag), v || (!w.noscript && w.tagName.toLowerCase() === "script" ? w.state = E.SCRIPT : w.state = E.TEXT, w.tag = null, w.tagName = ""), w.attribName = w.attribValue = "", w.attribList.length = 0;
      }
      function ie(w) {
        if (!w.tagName) {
          D(w, "Weird empty close tag."), w.textNode += "</>", w.state = E.TEXT;
          return;
        }
        if (w.script) {
          if (w.tagName !== "script") {
            w.script += "</" + w.tagName + ">", w.tagName = "", w.state = E.SCRIPT;
            return;
          }
          L(w, "onscript", w.script), w.script = "";
        }
        var v = w.tags.length, B = w.tagName;
        w.strict || (B = B[w.looseCase]());
        for (var F = B; v--; ) {
          var ce = w.tags[v];
          if (ce.name !== F)
            D(w, "Unexpected close tag");
          else
            break;
        }
        if (v < 0) {
          D(w, "Unmatched closing tag: " + w.tagName), w.textNode += "</" + w.tagName + ">", w.state = E.TEXT;
          return;
        }
        w.tagName = B;
        for (var he = w.tags.length; he-- > v; ) {
          var pe = w.tag = w.tags.pop();
          w.tagName = w.tag.name, L(w, "onclosetag", w.tagName);
          var _e = {};
          for (var Ee in pe.ns)
            _e[Ee] = pe.ns[Ee];
          var He = w.tags[w.tags.length - 1] || w;
          w.opt.xmlns && pe.ns !== He.ns && Object.keys(pe.ns).forEach(function(Re) {
            var qe = pe.ns[Re];
            L(w, "onclosenamespace", { prefix: Re, uri: qe });
          });
        }
        v === 0 && (w.closedRoot = !0), w.tagName = w.attribValue = w.attribName = "", w.attribList.length = 0, w.state = E.TEXT;
      }
      function we(w) {
        var v = w.entity, B = v.toLowerCase(), F, ce = "";
        return w.ENTITIES[v] ? w.ENTITIES[v] : w.ENTITIES[B] ? w.ENTITIES[B] : (v = B, v.charAt(0) === "#" && (v.charAt(1) === "x" ? (v = v.slice(2), F = parseInt(v, 16), ce = F.toString(16)) : (v = v.slice(1), F = parseInt(v, 10), ce = F.toString(10))), v = v.replace(/^0+/, ""), isNaN(F) || ce.toLowerCase() !== v || F < 0 || F > 1114111 ? (D(w, "Invalid character entity"), "&" + w.entity + ";") : String.fromCodePoint(F));
      }
      function ve(w, v) {
        v === "<" ? (w.state = E.OPEN_WAKA, w.startTagPosition = w.position) : O(v) || (D(w, "Non-whitespace before first tag."), w.textNode = v, w.state = E.TEXT);
      }
      function Q(w, v) {
        var B = "";
        return v < w.length && (B = w.charAt(v)), B;
      }
      function ge(w) {
        var v = this;
        if (this.error)
          throw this.error;
        if (v.closed)
          return N(
            v,
            "Cannot write after close. Assign an onready handler."
          );
        if (w === null)
          return j(v);
        typeof w == "object" && (w = w.toString());
        for (var B = 0, F = ""; F = Q(w, B++), v.c = F, !!F; )
          switch (v.trackPosition && (v.position++, F === `
` ? (v.line++, v.column = 0) : v.column++), v.state) {
            case E.BEGIN:
              if (v.state = E.BEGIN_WHITESPACE, F === "\uFEFF")
                continue;
              ve(v, F);
              continue;
            case E.BEGIN_WHITESPACE:
              ve(v, F);
              continue;
            case E.TEXT:
              if (v.sawRoot && !v.closedRoot) {
                for (var he = B - 1; F && F !== "<" && F !== "&"; )
                  F = Q(w, B++), F && v.trackPosition && (v.position++, F === `
` ? (v.line++, v.column = 0) : v.column++);
                v.textNode += w.substring(he, B - 1);
              }
              F === "<" && !(v.sawRoot && v.closedRoot && !v.strict) ? (v.state = E.OPEN_WAKA, v.startTagPosition = v.position) : (!O(F) && (!v.sawRoot || v.closedRoot) && D(v, "Text data outside of root node."), F === "&" ? v.state = E.TEXT_ENTITY : v.textNode += F);
              continue;
            case E.SCRIPT:
              F === "<" ? v.state = E.SCRIPT_ENDING : v.script += F;
              continue;
            case E.SCRIPT_ENDING:
              F === "/" ? v.state = E.CLOSE_TAG : (v.script += "<" + F, v.state = E.SCRIPT);
              continue;
            case E.OPEN_WAKA:
              if (F === "!")
                v.state = E.SGML_DECL, v.sgmlDecl = "";
              else if (!O(F)) if (T(m, F))
                v.state = E.OPEN_TAG, v.tagName = F;
              else if (F === "/")
                v.state = E.CLOSE_TAG, v.tagName = "";
              else if (F === "?")
                v.state = E.PROC_INST, v.procInstName = v.procInstBody = "";
              else {
                if (D(v, "Unencoded <"), v.startTagPosition + 1 < v.position) {
                  var ce = v.position - v.startTagPosition;
                  F = new Array(ce).join(" ") + F;
                }
                v.textNode += "<" + F, v.state = E.TEXT;
              }
              continue;
            case E.SGML_DECL:
              if (v.sgmlDecl + F === "--") {
                v.state = E.COMMENT, v.comment = "", v.sgmlDecl = "";
                continue;
              }
              v.doctype && v.doctype !== !0 && v.sgmlDecl ? (v.state = E.DOCTYPE_DTD, v.doctype += "<!" + v.sgmlDecl + F, v.sgmlDecl = "") : (v.sgmlDecl + F).toUpperCase() === r ? (L(v, "onopencdata"), v.state = E.CDATA, v.sgmlDecl = "", v.cdata = "") : (v.sgmlDecl + F).toUpperCase() === n ? (v.state = E.DOCTYPE, (v.doctype || v.sawRoot) && D(
                v,
                "Inappropriately located doctype declaration"
              ), v.doctype = "", v.sgmlDecl = "") : F === ">" ? (L(v, "onsgmldeclaration", v.sgmlDecl), v.sgmlDecl = "", v.state = E.TEXT) : (b(F) && (v.state = E.SGML_DECL_QUOTED), v.sgmlDecl += F);
              continue;
            case E.SGML_DECL_QUOTED:
              F === v.q && (v.state = E.SGML_DECL, v.q = ""), v.sgmlDecl += F;
              continue;
            case E.DOCTYPE:
              F === ">" ? (v.state = E.TEXT, L(v, "ondoctype", v.doctype), v.doctype = !0) : (v.doctype += F, F === "[" ? v.state = E.DOCTYPE_DTD : b(F) && (v.state = E.DOCTYPE_QUOTED, v.q = F));
              continue;
            case E.DOCTYPE_QUOTED:
              v.doctype += F, F === v.q && (v.q = "", v.state = E.DOCTYPE);
              continue;
            case E.DOCTYPE_DTD:
              F === "]" ? (v.doctype += F, v.state = E.DOCTYPE) : F === "<" ? (v.state = E.OPEN_WAKA, v.startTagPosition = v.position) : b(F) ? (v.doctype += F, v.state = E.DOCTYPE_DTD_QUOTED, v.q = F) : v.doctype += F;
              continue;
            case E.DOCTYPE_DTD_QUOTED:
              v.doctype += F, F === v.q && (v.state = E.DOCTYPE_DTD, v.q = "");
              continue;
            case E.COMMENT:
              F === "-" ? v.state = E.COMMENT_ENDING : v.comment += F;
              continue;
            case E.COMMENT_ENDING:
              F === "-" ? (v.state = E.COMMENT_ENDED, v.comment = x(v.opt, v.comment), v.comment && L(v, "oncomment", v.comment), v.comment = "") : (v.comment += "-" + F, v.state = E.COMMENT);
              continue;
            case E.COMMENT_ENDED:
              F !== ">" ? (D(v, "Malformed comment"), v.comment += "--" + F, v.state = E.COMMENT) : v.doctype && v.doctype !== !0 ? v.state = E.DOCTYPE_DTD : v.state = E.TEXT;
              continue;
            case E.CDATA:
              for (var he = B - 1; F && F !== "]"; )
                F = Q(w, B++), F && v.trackPosition && (v.position++, F === `
` ? (v.line++, v.column = 0) : v.column++);
              v.cdata += w.substring(he, B - 1), F === "]" && (v.state = E.CDATA_ENDING);
              continue;
            case E.CDATA_ENDING:
              F === "]" ? v.state = E.CDATA_ENDING_2 : (v.cdata += "]" + F, v.state = E.CDATA);
              continue;
            case E.CDATA_ENDING_2:
              F === ">" ? (v.cdata && L(v, "oncdata", v.cdata), L(v, "onclosecdata"), v.cdata = "", v.state = E.TEXT) : F === "]" ? v.cdata += "]" : (v.cdata += "]]" + F, v.state = E.CDATA);
              continue;
            case E.PROC_INST:
              F === "?" ? v.state = E.PROC_INST_ENDING : O(F) ? v.state = E.PROC_INST_BODY : v.procInstName += F;
              continue;
            case E.PROC_INST_BODY:
              if (!v.procInstBody && O(F))
                continue;
              F === "?" ? v.state = E.PROC_INST_ENDING : v.procInstBody += F;
              continue;
            case E.PROC_INST_ENDING:
              F === ">" ? (L(v, "onprocessinginstruction", {
                name: v.procInstName,
                body: v.procInstBody
              }), v.procInstName = v.procInstBody = "", v.state = E.TEXT) : (v.procInstBody += "?" + F, v.state = E.PROC_INST_BODY);
              continue;
            case E.OPEN_TAG:
              T(_, F) ? v.tagName += F : (G(v), F === ">" ? de(v) : F === "/" ? v.state = E.OPEN_TAG_SLASH : (O(F) || D(v, "Invalid character in tag name"), v.state = E.ATTRIB));
              continue;
            case E.OPEN_TAG_SLASH:
              F === ">" ? (de(v, !0), ie(v)) : (D(
                v,
                "Forward-slash in opening tag not followed by >"
              ), v.state = E.ATTRIB);
              continue;
            case E.ATTRIB:
              if (O(F))
                continue;
              F === ">" ? de(v) : F === "/" ? v.state = E.OPEN_TAG_SLASH : T(m, F) ? (v.attribName = F, v.attribValue = "", v.state = E.ATTRIB_NAME) : D(v, "Invalid attribute name");
              continue;
            case E.ATTRIB_NAME:
              F === "=" ? v.state = E.ATTRIB_VALUE : F === ">" ? (D(v, "Attribute without value"), v.attribValue = v.attribName, te(v), de(v)) : O(F) ? v.state = E.ATTRIB_NAME_SAW_WHITE : T(_, F) ? v.attribName += F : D(v, "Invalid attribute name");
              continue;
            case E.ATTRIB_NAME_SAW_WHITE:
              if (F === "=")
                v.state = E.ATTRIB_VALUE;
              else {
                if (O(F))
                  continue;
                D(v, "Attribute without value"), v.tag.attributes[v.attribName] = "", v.attribValue = "", L(v, "onattribute", {
                  name: v.attribName,
                  value: ""
                }), v.attribName = "", F === ">" ? de(v) : T(m, F) ? (v.attribName = F, v.state = E.ATTRIB_NAME) : (D(v, "Invalid attribute name"), v.state = E.ATTRIB);
              }
              continue;
            case E.ATTRIB_VALUE:
              if (O(F))
                continue;
              b(F) ? (v.q = F, v.state = E.ATTRIB_VALUE_QUOTED) : (v.opt.unquotedAttributeValues || N(v, "Unquoted attribute value"), v.state = E.ATTRIB_VALUE_UNQUOTED, v.attribValue = F);
              continue;
            case E.ATTRIB_VALUE_QUOTED:
              if (F !== v.q) {
                F === "&" ? v.state = E.ATTRIB_VALUE_ENTITY_Q : v.attribValue += F;
                continue;
              }
              te(v), v.q = "", v.state = E.ATTRIB_VALUE_CLOSED;
              continue;
            case E.ATTRIB_VALUE_CLOSED:
              O(F) ? v.state = E.ATTRIB : F === ">" ? de(v) : F === "/" ? v.state = E.OPEN_TAG_SLASH : T(m, F) ? (D(v, "No whitespace between attributes"), v.attribName = F, v.attribValue = "", v.state = E.ATTRIB_NAME) : D(v, "Invalid attribute name");
              continue;
            case E.ATTRIB_VALUE_UNQUOTED:
              if (!I(F)) {
                F === "&" ? v.state = E.ATTRIB_VALUE_ENTITY_U : v.attribValue += F;
                continue;
              }
              te(v), F === ">" ? de(v) : v.state = E.ATTRIB;
              continue;
            case E.CLOSE_TAG:
              if (v.tagName)
                F === ">" ? ie(v) : T(_, F) ? v.tagName += F : v.script ? (v.script += "</" + v.tagName + F, v.tagName = "", v.state = E.SCRIPT) : (O(F) || D(v, "Invalid tagname in closing tag"), v.state = E.CLOSE_TAG_SAW_WHITE);
              else {
                if (O(F))
                  continue;
                R(m, F) ? v.script ? (v.script += "</" + F, v.state = E.SCRIPT) : D(v, "Invalid tagname in closing tag.") : v.tagName = F;
              }
              continue;
            case E.CLOSE_TAG_SAW_WHITE:
              if (O(F))
                continue;
              F === ">" ? ie(v) : D(v, "Invalid characters in closing tag");
              continue;
            case E.TEXT_ENTITY:
            case E.ATTRIB_VALUE_ENTITY_Q:
            case E.ATTRIB_VALUE_ENTITY_U:
              var pe, _e;
              switch (v.state) {
                case E.TEXT_ENTITY:
                  pe = E.TEXT, _e = "textNode";
                  break;
                case E.ATTRIB_VALUE_ENTITY_Q:
                  pe = E.ATTRIB_VALUE_QUOTED, _e = "attribValue";
                  break;
                case E.ATTRIB_VALUE_ENTITY_U:
                  pe = E.ATTRIB_VALUE_UNQUOTED, _e = "attribValue";
                  break;
              }
              if (F === ";") {
                var Ee = we(v);
                v.opt.unparsedEntities && !Object.values(d.XML_ENTITIES).includes(Ee) ? ((v.entityCount += 1) > v.opt.maxEntityCount && N(
                  v,
                  "Parsed entity count exceeds max entity count"
                ), (v.entityDepth += 1) > v.opt.maxEntityDepth && N(
                  v,
                  "Parsed entity depth exceeds max entity depth"
                ), v.entity = "", v.state = pe, v.write(Ee), v.entityDepth -= 1) : (v[_e] += Ee, v.entity = "", v.state = pe);
              } else T(v.entity.length ? P : A, F) ? v.entity += F : (D(v, "Invalid character in entity name"), v[_e] += "&" + v.entity + F, v.entity = "", v.state = pe);
              continue;
            default:
              throw new Error(v, "Unknown state: " + v.state);
          }
        return v.position >= v.bufferCheckPosition && f(v), v;
      }
      String.fromCodePoint || (function() {
        var w = String.fromCharCode, v = Math.floor, B = function() {
          var F = 16384, ce = [], he, pe, _e = -1, Ee = arguments.length;
          if (!Ee)
            return "";
          for (var He = ""; ++_e < Ee; ) {
            var Re = Number(arguments[_e]);
            if (!isFinite(Re) || // `NaN`, `+Infinity`, or `-Infinity`
            Re < 0 || // not a valid Unicode code point
            Re > 1114111 || // not a valid Unicode code point
            v(Re) !== Re)
              throw RangeError("Invalid code point: " + Re);
            Re <= 65535 ? ce.push(Re) : (Re -= 65536, he = (Re >> 10) + 55296, pe = Re % 1024 + 56320, ce.push(he, pe)), (_e + 1 === Ee || ce.length > F) && (He += w.apply(null, ce), ce.length = 0);
          }
          return He;
        };
        Object.defineProperty ? Object.defineProperty(String, "fromCodePoint", {
          value: B,
          configurable: !0,
          writable: !0
        }) : String.fromCodePoint = B;
      })();
    })(e);
  })(Yn)), Yn;
}
var Mo;
function Tf() {
  if (Mo) return kt;
  Mo = 1, Object.defineProperty(kt, "__esModule", { value: !0 }), kt.XElement = void 0, kt.parseXml = i;
  const e = Af(), d = en();
  class h {
    constructor(o) {
      if (this.name = o, this.value = "", this.attributes = null, this.isCData = !1, this.elements = null, !o)
        throw (0, d.newError)("Element name cannot be empty", "ERR_XML_ELEMENT_NAME_EMPTY");
      if (!f(o))
        throw (0, d.newError)(`Invalid element name: ${o}`, "ERR_XML_ELEMENT_INVALID_NAME");
    }
    attribute(o) {
      const s = this.attributes === null ? null : this.attributes[o];
      if (s == null)
        throw (0, d.newError)(`No attribute "${o}"`, "ERR_XML_MISSED_ATTRIBUTE");
      return s;
    }
    removeAttribute(o) {
      this.attributes !== null && delete this.attributes[o];
    }
    element(o, s = !1, a = null) {
      const r = this.elementOrNull(o, s);
      if (r === null)
        throw (0, d.newError)(a || `No element "${o}"`, "ERR_XML_MISSED_ELEMENT");
      return r;
    }
    elementOrNull(o, s = !1) {
      if (this.elements === null)
        return null;
      for (const a of this.elements)
        if (l(a, o, s))
          return a;
      return null;
    }
    getElements(o, s = !1) {
      return this.elements === null ? [] : this.elements.filter((a) => l(a, o, s));
    }
    elementValueOrEmpty(o, s = !1) {
      const a = this.elementOrNull(o, s);
      return a === null ? "" : a.value;
    }
  }
  kt.XElement = h;
  const c = new RegExp(/^[A-Za-z_][:A-Za-z0-9_-]*$/i);
  function f(u) {
    return c.test(u);
  }
  function l(u, o, s) {
    const a = u.name;
    return a === o || s === !0 && a.length === o.length && a.toLowerCase() === o.toLowerCase();
  }
  function i(u) {
    let o = null;
    const s = e.parser(!0, {}), a = [];
    return s.onopentag = (r) => {
      const n = new h(r.name);
      if (n.attributes = r.attributes, o === null)
        o = n;
      else {
        const p = a[a.length - 1];
        p.elements == null && (p.elements = []), p.elements.push(n);
      }
      a.push(n);
    }, s.onclosetag = () => {
      a.pop();
    }, s.ontext = (r) => {
      a.length > 0 && (a[a.length - 1].value = r);
    }, s.oncdata = (r) => {
      const n = a[a.length - 1];
      n.value = r, n.isCData = !0;
    }, s.onerror = (r) => {
      throw r;
    }, s.write(u), o;
  }
  return kt;
}
var Bo;
function xe() {
  return Bo || (Bo = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.CURRENT_APP_PACKAGE_FILE_NAME = e.CURRENT_APP_INSTALLER_FILE_NAME = e.XElement = e.parseXml = e.UUID = e.parseDn = e.retry = e.githubTagPrefix = e.githubUrl = e.getS3LikeProviderBaseUrl = e.ProgressCallbackTransform = e.MemoLazy = e.safeStringifyJson = e.safeGetHeader = e.parseJson = e.HttpExecutor = e.HttpError = e.DigestTransform = e.createHttpError = e.configureRequestUrl = e.configureRequestOptionsFromUrl = e.configureRequestOptions = e.newError = e.CancellationToken = e.CancellationError = void 0, e.asArray = r;
    var d = Ea();
    Object.defineProperty(e, "CancellationError", { enumerable: !0, get: function() {
      return d.CancellationError;
    } }), Object.defineProperty(e, "CancellationToken", { enumerable: !0, get: function() {
      return d.CancellationToken;
    } });
    var h = en();
    Object.defineProperty(e, "newError", { enumerable: !0, get: function() {
      return h.newError;
    } });
    var c = Ef();
    Object.defineProperty(e, "configureRequestOptions", { enumerable: !0, get: function() {
      return c.configureRequestOptions;
    } }), Object.defineProperty(e, "configureRequestOptionsFromUrl", { enumerable: !0, get: function() {
      return c.configureRequestOptionsFromUrl;
    } }), Object.defineProperty(e, "configureRequestUrl", { enumerable: !0, get: function() {
      return c.configureRequestUrl;
    } }), Object.defineProperty(e, "createHttpError", { enumerable: !0, get: function() {
      return c.createHttpError;
    } }), Object.defineProperty(e, "DigestTransform", { enumerable: !0, get: function() {
      return c.DigestTransform;
    } }), Object.defineProperty(e, "HttpError", { enumerable: !0, get: function() {
      return c.HttpError;
    } }), Object.defineProperty(e, "HttpExecutor", { enumerable: !0, get: function() {
      return c.HttpExecutor;
    } }), Object.defineProperty(e, "parseJson", { enumerable: !0, get: function() {
      return c.parseJson;
    } }), Object.defineProperty(e, "safeGetHeader", { enumerable: !0, get: function() {
      return c.safeGetHeader;
    } }), Object.defineProperty(e, "safeStringifyJson", { enumerable: !0, get: function() {
      return c.safeStringifyJson;
    } });
    var f = yf();
    Object.defineProperty(e, "MemoLazy", { enumerable: !0, get: function() {
      return f.MemoLazy;
    } });
    var l = tu();
    Object.defineProperty(e, "ProgressCallbackTransform", { enumerable: !0, get: function() {
      return l.ProgressCallbackTransform;
    } });
    var i = wf();
    Object.defineProperty(e, "getS3LikeProviderBaseUrl", { enumerable: !0, get: function() {
      return i.getS3LikeProviderBaseUrl;
    } }), Object.defineProperty(e, "githubUrl", { enumerable: !0, get: function() {
      return i.githubUrl;
    } }), Object.defineProperty(e, "githubTagPrefix", { enumerable: !0, get: function() {
      return i.githubTagPrefix;
    } });
    var u = _f();
    Object.defineProperty(e, "retry", { enumerable: !0, get: function() {
      return u.retry;
    } });
    var o = Sf();
    Object.defineProperty(e, "parseDn", { enumerable: !0, get: function() {
      return o.parseDn;
    } });
    var s = Rf();
    Object.defineProperty(e, "UUID", { enumerable: !0, get: function() {
      return s.UUID;
    } });
    var a = Tf();
    Object.defineProperty(e, "parseXml", { enumerable: !0, get: function() {
      return a.parseXml;
    } }), Object.defineProperty(e, "XElement", { enumerable: !0, get: function() {
      return a.XElement;
    } }), e.CURRENT_APP_INSTALLER_FILE_NAME = "installer.exe", e.CURRENT_APP_PACKAGE_FILE_NAME = "package.7z";
    function r(n) {
      return n == null ? [] : Array.isArray(n) ? n : [n];
    }
  })(Hn)), Hn;
}
var $e = {}, jr = {}, dt = {}, Ho;
function Tr() {
  if (Ho) return dt;
  Ho = 1;
  function e(i) {
    return typeof i > "u" || i === null;
  }
  function d(i) {
    return typeof i == "object" && i !== null;
  }
  function h(i) {
    return Array.isArray(i) ? i : e(i) ? [] : [i];
  }
  function c(i, u) {
    var o, s, a, r;
    if (u)
      for (r = Object.keys(u), o = 0, s = r.length; o < s; o += 1)
        a = r[o], i[a] = u[a];
    return i;
  }
  function f(i, u) {
    var o = "", s;
    for (s = 0; s < u; s += 1)
      o += i;
    return o;
  }
  function l(i) {
    return i === 0 && Number.NEGATIVE_INFINITY === 1 / i;
  }
  return dt.isNothing = e, dt.isObject = d, dt.toArray = h, dt.repeat = f, dt.isNegativeZero = l, dt.extend = c, dt;
}
var zn, jo;
function Cr() {
  if (jo) return zn;
  jo = 1;
  function e(h, c) {
    var f = "", l = h.reason || "(unknown reason)";
    return h.mark ? (h.mark.name && (f += 'in "' + h.mark.name + '" '), f += "(" + (h.mark.line + 1) + ":" + (h.mark.column + 1) + ")", !c && h.mark.snippet && (f += `

` + h.mark.snippet), l + " " + f) : l;
  }
  function d(h, c) {
    Error.call(this), this.name = "YAMLException", this.reason = h, this.mark = c, this.message = e(this, !1), Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = new Error().stack || "";
  }
  return d.prototype = Object.create(Error.prototype), d.prototype.constructor = d, d.prototype.toString = function(c) {
    return this.name + ": " + e(this, c);
  }, zn = d, zn;
}
var Xn, Go;
function Cf() {
  if (Go) return Xn;
  Go = 1;
  var e = Tr();
  function d(f, l, i, u, o) {
    var s = "", a = "", r = Math.floor(o / 2) - 1;
    return u - l > r && (s = " ... ", l = u - r + s.length), i - u > r && (a = " ...", i = u + r - a.length), {
      str: s + f.slice(l, i).replace(/\t/g, "→") + a,
      pos: u - l + s.length
      // relative position
    };
  }
  function h(f, l) {
    return e.repeat(" ", l - f.length) + f;
  }
  function c(f, l) {
    if (l = Object.create(l || null), !f.buffer) return null;
    l.maxLength || (l.maxLength = 79), typeof l.indent != "number" && (l.indent = 1), typeof l.linesBefore != "number" && (l.linesBefore = 3), typeof l.linesAfter != "number" && (l.linesAfter = 2);
    for (var i = /\r?\n|\r|\0/g, u = [0], o = [], s, a = -1; s = i.exec(f.buffer); )
      o.push(s.index), u.push(s.index + s[0].length), f.position <= s.index && a < 0 && (a = u.length - 2);
    a < 0 && (a = u.length - 1);
    var r = "", n, p, g = Math.min(f.line + l.linesAfter, o.length).toString().length, y = l.maxLength - (l.indent + g + 3);
    for (n = 1; n <= l.linesBefore && !(a - n < 0); n++)
      p = d(
        f.buffer,
        u[a - n],
        o[a - n],
        f.position - (u[a] - u[a - n]),
        y
      ), r = e.repeat(" ", l.indent) + h((f.line - n + 1).toString(), g) + " | " + p.str + `
` + r;
    for (p = d(f.buffer, u[a], o[a], f.position, y), r += e.repeat(" ", l.indent) + h((f.line + 1).toString(), g) + " | " + p.str + `
`, r += e.repeat("-", l.indent + g + 3 + p.pos) + `^
`, n = 1; n <= l.linesAfter && !(a + n >= o.length); n++)
      p = d(
        f.buffer,
        u[a + n],
        o[a + n],
        f.position - (u[a] - u[a + n]),
        y
      ), r += e.repeat(" ", l.indent) + h((f.line + n + 1).toString(), g) + " | " + p.str + `
`;
    return r.replace(/\n$/, "");
  }
  return Xn = c, Xn;
}
var Jn, Wo;
function Me() {
  if (Wo) return Jn;
  Wo = 1;
  var e = Cr(), d = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ], h = [
    "scalar",
    "sequence",
    "mapping"
  ];
  function c(l) {
    var i = {};
    return l !== null && Object.keys(l).forEach(function(u) {
      l[u].forEach(function(o) {
        i[String(o)] = u;
      });
    }), i;
  }
  function f(l, i) {
    if (i = i || {}, Object.keys(i).forEach(function(u) {
      if (d.indexOf(u) === -1)
        throw new e('Unknown option "' + u + '" is met in definition of "' + l + '" YAML type.');
    }), this.options = i, this.tag = l, this.kind = i.kind || null, this.resolve = i.resolve || function() {
      return !0;
    }, this.construct = i.construct || function(u) {
      return u;
    }, this.instanceOf = i.instanceOf || null, this.predicate = i.predicate || null, this.represent = i.represent || null, this.representName = i.representName || null, this.defaultStyle = i.defaultStyle || null, this.multi = i.multi || !1, this.styleAliases = c(i.styleAliases || null), h.indexOf(this.kind) === -1)
      throw new e('Unknown kind "' + this.kind + '" is specified for "' + l + '" YAML type.');
  }
  return Jn = f, Jn;
}
var Kn, Vo;
function ru() {
  if (Vo) return Kn;
  Vo = 1;
  var e = Cr(), d = Me();
  function h(l, i) {
    var u = [];
    return l[i].forEach(function(o) {
      var s = u.length;
      u.forEach(function(a, r) {
        a.tag === o.tag && a.kind === o.kind && a.multi === o.multi && (s = r);
      }), u[s] = o;
    }), u;
  }
  function c() {
    var l = {
      scalar: {},
      sequence: {},
      mapping: {},
      fallback: {},
      multi: {
        scalar: [],
        sequence: [],
        mapping: [],
        fallback: []
      }
    }, i, u;
    function o(s) {
      s.multi ? (l.multi[s.kind].push(s), l.multi.fallback.push(s)) : l[s.kind][s.tag] = l.fallback[s.tag] = s;
    }
    for (i = 0, u = arguments.length; i < u; i += 1)
      arguments[i].forEach(o);
    return l;
  }
  function f(l) {
    return this.extend(l);
  }
  return f.prototype.extend = function(i) {
    var u = [], o = [];
    if (i instanceof d)
      o.push(i);
    else if (Array.isArray(i))
      o = o.concat(i);
    else if (i && (Array.isArray(i.implicit) || Array.isArray(i.explicit)))
      i.implicit && (u = u.concat(i.implicit)), i.explicit && (o = o.concat(i.explicit));
    else
      throw new e("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
    u.forEach(function(a) {
      if (!(a instanceof d))
        throw new e("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      if (a.loadKind && a.loadKind !== "scalar")
        throw new e("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      if (a.multi)
        throw new e("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }), o.forEach(function(a) {
      if (!(a instanceof d))
        throw new e("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    });
    var s = Object.create(f.prototype);
    return s.implicit = (this.implicit || []).concat(u), s.explicit = (this.explicit || []).concat(o), s.compiledImplicit = h(s, "implicit"), s.compiledExplicit = h(s, "explicit"), s.compiledTypeMap = c(s.compiledImplicit, s.compiledExplicit), s;
  }, Kn = f, Kn;
}
var Qn, Yo;
function nu() {
  if (Yo) return Qn;
  Yo = 1;
  var e = Me();
  return Qn = new e("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(d) {
      return d !== null ? d : "";
    }
  }), Qn;
}
var Zn, zo;
function iu() {
  if (zo) return Zn;
  zo = 1;
  var e = Me();
  return Zn = new e("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(d) {
      return d !== null ? d : [];
    }
  }), Zn;
}
var ei, Xo;
function au() {
  if (Xo) return ei;
  Xo = 1;
  var e = Me();
  return ei = new e("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(d) {
      return d !== null ? d : {};
    }
  }), ei;
}
var ti, Jo;
function ou() {
  if (Jo) return ti;
  Jo = 1;
  var e = ru();
  return ti = new e({
    explicit: [
      nu(),
      iu(),
      au()
    ]
  }), ti;
}
var ri, Ko;
function su() {
  if (Ko) return ri;
  Ko = 1;
  var e = Me();
  function d(f) {
    if (f === null) return !0;
    var l = f.length;
    return l === 1 && f === "~" || l === 4 && (f === "null" || f === "Null" || f === "NULL");
  }
  function h() {
    return null;
  }
  function c(f) {
    return f === null;
  }
  return ri = new e("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: d,
    construct: h,
    predicate: c,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  }), ri;
}
var ni, Qo;
function lu() {
  if (Qo) return ni;
  Qo = 1;
  var e = Me();
  function d(f) {
    if (f === null) return !1;
    var l = f.length;
    return l === 4 && (f === "true" || f === "True" || f === "TRUE") || l === 5 && (f === "false" || f === "False" || f === "FALSE");
  }
  function h(f) {
    return f === "true" || f === "True" || f === "TRUE";
  }
  function c(f) {
    return Object.prototype.toString.call(f) === "[object Boolean]";
  }
  return ni = new e("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: d,
    construct: h,
    predicate: c,
    represent: {
      lowercase: function(f) {
        return f ? "true" : "false";
      },
      uppercase: function(f) {
        return f ? "TRUE" : "FALSE";
      },
      camelcase: function(f) {
        return f ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  }), ni;
}
var ii, Zo;
function uu() {
  if (Zo) return ii;
  Zo = 1;
  var e = Tr(), d = Me();
  function h(o) {
    return 48 <= o && o <= 57 || 65 <= o && o <= 70 || 97 <= o && o <= 102;
  }
  function c(o) {
    return 48 <= o && o <= 55;
  }
  function f(o) {
    return 48 <= o && o <= 57;
  }
  function l(o) {
    if (o === null) return !1;
    var s = o.length, a = 0, r = !1, n;
    if (!s) return !1;
    if (n = o[a], (n === "-" || n === "+") && (n = o[++a]), n === "0") {
      if (a + 1 === s) return !0;
      if (n = o[++a], n === "b") {
        for (a++; a < s; a++)
          if (n = o[a], n !== "_") {
            if (n !== "0" && n !== "1") return !1;
            r = !0;
          }
        return r && n !== "_";
      }
      if (n === "x") {
        for (a++; a < s; a++)
          if (n = o[a], n !== "_") {
            if (!h(o.charCodeAt(a))) return !1;
            r = !0;
          }
        return r && n !== "_";
      }
      if (n === "o") {
        for (a++; a < s; a++)
          if (n = o[a], n !== "_") {
            if (!c(o.charCodeAt(a))) return !1;
            r = !0;
          }
        return r && n !== "_";
      }
    }
    if (n === "_") return !1;
    for (; a < s; a++)
      if (n = o[a], n !== "_") {
        if (!f(o.charCodeAt(a)))
          return !1;
        r = !0;
      }
    return !(!r || n === "_");
  }
  function i(o) {
    var s = o, a = 1, r;
    if (s.indexOf("_") !== -1 && (s = s.replace(/_/g, "")), r = s[0], (r === "-" || r === "+") && (r === "-" && (a = -1), s = s.slice(1), r = s[0]), s === "0") return 0;
    if (r === "0") {
      if (s[1] === "b") return a * parseInt(s.slice(2), 2);
      if (s[1] === "x") return a * parseInt(s.slice(2), 16);
      if (s[1] === "o") return a * parseInt(s.slice(2), 8);
    }
    return a * parseInt(s, 10);
  }
  function u(o) {
    return Object.prototype.toString.call(o) === "[object Number]" && o % 1 === 0 && !e.isNegativeZero(o);
  }
  return ii = new d("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: l,
    construct: i,
    predicate: u,
    represent: {
      binary: function(o) {
        return o >= 0 ? "0b" + o.toString(2) : "-0b" + o.toString(2).slice(1);
      },
      octal: function(o) {
        return o >= 0 ? "0o" + o.toString(8) : "-0o" + o.toString(8).slice(1);
      },
      decimal: function(o) {
        return o.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function(o) {
        return o >= 0 ? "0x" + o.toString(16).toUpperCase() : "-0x" + o.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  }), ii;
}
var ai, es;
function cu() {
  if (es) return ai;
  es = 1;
  var e = Tr(), d = Me(), h = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
  );
  function c(o) {
    return !(o === null || !h.test(o) || // Quick hack to not allow integers end with `_`
    // Probably should update regexp & check speed
    o[o.length - 1] === "_");
  }
  function f(o) {
    var s, a;
    return s = o.replace(/_/g, "").toLowerCase(), a = s[0] === "-" ? -1 : 1, "+-".indexOf(s[0]) >= 0 && (s = s.slice(1)), s === ".inf" ? a === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : s === ".nan" ? NaN : a * parseFloat(s, 10);
  }
  var l = /^[-+]?[0-9]+e/;
  function i(o, s) {
    var a;
    if (isNaN(o))
      switch (s) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    else if (Number.POSITIVE_INFINITY === o)
      switch (s) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    else if (Number.NEGATIVE_INFINITY === o)
      switch (s) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    else if (e.isNegativeZero(o))
      return "-0.0";
    return a = o.toString(10), l.test(a) ? a.replace("e", ".e") : a;
  }
  function u(o) {
    return Object.prototype.toString.call(o) === "[object Number]" && (o % 1 !== 0 || e.isNegativeZero(o));
  }
  return ai = new d("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: c,
    construct: f,
    predicate: u,
    represent: i,
    defaultStyle: "lowercase"
  }), ai;
}
var oi, ts;
function fu() {
  return ts || (ts = 1, oi = ou().extend({
    implicit: [
      su(),
      lu(),
      uu(),
      cu()
    ]
  })), oi;
}
var si, rs;
function du() {
  return rs || (rs = 1, si = fu()), si;
}
var li, ns;
function hu() {
  if (ns) return li;
  ns = 1;
  var e = Me(), d = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
  ), h = new RegExp(
    "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
  );
  function c(i) {
    return i === null ? !1 : d.exec(i) !== null || h.exec(i) !== null;
  }
  function f(i) {
    var u, o, s, a, r, n, p, g = 0, y = null, m, _, A;
    if (u = d.exec(i), u === null && (u = h.exec(i)), u === null) throw new Error("Date resolve error");
    if (o = +u[1], s = +u[2] - 1, a = +u[3], !u[4])
      return new Date(Date.UTC(o, s, a));
    if (r = +u[4], n = +u[5], p = +u[6], u[7]) {
      for (g = u[7].slice(0, 3); g.length < 3; )
        g += "0";
      g = +g;
    }
    return u[9] && (m = +u[10], _ = +(u[11] || 0), y = (m * 60 + _) * 6e4, u[9] === "-" && (y = -y)), A = new Date(Date.UTC(o, s, a, r, n, p, g)), y && A.setTime(A.getTime() - y), A;
  }
  function l(i) {
    return i.toISOString();
  }
  return li = new e("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: c,
    construct: f,
    instanceOf: Date,
    represent: l
  }), li;
}
var ui, is;
function pu() {
  if (is) return ui;
  is = 1;
  var e = Me();
  function d(h) {
    return h === "<<" || h === null;
  }
  return ui = new e("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: d
  }), ui;
}
var ci, as;
function mu() {
  if (as) return ci;
  as = 1;
  var e = Me(), d = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`;
  function h(i) {
    if (i === null) return !1;
    var u, o, s = 0, a = i.length, r = d;
    for (o = 0; o < a; o++)
      if (u = r.indexOf(i.charAt(o)), !(u > 64)) {
        if (u < 0) return !1;
        s += 6;
      }
    return s % 8 === 0;
  }
  function c(i) {
    var u, o, s = i.replace(/[\r\n=]/g, ""), a = s.length, r = d, n = 0, p = [];
    for (u = 0; u < a; u++)
      u % 4 === 0 && u && (p.push(n >> 16 & 255), p.push(n >> 8 & 255), p.push(n & 255)), n = n << 6 | r.indexOf(s.charAt(u));
    return o = a % 4 * 6, o === 0 ? (p.push(n >> 16 & 255), p.push(n >> 8 & 255), p.push(n & 255)) : o === 18 ? (p.push(n >> 10 & 255), p.push(n >> 2 & 255)) : o === 12 && p.push(n >> 4 & 255), new Uint8Array(p);
  }
  function f(i) {
    var u = "", o = 0, s, a, r = i.length, n = d;
    for (s = 0; s < r; s++)
      s % 3 === 0 && s && (u += n[o >> 18 & 63], u += n[o >> 12 & 63], u += n[o >> 6 & 63], u += n[o & 63]), o = (o << 8) + i[s];
    return a = r % 3, a === 0 ? (u += n[o >> 18 & 63], u += n[o >> 12 & 63], u += n[o >> 6 & 63], u += n[o & 63]) : a === 2 ? (u += n[o >> 10 & 63], u += n[o >> 4 & 63], u += n[o << 2 & 63], u += n[64]) : a === 1 && (u += n[o >> 2 & 63], u += n[o << 4 & 63], u += n[64], u += n[64]), u;
  }
  function l(i) {
    return Object.prototype.toString.call(i) === "[object Uint8Array]";
  }
  return ci = new e("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: h,
    construct: c,
    predicate: l,
    represent: f
  }), ci;
}
var fi, os;
function gu() {
  if (os) return fi;
  os = 1;
  var e = Me(), d = Object.prototype.hasOwnProperty, h = Object.prototype.toString;
  function c(l) {
    if (l === null) return !0;
    var i = [], u, o, s, a, r, n = l;
    for (u = 0, o = n.length; u < o; u += 1) {
      if (s = n[u], r = !1, h.call(s) !== "[object Object]") return !1;
      for (a in s)
        if (d.call(s, a))
          if (!r) r = !0;
          else return !1;
      if (!r) return !1;
      if (i.indexOf(a) === -1) i.push(a);
      else return !1;
    }
    return !0;
  }
  function f(l) {
    return l !== null ? l : [];
  }
  return fi = new e("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: c,
    construct: f
  }), fi;
}
var di, ss;
function vu() {
  if (ss) return di;
  ss = 1;
  var e = Me(), d = Object.prototype.toString;
  function h(f) {
    if (f === null) return !0;
    var l, i, u, o, s, a = f;
    for (s = new Array(a.length), l = 0, i = a.length; l < i; l += 1) {
      if (u = a[l], d.call(u) !== "[object Object]" || (o = Object.keys(u), o.length !== 1)) return !1;
      s[l] = [o[0], u[o[0]]];
    }
    return !0;
  }
  function c(f) {
    if (f === null) return [];
    var l, i, u, o, s, a = f;
    for (s = new Array(a.length), l = 0, i = a.length; l < i; l += 1)
      u = a[l], o = Object.keys(u), s[l] = [o[0], u[o[0]]];
    return s;
  }
  return di = new e("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: h,
    construct: c
  }), di;
}
var hi, ls;
function Eu() {
  if (ls) return hi;
  ls = 1;
  var e = Me(), d = Object.prototype.hasOwnProperty;
  function h(f) {
    if (f === null) return !0;
    var l, i = f;
    for (l in i)
      if (d.call(i, l) && i[l] !== null)
        return !1;
    return !0;
  }
  function c(f) {
    return f !== null ? f : {};
  }
  return hi = new e("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: h,
    construct: c
  }), hi;
}
var pi, us;
function ya() {
  return us || (us = 1, pi = du().extend({
    implicit: [
      hu(),
      pu()
    ],
    explicit: [
      mu(),
      gu(),
      vu(),
      Eu()
    ]
  })), pi;
}
var cs;
function bf() {
  if (cs) return jr;
  cs = 1;
  var e = Tr(), d = Cr(), h = Cf(), c = ya(), f = Object.prototype.hasOwnProperty, l = 1, i = 2, u = 3, o = 4, s = 1, a = 2, r = 3, n = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, p = /[\x85\u2028\u2029]/, g = /[,\[\]\{\}]/, y = /^(?:!|!!|![a-z\-]+!)$/i, m = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  function _(t) {
    return Object.prototype.toString.call(t);
  }
  function A(t) {
    return t === 10 || t === 13;
  }
  function P(t) {
    return t === 9 || t === 32;
  }
  function O(t) {
    return t === 9 || t === 32 || t === 10 || t === 13;
  }
  function b(t) {
    return t === 44 || t === 91 || t === 93 || t === 123 || t === 125;
  }
  function I(t) {
    var H;
    return 48 <= t && t <= 57 ? t - 48 : (H = t | 32, 97 <= H && H <= 102 ? H - 97 + 10 : -1);
  }
  function T(t) {
    return t === 120 ? 2 : t === 117 ? 4 : t === 85 ? 8 : 0;
  }
  function R(t) {
    return 48 <= t && t <= 57 ? t - 48 : -1;
  }
  function E(t) {
    return t === 48 ? "\0" : t === 97 ? "\x07" : t === 98 ? "\b" : t === 116 || t === 9 ? "	" : t === 110 ? `
` : t === 118 ? "\v" : t === 102 ? "\f" : t === 114 ? "\r" : t === 101 ? "\x1B" : t === 32 ? " " : t === 34 ? '"' : t === 47 ? "/" : t === 92 ? "\\" : t === 78 ? "" : t === 95 ? " " : t === 76 ? "\u2028" : t === 80 ? "\u2029" : "";
  }
  function k(t) {
    return t <= 65535 ? String.fromCharCode(t) : String.fromCharCode(
      (t - 65536 >> 10) + 55296,
      (t - 65536 & 1023) + 56320
    );
  }
  function $(t, H, W) {
    H === "__proto__" ? Object.defineProperty(t, H, {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: W
    }) : t[H] = W;
  }
  for (var L = new Array(256), q = new Array(256), x = 0; x < 256; x++)
    L[x] = E(x) ? 1 : 0, q[x] = E(x);
  function N(t, H) {
    this.input = t, this.filename = H.filename || null, this.schema = H.schema || c, this.onWarning = H.onWarning || null, this.legacy = H.legacy || !1, this.json = H.json || !1, this.listener = H.listener || null, this.implicitTypes = this.schema.compiledImplicit, this.typeMap = this.schema.compiledTypeMap, this.length = t.length, this.position = 0, this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.firstTabInLine = -1, this.documents = [];
  }
  function j(t, H) {
    var W = {
      name: t.filename,
      buffer: t.input.slice(0, -1),
      // omit trailing \0
      position: t.position,
      line: t.line,
      column: t.position - t.lineStart
    };
    return W.snippet = h(W), new d(H, W);
  }
  function D(t, H) {
    throw j(t, H);
  }
  function G(t, H) {
    t.onWarning && t.onWarning.call(null, j(t, H));
  }
  var V = {
    YAML: function(H, W, ne) {
      var Y, re, Z;
      H.version !== null && D(H, "duplication of %YAML directive"), ne.length !== 1 && D(H, "YAML directive accepts exactly one argument"), Y = /^([0-9]+)\.([0-9]+)$/.exec(ne[0]), Y === null && D(H, "ill-formed argument of the YAML directive"), re = parseInt(Y[1], 10), Z = parseInt(Y[2], 10), re !== 1 && D(H, "unacceptable YAML version of the document"), H.version = ne[0], H.checkLineBreaks = Z < 2, Z !== 1 && Z !== 2 && G(H, "unsupported YAML version of the document");
    },
    TAG: function(H, W, ne) {
      var Y, re;
      ne.length !== 2 && D(H, "TAG directive accepts exactly two arguments"), Y = ne[0], re = ne[1], y.test(Y) || D(H, "ill-formed tag handle (first argument) of the TAG directive"), f.call(H.tagMap, Y) && D(H, 'there is a previously declared suffix for "' + Y + '" tag handle'), m.test(re) || D(H, "ill-formed tag prefix (second argument) of the TAG directive");
      try {
        re = decodeURIComponent(re);
      } catch {
        D(H, "tag prefix is malformed: " + re);
      }
      H.tagMap[Y] = re;
    }
  };
  function te(t, H, W, ne) {
    var Y, re, Z, oe;
    if (H < W) {
      if (oe = t.input.slice(H, W), ne)
        for (Y = 0, re = oe.length; Y < re; Y += 1)
          Z = oe.charCodeAt(Y), Z === 9 || 32 <= Z && Z <= 1114111 || D(t, "expected valid JSON character");
      else n.test(oe) && D(t, "the stream contains non-printable characters");
      t.result += oe;
    }
  }
  function de(t, H, W, ne) {
    var Y, re, Z, oe;
    for (e.isObject(W) || D(t, "cannot merge mappings; the provided source object is unacceptable"), Y = Object.keys(W), Z = 0, oe = Y.length; Z < oe; Z += 1)
      re = Y[Z], f.call(H, re) || ($(H, re, W[re]), ne[re] = !0);
  }
  function ie(t, H, W, ne, Y, re, Z, oe, ue) {
    var Ae, Te;
    if (Array.isArray(Y))
      for (Y = Array.prototype.slice.call(Y), Ae = 0, Te = Y.length; Ae < Te; Ae += 1)
        Array.isArray(Y[Ae]) && D(t, "nested arrays are not supported inside keys"), typeof Y == "object" && _(Y[Ae]) === "[object Object]" && (Y[Ae] = "[object Object]");
    if (typeof Y == "object" && _(Y) === "[object Object]" && (Y = "[object Object]"), Y = String(Y), H === null && (H = {}), ne === "tag:yaml.org,2002:merge")
      if (Array.isArray(re))
        for (Ae = 0, Te = re.length; Ae < Te; Ae += 1)
          de(t, H, re[Ae], W);
      else
        de(t, H, re, W);
    else
      !t.json && !f.call(W, Y) && f.call(H, Y) && (t.line = Z || t.line, t.lineStart = oe || t.lineStart, t.position = ue || t.position, D(t, "duplicated mapping key")), $(H, Y, re), delete W[Y];
    return H;
  }
  function we(t) {
    var H;
    H = t.input.charCodeAt(t.position), H === 10 ? t.position++ : H === 13 ? (t.position++, t.input.charCodeAt(t.position) === 10 && t.position++) : D(t, "a line break is expected"), t.line += 1, t.lineStart = t.position, t.firstTabInLine = -1;
  }
  function ve(t, H, W) {
    for (var ne = 0, Y = t.input.charCodeAt(t.position); Y !== 0; ) {
      for (; P(Y); )
        Y === 9 && t.firstTabInLine === -1 && (t.firstTabInLine = t.position), Y = t.input.charCodeAt(++t.position);
      if (H && Y === 35)
        do
          Y = t.input.charCodeAt(++t.position);
        while (Y !== 10 && Y !== 13 && Y !== 0);
      if (A(Y))
        for (we(t), Y = t.input.charCodeAt(t.position), ne++, t.lineIndent = 0; Y === 32; )
          t.lineIndent++, Y = t.input.charCodeAt(++t.position);
      else
        break;
    }
    return W !== -1 && ne !== 0 && t.lineIndent < W && G(t, "deficient indentation"), ne;
  }
  function Q(t) {
    var H = t.position, W;
    return W = t.input.charCodeAt(H), !!((W === 45 || W === 46) && W === t.input.charCodeAt(H + 1) && W === t.input.charCodeAt(H + 2) && (H += 3, W = t.input.charCodeAt(H), W === 0 || O(W)));
  }
  function ge(t, H) {
    H === 1 ? t.result += " " : H > 1 && (t.result += e.repeat(`
`, H - 1));
  }
  function w(t, H, W) {
    var ne, Y, re, Z, oe, ue, Ae, Te, me = t.kind, S = t.result, M;
    if (M = t.input.charCodeAt(t.position), O(M) || b(M) || M === 35 || M === 38 || M === 42 || M === 33 || M === 124 || M === 62 || M === 39 || M === 34 || M === 37 || M === 64 || M === 96 || (M === 63 || M === 45) && (Y = t.input.charCodeAt(t.position + 1), O(Y) || W && b(Y)))
      return !1;
    for (t.kind = "scalar", t.result = "", re = Z = t.position, oe = !1; M !== 0; ) {
      if (M === 58) {
        if (Y = t.input.charCodeAt(t.position + 1), O(Y) || W && b(Y))
          break;
      } else if (M === 35) {
        if (ne = t.input.charCodeAt(t.position - 1), O(ne))
          break;
      } else {
        if (t.position === t.lineStart && Q(t) || W && b(M))
          break;
        if (A(M))
          if (ue = t.line, Ae = t.lineStart, Te = t.lineIndent, ve(t, !1, -1), t.lineIndent >= H) {
            oe = !0, M = t.input.charCodeAt(t.position);
            continue;
          } else {
            t.position = Z, t.line = ue, t.lineStart = Ae, t.lineIndent = Te;
            break;
          }
      }
      oe && (te(t, re, Z, !1), ge(t, t.line - ue), re = Z = t.position, oe = !1), P(M) || (Z = t.position + 1), M = t.input.charCodeAt(++t.position);
    }
    return te(t, re, Z, !1), t.result ? !0 : (t.kind = me, t.result = S, !1);
  }
  function v(t, H) {
    var W, ne, Y;
    if (W = t.input.charCodeAt(t.position), W !== 39)
      return !1;
    for (t.kind = "scalar", t.result = "", t.position++, ne = Y = t.position; (W = t.input.charCodeAt(t.position)) !== 0; )
      if (W === 39)
        if (te(t, ne, t.position, !0), W = t.input.charCodeAt(++t.position), W === 39)
          ne = t.position, t.position++, Y = t.position;
        else
          return !0;
      else A(W) ? (te(t, ne, Y, !0), ge(t, ve(t, !1, H)), ne = Y = t.position) : t.position === t.lineStart && Q(t) ? D(t, "unexpected end of the document within a single quoted scalar") : (t.position++, Y = t.position);
    D(t, "unexpected end of the stream within a single quoted scalar");
  }
  function B(t, H) {
    var W, ne, Y, re, Z, oe;
    if (oe = t.input.charCodeAt(t.position), oe !== 34)
      return !1;
    for (t.kind = "scalar", t.result = "", t.position++, W = ne = t.position; (oe = t.input.charCodeAt(t.position)) !== 0; ) {
      if (oe === 34)
        return te(t, W, t.position, !0), t.position++, !0;
      if (oe === 92) {
        if (te(t, W, t.position, !0), oe = t.input.charCodeAt(++t.position), A(oe))
          ve(t, !1, H);
        else if (oe < 256 && L[oe])
          t.result += q[oe], t.position++;
        else if ((Z = T(oe)) > 0) {
          for (Y = Z, re = 0; Y > 0; Y--)
            oe = t.input.charCodeAt(++t.position), (Z = I(oe)) >= 0 ? re = (re << 4) + Z : D(t, "expected hexadecimal character");
          t.result += k(re), t.position++;
        } else
          D(t, "unknown escape sequence");
        W = ne = t.position;
      } else A(oe) ? (te(t, W, ne, !0), ge(t, ve(t, !1, H)), W = ne = t.position) : t.position === t.lineStart && Q(t) ? D(t, "unexpected end of the document within a double quoted scalar") : (t.position++, ne = t.position);
    }
    D(t, "unexpected end of the stream within a double quoted scalar");
  }
  function F(t, H) {
    var W = !0, ne, Y, re, Z = t.tag, oe, ue = t.anchor, Ae, Te, me, S, M, z = /* @__PURE__ */ Object.create(null), X, J, ae, ee;
    if (ee = t.input.charCodeAt(t.position), ee === 91)
      Te = 93, M = !1, oe = [];
    else if (ee === 123)
      Te = 125, M = !0, oe = {};
    else
      return !1;
    for (t.anchor !== null && (t.anchorMap[t.anchor] = oe), ee = t.input.charCodeAt(++t.position); ee !== 0; ) {
      if (ve(t, !0, H), ee = t.input.charCodeAt(t.position), ee === Te)
        return t.position++, t.tag = Z, t.anchor = ue, t.kind = M ? "mapping" : "sequence", t.result = oe, !0;
      W ? ee === 44 && D(t, "expected the node content, but found ','") : D(t, "missed comma between flow collection entries"), J = X = ae = null, me = S = !1, ee === 63 && (Ae = t.input.charCodeAt(t.position + 1), O(Ae) && (me = S = !0, t.position++, ve(t, !0, H))), ne = t.line, Y = t.lineStart, re = t.position, Re(t, H, l, !1, !0), J = t.tag, X = t.result, ve(t, !0, H), ee = t.input.charCodeAt(t.position), (S || t.line === ne) && ee === 58 && (me = !0, ee = t.input.charCodeAt(++t.position), ve(t, !0, H), Re(t, H, l, !1, !0), ae = t.result), M ? ie(t, oe, z, J, X, ae, ne, Y, re) : me ? oe.push(ie(t, null, z, J, X, ae, ne, Y, re)) : oe.push(X), ve(t, !0, H), ee = t.input.charCodeAt(t.position), ee === 44 ? (W = !0, ee = t.input.charCodeAt(++t.position)) : W = !1;
    }
    D(t, "unexpected end of the stream within a flow collection");
  }
  function ce(t, H) {
    var W, ne, Y = s, re = !1, Z = !1, oe = H, ue = 0, Ae = !1, Te, me;
    if (me = t.input.charCodeAt(t.position), me === 124)
      ne = !1;
    else if (me === 62)
      ne = !0;
    else
      return !1;
    for (t.kind = "scalar", t.result = ""; me !== 0; )
      if (me = t.input.charCodeAt(++t.position), me === 43 || me === 45)
        s === Y ? Y = me === 43 ? r : a : D(t, "repeat of a chomping mode identifier");
      else if ((Te = R(me)) >= 0)
        Te === 0 ? D(t, "bad explicit indentation width of a block scalar; it cannot be less than one") : Z ? D(t, "repeat of an indentation width identifier") : (oe = H + Te - 1, Z = !0);
      else
        break;
    if (P(me)) {
      do
        me = t.input.charCodeAt(++t.position);
      while (P(me));
      if (me === 35)
        do
          me = t.input.charCodeAt(++t.position);
        while (!A(me) && me !== 0);
    }
    for (; me !== 0; ) {
      for (we(t), t.lineIndent = 0, me = t.input.charCodeAt(t.position); (!Z || t.lineIndent < oe) && me === 32; )
        t.lineIndent++, me = t.input.charCodeAt(++t.position);
      if (!Z && t.lineIndent > oe && (oe = t.lineIndent), A(me)) {
        ue++;
        continue;
      }
      if (t.lineIndent < oe) {
        Y === r ? t.result += e.repeat(`
`, re ? 1 + ue : ue) : Y === s && re && (t.result += `
`);
        break;
      }
      for (ne ? P(me) ? (Ae = !0, t.result += e.repeat(`
`, re ? 1 + ue : ue)) : Ae ? (Ae = !1, t.result += e.repeat(`
`, ue + 1)) : ue === 0 ? re && (t.result += " ") : t.result += e.repeat(`
`, ue) : t.result += e.repeat(`
`, re ? 1 + ue : ue), re = !0, Z = !0, ue = 0, W = t.position; !A(me) && me !== 0; )
        me = t.input.charCodeAt(++t.position);
      te(t, W, t.position, !1);
    }
    return !0;
  }
  function he(t, H) {
    var W, ne = t.tag, Y = t.anchor, re = [], Z, oe = !1, ue;
    if (t.firstTabInLine !== -1) return !1;
    for (t.anchor !== null && (t.anchorMap[t.anchor] = re), ue = t.input.charCodeAt(t.position); ue !== 0 && (t.firstTabInLine !== -1 && (t.position = t.firstTabInLine, D(t, "tab characters must not be used in indentation")), !(ue !== 45 || (Z = t.input.charCodeAt(t.position + 1), !O(Z)))); ) {
      if (oe = !0, t.position++, ve(t, !0, -1) && t.lineIndent <= H) {
        re.push(null), ue = t.input.charCodeAt(t.position);
        continue;
      }
      if (W = t.line, Re(t, H, u, !1, !0), re.push(t.result), ve(t, !0, -1), ue = t.input.charCodeAt(t.position), (t.line === W || t.lineIndent > H) && ue !== 0)
        D(t, "bad indentation of a sequence entry");
      else if (t.lineIndent < H)
        break;
    }
    return oe ? (t.tag = ne, t.anchor = Y, t.kind = "sequence", t.result = re, !0) : !1;
  }
  function pe(t, H, W) {
    var ne, Y, re, Z, oe, ue, Ae = t.tag, Te = t.anchor, me = {}, S = /* @__PURE__ */ Object.create(null), M = null, z = null, X = null, J = !1, ae = !1, ee;
    if (t.firstTabInLine !== -1) return !1;
    for (t.anchor !== null && (t.anchorMap[t.anchor] = me), ee = t.input.charCodeAt(t.position); ee !== 0; ) {
      if (!J && t.firstTabInLine !== -1 && (t.position = t.firstTabInLine, D(t, "tab characters must not be used in indentation")), ne = t.input.charCodeAt(t.position + 1), re = t.line, (ee === 63 || ee === 58) && O(ne))
        ee === 63 ? (J && (ie(t, me, S, M, z, null, Z, oe, ue), M = z = X = null), ae = !0, J = !0, Y = !0) : J ? (J = !1, Y = !0) : D(t, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), t.position += 1, ee = ne;
      else {
        if (Z = t.line, oe = t.lineStart, ue = t.position, !Re(t, W, i, !1, !0))
          break;
        if (t.line === re) {
          for (ee = t.input.charCodeAt(t.position); P(ee); )
            ee = t.input.charCodeAt(++t.position);
          if (ee === 58)
            ee = t.input.charCodeAt(++t.position), O(ee) || D(t, "a whitespace character is expected after the key-value separator within a block mapping"), J && (ie(t, me, S, M, z, null, Z, oe, ue), M = z = X = null), ae = !0, J = !1, Y = !1, M = t.tag, z = t.result;
          else if (ae)
            D(t, "can not read an implicit mapping pair; a colon is missed");
          else
            return t.tag = Ae, t.anchor = Te, !0;
        } else if (ae)
          D(t, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else
          return t.tag = Ae, t.anchor = Te, !0;
      }
      if ((t.line === re || t.lineIndent > H) && (J && (Z = t.line, oe = t.lineStart, ue = t.position), Re(t, H, o, !0, Y) && (J ? z = t.result : X = t.result), J || (ie(t, me, S, M, z, X, Z, oe, ue), M = z = X = null), ve(t, !0, -1), ee = t.input.charCodeAt(t.position)), (t.line === re || t.lineIndent > H) && ee !== 0)
        D(t, "bad indentation of a mapping entry");
      else if (t.lineIndent < H)
        break;
    }
    return J && ie(t, me, S, M, z, null, Z, oe, ue), ae && (t.tag = Ae, t.anchor = Te, t.kind = "mapping", t.result = me), ae;
  }
  function _e(t) {
    var H, W = !1, ne = !1, Y, re, Z;
    if (Z = t.input.charCodeAt(t.position), Z !== 33) return !1;
    if (t.tag !== null && D(t, "duplication of a tag property"), Z = t.input.charCodeAt(++t.position), Z === 60 ? (W = !0, Z = t.input.charCodeAt(++t.position)) : Z === 33 ? (ne = !0, Y = "!!", Z = t.input.charCodeAt(++t.position)) : Y = "!", H = t.position, W) {
      do
        Z = t.input.charCodeAt(++t.position);
      while (Z !== 0 && Z !== 62);
      t.position < t.length ? (re = t.input.slice(H, t.position), Z = t.input.charCodeAt(++t.position)) : D(t, "unexpected end of the stream within a verbatim tag");
    } else {
      for (; Z !== 0 && !O(Z); )
        Z === 33 && (ne ? D(t, "tag suffix cannot contain exclamation marks") : (Y = t.input.slice(H - 1, t.position + 1), y.test(Y) || D(t, "named tag handle cannot contain such characters"), ne = !0, H = t.position + 1)), Z = t.input.charCodeAt(++t.position);
      re = t.input.slice(H, t.position), g.test(re) && D(t, "tag suffix cannot contain flow indicator characters");
    }
    re && !m.test(re) && D(t, "tag name cannot contain such characters: " + re);
    try {
      re = decodeURIComponent(re);
    } catch {
      D(t, "tag name is malformed: " + re);
    }
    return W ? t.tag = re : f.call(t.tagMap, Y) ? t.tag = t.tagMap[Y] + re : Y === "!" ? t.tag = "!" + re : Y === "!!" ? t.tag = "tag:yaml.org,2002:" + re : D(t, 'undeclared tag handle "' + Y + '"'), !0;
  }
  function Ee(t) {
    var H, W;
    if (W = t.input.charCodeAt(t.position), W !== 38) return !1;
    for (t.anchor !== null && D(t, "duplication of an anchor property"), W = t.input.charCodeAt(++t.position), H = t.position; W !== 0 && !O(W) && !b(W); )
      W = t.input.charCodeAt(++t.position);
    return t.position === H && D(t, "name of an anchor node must contain at least one character"), t.anchor = t.input.slice(H, t.position), !0;
  }
  function He(t) {
    var H, W, ne;
    if (ne = t.input.charCodeAt(t.position), ne !== 42) return !1;
    for (ne = t.input.charCodeAt(++t.position), H = t.position; ne !== 0 && !O(ne) && !b(ne); )
      ne = t.input.charCodeAt(++t.position);
    return t.position === H && D(t, "name of an alias node must contain at least one character"), W = t.input.slice(H, t.position), f.call(t.anchorMap, W) || D(t, 'unidentified alias "' + W + '"'), t.result = t.anchorMap[W], ve(t, !0, -1), !0;
  }
  function Re(t, H, W, ne, Y) {
    var re, Z, oe, ue = 1, Ae = !1, Te = !1, me, S, M, z, X, J;
    if (t.listener !== null && t.listener("open", t), t.tag = null, t.anchor = null, t.kind = null, t.result = null, re = Z = oe = o === W || u === W, ne && ve(t, !0, -1) && (Ae = !0, t.lineIndent > H ? ue = 1 : t.lineIndent === H ? ue = 0 : t.lineIndent < H && (ue = -1)), ue === 1)
      for (; _e(t) || Ee(t); )
        ve(t, !0, -1) ? (Ae = !0, oe = re, t.lineIndent > H ? ue = 1 : t.lineIndent === H ? ue = 0 : t.lineIndent < H && (ue = -1)) : oe = !1;
    if (oe && (oe = Ae || Y), (ue === 1 || o === W) && (l === W || i === W ? X = H : X = H + 1, J = t.position - t.lineStart, ue === 1 ? oe && (he(t, J) || pe(t, J, X)) || F(t, X) ? Te = !0 : (Z && ce(t, X) || v(t, X) || B(t, X) ? Te = !0 : He(t) ? (Te = !0, (t.tag !== null || t.anchor !== null) && D(t, "alias node should not have any properties")) : w(t, X, l === W) && (Te = !0, t.tag === null && (t.tag = "?")), t.anchor !== null && (t.anchorMap[t.anchor] = t.result)) : ue === 0 && (Te = oe && he(t, J))), t.tag === null)
      t.anchor !== null && (t.anchorMap[t.anchor] = t.result);
    else if (t.tag === "?") {
      for (t.result !== null && t.kind !== "scalar" && D(t, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + t.kind + '"'), me = 0, S = t.implicitTypes.length; me < S; me += 1)
        if (z = t.implicitTypes[me], z.resolve(t.result)) {
          t.result = z.construct(t.result), t.tag = z.tag, t.anchor !== null && (t.anchorMap[t.anchor] = t.result);
          break;
        }
    } else if (t.tag !== "!") {
      if (f.call(t.typeMap[t.kind || "fallback"], t.tag))
        z = t.typeMap[t.kind || "fallback"][t.tag];
      else
        for (z = null, M = t.typeMap.multi[t.kind || "fallback"], me = 0, S = M.length; me < S; me += 1)
          if (t.tag.slice(0, M[me].tag.length) === M[me].tag) {
            z = M[me];
            break;
          }
      z || D(t, "unknown tag !<" + t.tag + ">"), t.result !== null && z.kind !== t.kind && D(t, "unacceptable node kind for !<" + t.tag + '> tag; it should be "' + z.kind + '", not "' + t.kind + '"'), z.resolve(t.result, t.tag) ? (t.result = z.construct(t.result, t.tag), t.anchor !== null && (t.anchorMap[t.anchor] = t.result)) : D(t, "cannot resolve a node with !<" + t.tag + "> explicit tag");
    }
    return t.listener !== null && t.listener("close", t), t.tag !== null || t.anchor !== null || Te;
  }
  function qe(t) {
    var H = t.position, W, ne, Y, re = !1, Z;
    for (t.version = null, t.checkLineBreaks = t.legacy, t.tagMap = /* @__PURE__ */ Object.create(null), t.anchorMap = /* @__PURE__ */ Object.create(null); (Z = t.input.charCodeAt(t.position)) !== 0 && (ve(t, !0, -1), Z = t.input.charCodeAt(t.position), !(t.lineIndent > 0 || Z !== 37)); ) {
      for (re = !0, Z = t.input.charCodeAt(++t.position), W = t.position; Z !== 0 && !O(Z); )
        Z = t.input.charCodeAt(++t.position);
      for (ne = t.input.slice(W, t.position), Y = [], ne.length < 1 && D(t, "directive name must not be less than one character in length"); Z !== 0; ) {
        for (; P(Z); )
          Z = t.input.charCodeAt(++t.position);
        if (Z === 35) {
          do
            Z = t.input.charCodeAt(++t.position);
          while (Z !== 0 && !A(Z));
          break;
        }
        if (A(Z)) break;
        for (W = t.position; Z !== 0 && !O(Z); )
          Z = t.input.charCodeAt(++t.position);
        Y.push(t.input.slice(W, t.position));
      }
      Z !== 0 && we(t), f.call(V, ne) ? V[ne](t, ne, Y) : G(t, 'unknown document directive "' + ne + '"');
    }
    if (ve(t, !0, -1), t.lineIndent === 0 && t.input.charCodeAt(t.position) === 45 && t.input.charCodeAt(t.position + 1) === 45 && t.input.charCodeAt(t.position + 2) === 45 ? (t.position += 3, ve(t, !0, -1)) : re && D(t, "directives end mark is expected"), Re(t, t.lineIndent - 1, o, !1, !0), ve(t, !0, -1), t.checkLineBreaks && p.test(t.input.slice(H, t.position)) && G(t, "non-ASCII line breaks are interpreted as content"), t.documents.push(t.result), t.position === t.lineStart && Q(t)) {
      t.input.charCodeAt(t.position) === 46 && (t.position += 3, ve(t, !0, -1));
      return;
    }
    if (t.position < t.length - 1)
      D(t, "end of the stream or a document separator is expected");
    else
      return;
  }
  function lt(t, H) {
    t = String(t), H = H || {}, t.length !== 0 && (t.charCodeAt(t.length - 1) !== 10 && t.charCodeAt(t.length - 1) !== 13 && (t += `
`), t.charCodeAt(0) === 65279 && (t = t.slice(1)));
    var W = new N(t, H), ne = t.indexOf("\0");
    for (ne !== -1 && (W.position = ne, D(W, "null byte is not allowed in input")), W.input += "\0"; W.input.charCodeAt(W.position) === 32; )
      W.lineIndent += 1, W.position += 1;
    for (; W.position < W.length - 1; )
      qe(W);
    return W.documents;
  }
  function it(t, H, W) {
    H !== null && typeof H == "object" && typeof W > "u" && (W = H, H = null);
    var ne = lt(t, W);
    if (typeof H != "function")
      return ne;
    for (var Y = 0, re = ne.length; Y < re; Y += 1)
      H(ne[Y]);
  }
  function rt(t, H) {
    var W = lt(t, H);
    if (W.length !== 0) {
      if (W.length === 1)
        return W[0];
      throw new d("expected a single document in the stream, but found more");
    }
  }
  return jr.loadAll = it, jr.load = rt, jr;
}
var mi = {}, fs;
function Pf() {
  if (fs) return mi;
  fs = 1;
  var e = Tr(), d = Cr(), h = ya(), c = Object.prototype.toString, f = Object.prototype.hasOwnProperty, l = 65279, i = 9, u = 10, o = 13, s = 32, a = 33, r = 34, n = 35, p = 37, g = 38, y = 39, m = 42, _ = 44, A = 45, P = 58, O = 61, b = 62, I = 63, T = 64, R = 91, E = 93, k = 96, $ = 123, L = 124, q = 125, x = {};
  x[0] = "\\0", x[7] = "\\a", x[8] = "\\b", x[9] = "\\t", x[10] = "\\n", x[11] = "\\v", x[12] = "\\f", x[13] = "\\r", x[27] = "\\e", x[34] = '\\"', x[92] = "\\\\", x[133] = "\\N", x[160] = "\\_", x[8232] = "\\L", x[8233] = "\\P";
  var N = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ], j = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  function D(S, M) {
    var z, X, J, ae, ee, se, fe;
    if (M === null) return {};
    for (z = {}, X = Object.keys(M), J = 0, ae = X.length; J < ae; J += 1)
      ee = X[J], se = String(M[ee]), ee.slice(0, 2) === "!!" && (ee = "tag:yaml.org,2002:" + ee.slice(2)), fe = S.compiledTypeMap.fallback[ee], fe && f.call(fe.styleAliases, se) && (se = fe.styleAliases[se]), z[ee] = se;
    return z;
  }
  function G(S) {
    var M, z, X;
    if (M = S.toString(16).toUpperCase(), S <= 255)
      z = "x", X = 2;
    else if (S <= 65535)
      z = "u", X = 4;
    else if (S <= 4294967295)
      z = "U", X = 8;
    else
      throw new d("code point within a string may not be greater than 0xFFFFFFFF");
    return "\\" + z + e.repeat("0", X - M.length) + M;
  }
  var V = 1, te = 2;
  function de(S) {
    this.schema = S.schema || h, this.indent = Math.max(1, S.indent || 2), this.noArrayIndent = S.noArrayIndent || !1, this.skipInvalid = S.skipInvalid || !1, this.flowLevel = e.isNothing(S.flowLevel) ? -1 : S.flowLevel, this.styleMap = D(this.schema, S.styles || null), this.sortKeys = S.sortKeys || !1, this.lineWidth = S.lineWidth || 80, this.noRefs = S.noRefs || !1, this.noCompatMode = S.noCompatMode || !1, this.condenseFlow = S.condenseFlow || !1, this.quotingType = S.quotingType === '"' ? te : V, this.forceQuotes = S.forceQuotes || !1, this.replacer = typeof S.replacer == "function" ? S.replacer : null, this.implicitTypes = this.schema.compiledImplicit, this.explicitTypes = this.schema.compiledExplicit, this.tag = null, this.result = "", this.duplicates = [], this.usedDuplicates = null;
  }
  function ie(S, M) {
    for (var z = e.repeat(" ", M), X = 0, J = -1, ae = "", ee, se = S.length; X < se; )
      J = S.indexOf(`
`, X), J === -1 ? (ee = S.slice(X), X = se) : (ee = S.slice(X, J + 1), X = J + 1), ee.length && ee !== `
` && (ae += z), ae += ee;
    return ae;
  }
  function we(S, M) {
    return `
` + e.repeat(" ", S.indent * M);
  }
  function ve(S, M) {
    var z, X, J;
    for (z = 0, X = S.implicitTypes.length; z < X; z += 1)
      if (J = S.implicitTypes[z], J.resolve(M))
        return !0;
    return !1;
  }
  function Q(S) {
    return S === s || S === i;
  }
  function ge(S) {
    return 32 <= S && S <= 126 || 161 <= S && S <= 55295 && S !== 8232 && S !== 8233 || 57344 <= S && S <= 65533 && S !== l || 65536 <= S && S <= 1114111;
  }
  function w(S) {
    return ge(S) && S !== l && S !== o && S !== u;
  }
  function v(S, M, z) {
    var X = w(S), J = X && !Q(S);
    return (
      // ns-plain-safe
      (z ? (
        // c = flow-in
        X
      ) : X && S !== _ && S !== R && S !== E && S !== $ && S !== q) && S !== n && !(M === P && !J) || w(M) && !Q(M) && S === n || M === P && J
    );
  }
  function B(S) {
    return ge(S) && S !== l && !Q(S) && S !== A && S !== I && S !== P && S !== _ && S !== R && S !== E && S !== $ && S !== q && S !== n && S !== g && S !== m && S !== a && S !== L && S !== O && S !== b && S !== y && S !== r && S !== p && S !== T && S !== k;
  }
  function F(S) {
    return !Q(S) && S !== P;
  }
  function ce(S, M) {
    var z = S.charCodeAt(M), X;
    return z >= 55296 && z <= 56319 && M + 1 < S.length && (X = S.charCodeAt(M + 1), X >= 56320 && X <= 57343) ? (z - 55296) * 1024 + X - 56320 + 65536 : z;
  }
  function he(S) {
    var M = /^\n* /;
    return M.test(S);
  }
  var pe = 1, _e = 2, Ee = 3, He = 4, Re = 5;
  function qe(S, M, z, X, J, ae, ee, se) {
    var fe, ye = 0, be = null, De = !1, Ce = !1, xt = X !== -1, Je = -1, yt = B(ce(S, 0)) && F(ce(S, S.length - 1));
    if (M || ee)
      for (fe = 0; fe < S.length; ye >= 65536 ? fe += 2 : fe++) {
        if (ye = ce(S, fe), !ge(ye))
          return Re;
        yt = yt && v(ye, be, se), be = ye;
      }
    else {
      for (fe = 0; fe < S.length; ye >= 65536 ? fe += 2 : fe++) {
        if (ye = ce(S, fe), ye === u)
          De = !0, xt && (Ce = Ce || // Foldable line = too long, and not more-indented.
          fe - Je - 1 > X && S[Je + 1] !== " ", Je = fe);
        else if (!ge(ye))
          return Re;
        yt = yt && v(ye, be, se), be = ye;
      }
      Ce = Ce || xt && fe - Je - 1 > X && S[Je + 1] !== " ";
    }
    return !De && !Ce ? yt && !ee && !J(S) ? pe : ae === te ? Re : _e : z > 9 && he(S) ? Re : ee ? ae === te ? Re : _e : Ce ? He : Ee;
  }
  function lt(S, M, z, X, J) {
    S.dump = (function() {
      if (M.length === 0)
        return S.quotingType === te ? '""' : "''";
      if (!S.noCompatMode && (N.indexOf(M) !== -1 || j.test(M)))
        return S.quotingType === te ? '"' + M + '"' : "'" + M + "'";
      var ae = S.indent * Math.max(1, z), ee = S.lineWidth === -1 ? -1 : Math.max(Math.min(S.lineWidth, 40), S.lineWidth - ae), se = X || S.flowLevel > -1 && z >= S.flowLevel;
      function fe(ye) {
        return ve(S, ye);
      }
      switch (qe(
        M,
        se,
        S.indent,
        ee,
        fe,
        S.quotingType,
        S.forceQuotes && !X,
        J
      )) {
        case pe:
          return M;
        case _e:
          return "'" + M.replace(/'/g, "''") + "'";
        case Ee:
          return "|" + it(M, S.indent) + rt(ie(M, ae));
        case He:
          return ">" + it(M, S.indent) + rt(ie(t(M, ee), ae));
        case Re:
          return '"' + W(M) + '"';
        default:
          throw new d("impossible error: invalid scalar style");
      }
    })();
  }
  function it(S, M) {
    var z = he(S) ? String(M) : "", X = S[S.length - 1] === `
`, J = X && (S[S.length - 2] === `
` || S === `
`), ae = J ? "+" : X ? "" : "-";
    return z + ae + `
`;
  }
  function rt(S) {
    return S[S.length - 1] === `
` ? S.slice(0, -1) : S;
  }
  function t(S, M) {
    for (var z = /(\n+)([^\n]*)/g, X = (function() {
      var ye = S.indexOf(`
`);
      return ye = ye !== -1 ? ye : S.length, z.lastIndex = ye, H(S.slice(0, ye), M);
    })(), J = S[0] === `
` || S[0] === " ", ae, ee; ee = z.exec(S); ) {
      var se = ee[1], fe = ee[2];
      ae = fe[0] === " ", X += se + (!J && !ae && fe !== "" ? `
` : "") + H(fe, M), J = ae;
    }
    return X;
  }
  function H(S, M) {
    if (S === "" || S[0] === " ") return S;
    for (var z = / [^ ]/g, X, J = 0, ae, ee = 0, se = 0, fe = ""; X = z.exec(S); )
      se = X.index, se - J > M && (ae = ee > J ? ee : se, fe += `
` + S.slice(J, ae), J = ae + 1), ee = se;
    return fe += `
`, S.length - J > M && ee > J ? fe += S.slice(J, ee) + `
` + S.slice(ee + 1) : fe += S.slice(J), fe.slice(1);
  }
  function W(S) {
    for (var M = "", z = 0, X, J = 0; J < S.length; z >= 65536 ? J += 2 : J++)
      z = ce(S, J), X = x[z], !X && ge(z) ? (M += S[J], z >= 65536 && (M += S[J + 1])) : M += X || G(z);
    return M;
  }
  function ne(S, M, z) {
    var X = "", J = S.tag, ae, ee, se;
    for (ae = 0, ee = z.length; ae < ee; ae += 1)
      se = z[ae], S.replacer && (se = S.replacer.call(z, String(ae), se)), (ue(S, M, se, !1, !1) || typeof se > "u" && ue(S, M, null, !1, !1)) && (X !== "" && (X += "," + (S.condenseFlow ? "" : " ")), X += S.dump);
    S.tag = J, S.dump = "[" + X + "]";
  }
  function Y(S, M, z, X) {
    var J = "", ae = S.tag, ee, se, fe;
    for (ee = 0, se = z.length; ee < se; ee += 1)
      fe = z[ee], S.replacer && (fe = S.replacer.call(z, String(ee), fe)), (ue(S, M + 1, fe, !0, !0, !1, !0) || typeof fe > "u" && ue(S, M + 1, null, !0, !0, !1, !0)) && ((!X || J !== "") && (J += we(S, M)), S.dump && u === S.dump.charCodeAt(0) ? J += "-" : J += "- ", J += S.dump);
    S.tag = ae, S.dump = J || "[]";
  }
  function re(S, M, z) {
    var X = "", J = S.tag, ae = Object.keys(z), ee, se, fe, ye, be;
    for (ee = 0, se = ae.length; ee < se; ee += 1)
      be = "", X !== "" && (be += ", "), S.condenseFlow && (be += '"'), fe = ae[ee], ye = z[fe], S.replacer && (ye = S.replacer.call(z, fe, ye)), ue(S, M, fe, !1, !1) && (S.dump.length > 1024 && (be += "? "), be += S.dump + (S.condenseFlow ? '"' : "") + ":" + (S.condenseFlow ? "" : " "), ue(S, M, ye, !1, !1) && (be += S.dump, X += be));
    S.tag = J, S.dump = "{" + X + "}";
  }
  function Z(S, M, z, X) {
    var J = "", ae = S.tag, ee = Object.keys(z), se, fe, ye, be, De, Ce;
    if (S.sortKeys === !0)
      ee.sort();
    else if (typeof S.sortKeys == "function")
      ee.sort(S.sortKeys);
    else if (S.sortKeys)
      throw new d("sortKeys must be a boolean or a function");
    for (se = 0, fe = ee.length; se < fe; se += 1)
      Ce = "", (!X || J !== "") && (Ce += we(S, M)), ye = ee[se], be = z[ye], S.replacer && (be = S.replacer.call(z, ye, be)), ue(S, M + 1, ye, !0, !0, !0) && (De = S.tag !== null && S.tag !== "?" || S.dump && S.dump.length > 1024, De && (S.dump && u === S.dump.charCodeAt(0) ? Ce += "?" : Ce += "? "), Ce += S.dump, De && (Ce += we(S, M)), ue(S, M + 1, be, !0, De) && (S.dump && u === S.dump.charCodeAt(0) ? Ce += ":" : Ce += ": ", Ce += S.dump, J += Ce));
    S.tag = ae, S.dump = J || "{}";
  }
  function oe(S, M, z) {
    var X, J, ae, ee, se, fe;
    for (J = z ? S.explicitTypes : S.implicitTypes, ae = 0, ee = J.length; ae < ee; ae += 1)
      if (se = J[ae], (se.instanceOf || se.predicate) && (!se.instanceOf || typeof M == "object" && M instanceof se.instanceOf) && (!se.predicate || se.predicate(M))) {
        if (z ? se.multi && se.representName ? S.tag = se.representName(M) : S.tag = se.tag : S.tag = "?", se.represent) {
          if (fe = S.styleMap[se.tag] || se.defaultStyle, c.call(se.represent) === "[object Function]")
            X = se.represent(M, fe);
          else if (f.call(se.represent, fe))
            X = se.represent[fe](M, fe);
          else
            throw new d("!<" + se.tag + '> tag resolver accepts not "' + fe + '" style');
          S.dump = X;
        }
        return !0;
      }
    return !1;
  }
  function ue(S, M, z, X, J, ae, ee) {
    S.tag = null, S.dump = z, oe(S, z, !1) || oe(S, z, !0);
    var se = c.call(S.dump), fe = X, ye;
    X && (X = S.flowLevel < 0 || S.flowLevel > M);
    var be = se === "[object Object]" || se === "[object Array]", De, Ce;
    if (be && (De = S.duplicates.indexOf(z), Ce = De !== -1), (S.tag !== null && S.tag !== "?" || Ce || S.indent !== 2 && M > 0) && (J = !1), Ce && S.usedDuplicates[De])
      S.dump = "*ref_" + De;
    else {
      if (be && Ce && !S.usedDuplicates[De] && (S.usedDuplicates[De] = !0), se === "[object Object]")
        X && Object.keys(S.dump).length !== 0 ? (Z(S, M, S.dump, J), Ce && (S.dump = "&ref_" + De + S.dump)) : (re(S, M, S.dump), Ce && (S.dump = "&ref_" + De + " " + S.dump));
      else if (se === "[object Array]")
        X && S.dump.length !== 0 ? (S.noArrayIndent && !ee && M > 0 ? Y(S, M - 1, S.dump, J) : Y(S, M, S.dump, J), Ce && (S.dump = "&ref_" + De + S.dump)) : (ne(S, M, S.dump), Ce && (S.dump = "&ref_" + De + " " + S.dump));
      else if (se === "[object String]")
        S.tag !== "?" && lt(S, S.dump, M, ae, fe);
      else {
        if (se === "[object Undefined]")
          return !1;
        if (S.skipInvalid) return !1;
        throw new d("unacceptable kind of an object to dump " + se);
      }
      S.tag !== null && S.tag !== "?" && (ye = encodeURI(
        S.tag[0] === "!" ? S.tag.slice(1) : S.tag
      ).replace(/!/g, "%21"), S.tag[0] === "!" ? ye = "!" + ye : ye.slice(0, 18) === "tag:yaml.org,2002:" ? ye = "!!" + ye.slice(18) : ye = "!<" + ye + ">", S.dump = ye + " " + S.dump);
    }
    return !0;
  }
  function Ae(S, M) {
    var z = [], X = [], J, ae;
    for (Te(S, z, X), J = 0, ae = X.length; J < ae; J += 1)
      M.duplicates.push(z[X[J]]);
    M.usedDuplicates = new Array(ae);
  }
  function Te(S, M, z) {
    var X, J, ae;
    if (S !== null && typeof S == "object")
      if (J = M.indexOf(S), J !== -1)
        z.indexOf(J) === -1 && z.push(J);
      else if (M.push(S), Array.isArray(S))
        for (J = 0, ae = S.length; J < ae; J += 1)
          Te(S[J], M, z);
      else
        for (X = Object.keys(S), J = 0, ae = X.length; J < ae; J += 1)
          Te(S[X[J]], M, z);
  }
  function me(S, M) {
    M = M || {};
    var z = new de(M);
    z.noRefs || Ae(S, z);
    var X = S;
    return z.replacer && (X = z.replacer.call({ "": X }, "", X)), ue(z, 0, X, !0, !0) ? z.dump + `
` : "";
  }
  return mi.dump = me, mi;
}
var ds;
function wa() {
  if (ds) return $e;
  ds = 1;
  var e = bf(), d = Pf();
  function h(c, f) {
    return function() {
      throw new Error("Function yaml." + c + " is removed in js-yaml 4. Use yaml." + f + " instead, which is now safe by default.");
    };
  }
  return $e.Type = Me(), $e.Schema = ru(), $e.FAILSAFE_SCHEMA = ou(), $e.JSON_SCHEMA = fu(), $e.CORE_SCHEMA = du(), $e.DEFAULT_SCHEMA = ya(), $e.load = e.load, $e.loadAll = e.loadAll, $e.dump = d.dump, $e.YAMLException = Cr(), $e.types = {
    binary: mu(),
    float: cu(),
    map: au(),
    null: su(),
    pairs: vu(),
    set: Eu(),
    timestamp: hu(),
    bool: lu(),
    int: uu(),
    merge: pu(),
    omap: gu(),
    seq: iu(),
    str: nu()
  }, $e.safeLoad = h("safeLoad", "load"), $e.safeLoadAll = h("safeLoadAll", "loadAll"), $e.safeDump = h("safeDump", "dump"), $e;
}
var er = {}, hs;
function Of() {
  if (hs) return er;
  hs = 1, Object.defineProperty(er, "__esModule", { value: !0 }), er.Lazy = void 0;
  class e {
    constructor(h) {
      this._value = null, this.creator = h;
    }
    get hasValue() {
      return this.creator == null;
    }
    get value() {
      if (this.creator == null)
        return this._value;
      const h = this.creator();
      return this.value = h, h;
    }
    set value(h) {
      this._value = h, this.creator = null;
    }
  }
  return er.Lazy = e, er;
}
var Gr = { exports: {} }, gi, ps;
function tn() {
  if (ps) return gi;
  ps = 1;
  const e = "2.0.0", d = 256, h = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991, c = 16, f = d - 6;
  return gi = {
    MAX_LENGTH: d,
    MAX_SAFE_COMPONENT_LENGTH: c,
    MAX_SAFE_BUILD_LENGTH: f,
    MAX_SAFE_INTEGER: h,
    RELEASE_TYPES: [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ],
    SEMVER_SPEC_VERSION: e,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  }, gi;
}
var vi, ms;
function rn() {
  return ms || (ms = 1, vi = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...d) => console.error("SEMVER", ...d) : () => {
  }), vi;
}
var gs;
function br() {
  return gs || (gs = 1, (function(e, d) {
    const {
      MAX_SAFE_COMPONENT_LENGTH: h,
      MAX_SAFE_BUILD_LENGTH: c,
      MAX_LENGTH: f
    } = tn(), l = rn();
    d = e.exports = {};
    const i = d.re = [], u = d.safeRe = [], o = d.src = [], s = d.safeSrc = [], a = d.t = {};
    let r = 0;
    const n = "[a-zA-Z0-9-]", p = [
      ["\\s", 1],
      ["\\d", f],
      [n, c]
    ], g = (m) => {
      for (const [_, A] of p)
        m = m.split(`${_}*`).join(`${_}{0,${A}}`).split(`${_}+`).join(`${_}{1,${A}}`);
      return m;
    }, y = (m, _, A) => {
      const P = g(_), O = r++;
      l(m, O, _), a[m] = O, o[O] = _, s[O] = P, i[O] = new RegExp(_, A ? "g" : void 0), u[O] = new RegExp(P, A ? "g" : void 0);
    };
    y("NUMERICIDENTIFIER", "0|[1-9]\\d*"), y("NUMERICIDENTIFIERLOOSE", "\\d+"), y("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${n}*`), y("MAINVERSION", `(${o[a.NUMERICIDENTIFIER]})\\.(${o[a.NUMERICIDENTIFIER]})\\.(${o[a.NUMERICIDENTIFIER]})`), y("MAINVERSIONLOOSE", `(${o[a.NUMERICIDENTIFIERLOOSE]})\\.(${o[a.NUMERICIDENTIFIERLOOSE]})\\.(${o[a.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASEIDENTIFIER", `(?:${o[a.NONNUMERICIDENTIFIER]}|${o[a.NUMERICIDENTIFIER]})`), y("PRERELEASEIDENTIFIERLOOSE", `(?:${o[a.NONNUMERICIDENTIFIER]}|${o[a.NUMERICIDENTIFIERLOOSE]})`), y("PRERELEASE", `(?:-(${o[a.PRERELEASEIDENTIFIER]}(?:\\.${o[a.PRERELEASEIDENTIFIER]})*))`), y("PRERELEASELOOSE", `(?:-?(${o[a.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${o[a.PRERELEASEIDENTIFIERLOOSE]})*))`), y("BUILDIDENTIFIER", `${n}+`), y("BUILD", `(?:\\+(${o[a.BUILDIDENTIFIER]}(?:\\.${o[a.BUILDIDENTIFIER]})*))`), y("FULLPLAIN", `v?${o[a.MAINVERSION]}${o[a.PRERELEASE]}?${o[a.BUILD]}?`), y("FULL", `^${o[a.FULLPLAIN]}$`), y("LOOSEPLAIN", `[v=\\s]*${o[a.MAINVERSIONLOOSE]}${o[a.PRERELEASELOOSE]}?${o[a.BUILD]}?`), y("LOOSE", `^${o[a.LOOSEPLAIN]}$`), y("GTLT", "((?:<|>)?=?)"), y("XRANGEIDENTIFIERLOOSE", `${o[a.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), y("XRANGEIDENTIFIER", `${o[a.NUMERICIDENTIFIER]}|x|X|\\*`), y("XRANGEPLAIN", `[v=\\s]*(${o[a.XRANGEIDENTIFIER]})(?:\\.(${o[a.XRANGEIDENTIFIER]})(?:\\.(${o[a.XRANGEIDENTIFIER]})(?:${o[a.PRERELEASE]})?${o[a.BUILD]}?)?)?`), y("XRANGEPLAINLOOSE", `[v=\\s]*(${o[a.XRANGEIDENTIFIERLOOSE]})(?:\\.(${o[a.XRANGEIDENTIFIERLOOSE]})(?:\\.(${o[a.XRANGEIDENTIFIERLOOSE]})(?:${o[a.PRERELEASELOOSE]})?${o[a.BUILD]}?)?)?`), y("XRANGE", `^${o[a.GTLT]}\\s*${o[a.XRANGEPLAIN]}$`), y("XRANGELOOSE", `^${o[a.GTLT]}\\s*${o[a.XRANGEPLAINLOOSE]}$`), y("COERCEPLAIN", `(^|[^\\d])(\\d{1,${h}})(?:\\.(\\d{1,${h}}))?(?:\\.(\\d{1,${h}}))?`), y("COERCE", `${o[a.COERCEPLAIN]}(?:$|[^\\d])`), y("COERCEFULL", o[a.COERCEPLAIN] + `(?:${o[a.PRERELEASE]})?(?:${o[a.BUILD]})?(?:$|[^\\d])`), y("COERCERTL", o[a.COERCE], !0), y("COERCERTLFULL", o[a.COERCEFULL], !0), y("LONETILDE", "(?:~>?)"), y("TILDETRIM", `(\\s*)${o[a.LONETILDE]}\\s+`, !0), d.tildeTrimReplace = "$1~", y("TILDE", `^${o[a.LONETILDE]}${o[a.XRANGEPLAIN]}$`), y("TILDELOOSE", `^${o[a.LONETILDE]}${o[a.XRANGEPLAINLOOSE]}$`), y("LONECARET", "(?:\\^)"), y("CARETTRIM", `(\\s*)${o[a.LONECARET]}\\s+`, !0), d.caretTrimReplace = "$1^", y("CARET", `^${o[a.LONECARET]}${o[a.XRANGEPLAIN]}$`), y("CARETLOOSE", `^${o[a.LONECARET]}${o[a.XRANGEPLAINLOOSE]}$`), y("COMPARATORLOOSE", `^${o[a.GTLT]}\\s*(${o[a.LOOSEPLAIN]})$|^$`), y("COMPARATOR", `^${o[a.GTLT]}\\s*(${o[a.FULLPLAIN]})$|^$`), y("COMPARATORTRIM", `(\\s*)${o[a.GTLT]}\\s*(${o[a.LOOSEPLAIN]}|${o[a.XRANGEPLAIN]})`, !0), d.comparatorTrimReplace = "$1$2$3", y("HYPHENRANGE", `^\\s*(${o[a.XRANGEPLAIN]})\\s+-\\s+(${o[a.XRANGEPLAIN]})\\s*$`), y("HYPHENRANGELOOSE", `^\\s*(${o[a.XRANGEPLAINLOOSE]})\\s+-\\s+(${o[a.XRANGEPLAINLOOSE]})\\s*$`), y("STAR", "(<|>)?=?\\s*\\*"), y("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), y("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(Gr, Gr.exports)), Gr.exports;
}
var Ei, vs;
function _a() {
  if (vs) return Ei;
  vs = 1;
  const e = Object.freeze({ loose: !0 }), d = Object.freeze({});
  return Ei = (c) => c ? typeof c != "object" ? e : c : d, Ei;
}
var yi, Es;
function yu() {
  if (Es) return yi;
  Es = 1;
  const e = /^[0-9]+$/, d = (c, f) => {
    if (typeof c == "number" && typeof f == "number")
      return c === f ? 0 : c < f ? -1 : 1;
    const l = e.test(c), i = e.test(f);
    return l && i && (c = +c, f = +f), c === f ? 0 : l && !i ? -1 : i && !l ? 1 : c < f ? -1 : 1;
  };
  return yi = {
    compareIdentifiers: d,
    rcompareIdentifiers: (c, f) => d(f, c)
  }, yi;
}
var wi, ys;
function Be() {
  if (ys) return wi;
  ys = 1;
  const e = rn(), { MAX_LENGTH: d, MAX_SAFE_INTEGER: h } = tn(), { safeRe: c, t: f } = br(), l = _a(), { compareIdentifiers: i } = yu();
  class u {
    constructor(s, a) {
      if (a = l(a), s instanceof u) {
        if (s.loose === !!a.loose && s.includePrerelease === !!a.includePrerelease)
          return s;
        s = s.version;
      } else if (typeof s != "string")
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof s}".`);
      if (s.length > d)
        throw new TypeError(
          `version is longer than ${d} characters`
        );
      e("SemVer", s, a), this.options = a, this.loose = !!a.loose, this.includePrerelease = !!a.includePrerelease;
      const r = s.trim().match(a.loose ? c[f.LOOSE] : c[f.FULL]);
      if (!r)
        throw new TypeError(`Invalid Version: ${s}`);
      if (this.raw = s, this.major = +r[1], this.minor = +r[2], this.patch = +r[3], this.major > h || this.major < 0)
        throw new TypeError("Invalid major version");
      if (this.minor > h || this.minor < 0)
        throw new TypeError("Invalid minor version");
      if (this.patch > h || this.patch < 0)
        throw new TypeError("Invalid patch version");
      r[4] ? this.prerelease = r[4].split(".").map((n) => {
        if (/^[0-9]+$/.test(n)) {
          const p = +n;
          if (p >= 0 && p < h)
            return p;
        }
        return n;
      }) : this.prerelease = [], this.build = r[5] ? r[5].split(".") : [], this.format();
    }
    format() {
      return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
    }
    toString() {
      return this.version;
    }
    compare(s) {
      if (e("SemVer.compare", this.version, this.options, s), !(s instanceof u)) {
        if (typeof s == "string" && s === this.version)
          return 0;
        s = new u(s, this.options);
      }
      return s.version === this.version ? 0 : this.compareMain(s) || this.comparePre(s);
    }
    compareMain(s) {
      return s instanceof u || (s = new u(s, this.options)), this.major < s.major ? -1 : this.major > s.major ? 1 : this.minor < s.minor ? -1 : this.minor > s.minor ? 1 : this.patch < s.patch ? -1 : this.patch > s.patch ? 1 : 0;
    }
    comparePre(s) {
      if (s instanceof u || (s = new u(s, this.options)), this.prerelease.length && !s.prerelease.length)
        return -1;
      if (!this.prerelease.length && s.prerelease.length)
        return 1;
      if (!this.prerelease.length && !s.prerelease.length)
        return 0;
      let a = 0;
      do {
        const r = this.prerelease[a], n = s.prerelease[a];
        if (e("prerelease compare", a, r, n), r === void 0 && n === void 0)
          return 0;
        if (n === void 0)
          return 1;
        if (r === void 0)
          return -1;
        if (r === n)
          continue;
        return i(r, n);
      } while (++a);
    }
    compareBuild(s) {
      s instanceof u || (s = new u(s, this.options));
      let a = 0;
      do {
        const r = this.build[a], n = s.build[a];
        if (e("build compare", a, r, n), r === void 0 && n === void 0)
          return 0;
        if (n === void 0)
          return 1;
        if (r === void 0)
          return -1;
        if (r === n)
          continue;
        return i(r, n);
      } while (++a);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(s, a, r) {
      if (s.startsWith("pre")) {
        if (!a && r === !1)
          throw new Error("invalid increment argument: identifier is empty");
        if (a) {
          const n = `-${a}`.match(this.options.loose ? c[f.PRERELEASELOOSE] : c[f.PRERELEASE]);
          if (!n || n[1] !== a)
            throw new Error(`invalid identifier: ${a}`);
        }
      }
      switch (s) {
        case "premajor":
          this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", a, r);
          break;
        case "preminor":
          this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", a, r);
          break;
        case "prepatch":
          this.prerelease.length = 0, this.inc("patch", a, r), this.inc("pre", a, r);
          break;
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          this.prerelease.length === 0 && this.inc("patch", a, r), this.inc("pre", a, r);
          break;
        case "release":
          if (this.prerelease.length === 0)
            throw new Error(`version ${this.raw} is not a prerelease`);
          this.prerelease.length = 0;
          break;
        case "major":
          (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
          break;
        case "minor":
          (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
          break;
        case "patch":
          this.prerelease.length === 0 && this.patch++, this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const n = Number(r) ? 1 : 0;
          if (this.prerelease.length === 0)
            this.prerelease = [n];
          else {
            let p = this.prerelease.length;
            for (; --p >= 0; )
              typeof this.prerelease[p] == "number" && (this.prerelease[p]++, p = -2);
            if (p === -1) {
              if (a === this.prerelease.join(".") && r === !1)
                throw new Error("invalid increment argument: identifier already exists");
              this.prerelease.push(n);
            }
          }
          if (a) {
            let p = [a, n];
            r === !1 && (p = [a]), i(this.prerelease[0], a) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = p) : this.prerelease = p;
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${s}`);
      }
      return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
    }
  }
  return wi = u, wi;
}
var _i, ws;
function zt() {
  if (ws) return _i;
  ws = 1;
  const e = Be();
  return _i = (h, c, f = !1) => {
    if (h instanceof e)
      return h;
    try {
      return new e(h, c);
    } catch (l) {
      if (!f)
        return null;
      throw l;
    }
  }, _i;
}
var Si, _s;
function If() {
  if (_s) return Si;
  _s = 1;
  const e = zt();
  return Si = (h, c) => {
    const f = e(h, c);
    return f ? f.version : null;
  }, Si;
}
var Ri, Ss;
function Df() {
  if (Ss) return Ri;
  Ss = 1;
  const e = zt();
  return Ri = (h, c) => {
    const f = e(h.trim().replace(/^[=v]+/, ""), c);
    return f ? f.version : null;
  }, Ri;
}
var Ai, Rs;
function Nf() {
  if (Rs) return Ai;
  Rs = 1;
  const e = Be();
  return Ai = (h, c, f, l, i) => {
    typeof f == "string" && (i = l, l = f, f = void 0);
    try {
      return new e(
        h instanceof e ? h.version : h,
        f
      ).inc(c, l, i).version;
    } catch {
      return null;
    }
  }, Ai;
}
var Ti, As;
function Ff() {
  if (As) return Ti;
  As = 1;
  const e = zt();
  return Ti = (h, c) => {
    const f = e(h, null, !0), l = e(c, null, !0), i = f.compare(l);
    if (i === 0)
      return null;
    const u = i > 0, o = u ? f : l, s = u ? l : f, a = !!o.prerelease.length;
    if (!!s.prerelease.length && !a) {
      if (!s.patch && !s.minor)
        return "major";
      if (s.compareMain(o) === 0)
        return s.minor && !s.patch ? "minor" : "patch";
    }
    const n = a ? "pre" : "";
    return f.major !== l.major ? n + "major" : f.minor !== l.minor ? n + "minor" : f.patch !== l.patch ? n + "patch" : "prerelease";
  }, Ti;
}
var Ci, Ts;
function xf() {
  if (Ts) return Ci;
  Ts = 1;
  const e = Be();
  return Ci = (h, c) => new e(h, c).major, Ci;
}
var bi, Cs;
function Lf() {
  if (Cs) return bi;
  Cs = 1;
  const e = Be();
  return bi = (h, c) => new e(h, c).minor, bi;
}
var Pi, bs;
function Uf() {
  if (bs) return Pi;
  bs = 1;
  const e = Be();
  return Pi = (h, c) => new e(h, c).patch, Pi;
}
var Oi, Ps;
function kf() {
  if (Ps) return Oi;
  Ps = 1;
  const e = zt();
  return Oi = (h, c) => {
    const f = e(h, c);
    return f && f.prerelease.length ? f.prerelease : null;
  }, Oi;
}
var Ii, Os;
function et() {
  if (Os) return Ii;
  Os = 1;
  const e = Be();
  return Ii = (h, c, f) => new e(h, f).compare(new e(c, f)), Ii;
}
var Di, Is;
function $f() {
  if (Is) return Di;
  Is = 1;
  const e = et();
  return Di = (h, c, f) => e(c, h, f), Di;
}
var Ni, Ds;
function qf() {
  if (Ds) return Ni;
  Ds = 1;
  const e = et();
  return Ni = (h, c) => e(h, c, !0), Ni;
}
var Fi, Ns;
function Sa() {
  if (Ns) return Fi;
  Ns = 1;
  const e = Be();
  return Fi = (h, c, f) => {
    const l = new e(h, f), i = new e(c, f);
    return l.compare(i) || l.compareBuild(i);
  }, Fi;
}
var xi, Fs;
function Mf() {
  if (Fs) return xi;
  Fs = 1;
  const e = Sa();
  return xi = (h, c) => h.sort((f, l) => e(f, l, c)), xi;
}
var Li, xs;
function Bf() {
  if (xs) return Li;
  xs = 1;
  const e = Sa();
  return Li = (h, c) => h.sort((f, l) => e(l, f, c)), Li;
}
var Ui, Ls;
function nn() {
  if (Ls) return Ui;
  Ls = 1;
  const e = et();
  return Ui = (h, c, f) => e(h, c, f) > 0, Ui;
}
var ki, Us;
function Ra() {
  if (Us) return ki;
  Us = 1;
  const e = et();
  return ki = (h, c, f) => e(h, c, f) < 0, ki;
}
var $i, ks;
function wu() {
  if (ks) return $i;
  ks = 1;
  const e = et();
  return $i = (h, c, f) => e(h, c, f) === 0, $i;
}
var qi, $s;
function _u() {
  if ($s) return qi;
  $s = 1;
  const e = et();
  return qi = (h, c, f) => e(h, c, f) !== 0, qi;
}
var Mi, qs;
function Aa() {
  if (qs) return Mi;
  qs = 1;
  const e = et();
  return Mi = (h, c, f) => e(h, c, f) >= 0, Mi;
}
var Bi, Ms;
function Ta() {
  if (Ms) return Bi;
  Ms = 1;
  const e = et();
  return Bi = (h, c, f) => e(h, c, f) <= 0, Bi;
}
var Hi, Bs;
function Su() {
  if (Bs) return Hi;
  Bs = 1;
  const e = wu(), d = _u(), h = nn(), c = Aa(), f = Ra(), l = Ta();
  return Hi = (u, o, s, a) => {
    switch (o) {
      case "===":
        return typeof u == "object" && (u = u.version), typeof s == "object" && (s = s.version), u === s;
      case "!==":
        return typeof u == "object" && (u = u.version), typeof s == "object" && (s = s.version), u !== s;
      case "":
      case "=":
      case "==":
        return e(u, s, a);
      case "!=":
        return d(u, s, a);
      case ">":
        return h(u, s, a);
      case ">=":
        return c(u, s, a);
      case "<":
        return f(u, s, a);
      case "<=":
        return l(u, s, a);
      default:
        throw new TypeError(`Invalid operator: ${o}`);
    }
  }, Hi;
}
var ji, Hs;
function Hf() {
  if (Hs) return ji;
  Hs = 1;
  const e = Be(), d = zt(), { safeRe: h, t: c } = br();
  return ji = (l, i) => {
    if (l instanceof e)
      return l;
    if (typeof l == "number" && (l = String(l)), typeof l != "string")
      return null;
    i = i || {};
    let u = null;
    if (!i.rtl)
      u = l.match(i.includePrerelease ? h[c.COERCEFULL] : h[c.COERCE]);
    else {
      const p = i.includePrerelease ? h[c.COERCERTLFULL] : h[c.COERCERTL];
      let g;
      for (; (g = p.exec(l)) && (!u || u.index + u[0].length !== l.length); )
        (!u || g.index + g[0].length !== u.index + u[0].length) && (u = g), p.lastIndex = g.index + g[1].length + g[2].length;
      p.lastIndex = -1;
    }
    if (u === null)
      return null;
    const o = u[2], s = u[3] || "0", a = u[4] || "0", r = i.includePrerelease && u[5] ? `-${u[5]}` : "", n = i.includePrerelease && u[6] ? `+${u[6]}` : "";
    return d(`${o}.${s}.${a}${r}${n}`, i);
  }, ji;
}
var Gi, js;
function jf() {
  if (js) return Gi;
  js = 1;
  class e {
    constructor() {
      this.max = 1e3, this.map = /* @__PURE__ */ new Map();
    }
    get(h) {
      const c = this.map.get(h);
      if (c !== void 0)
        return this.map.delete(h), this.map.set(h, c), c;
    }
    delete(h) {
      return this.map.delete(h);
    }
    set(h, c) {
      if (!this.delete(h) && c !== void 0) {
        if (this.map.size >= this.max) {
          const l = this.map.keys().next().value;
          this.delete(l);
        }
        this.map.set(h, c);
      }
      return this;
    }
  }
  return Gi = e, Gi;
}
var Wi, Gs;
function tt() {
  if (Gs) return Wi;
  Gs = 1;
  const e = /\s+/g;
  class d {
    constructor(N, j) {
      if (j = f(j), N instanceof d)
        return N.loose === !!j.loose && N.includePrerelease === !!j.includePrerelease ? N : new d(N.raw, j);
      if (N instanceof l)
        return this.raw = N.value, this.set = [[N]], this.formatted = void 0, this;
      if (this.options = j, this.loose = !!j.loose, this.includePrerelease = !!j.includePrerelease, this.raw = N.trim().replace(e, " "), this.set = this.raw.split("||").map((D) => this.parseRange(D.trim())).filter((D) => D.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const D = this.set[0];
        if (this.set = this.set.filter((G) => !y(G[0])), this.set.length === 0)
          this.set = [D];
        else if (this.set.length > 1) {
          for (const G of this.set)
            if (G.length === 1 && m(G[0])) {
              this.set = [G];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let N = 0; N < this.set.length; N++) {
          N > 0 && (this.formatted += "||");
          const j = this.set[N];
          for (let D = 0; D < j.length; D++)
            D > 0 && (this.formatted += " "), this.formatted += j[D].toString().trim();
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(N) {
      const D = ((this.options.includePrerelease && p) | (this.options.loose && g)) + ":" + N, G = c.get(D);
      if (G)
        return G;
      const V = this.options.loose, te = V ? o[s.HYPHENRANGELOOSE] : o[s.HYPHENRANGE];
      N = N.replace(te, L(this.options.includePrerelease)), i("hyphen replace", N), N = N.replace(o[s.COMPARATORTRIM], a), i("comparator trim", N), N = N.replace(o[s.TILDETRIM], r), i("tilde trim", N), N = N.replace(o[s.CARETTRIM], n), i("caret trim", N);
      let de = N.split(" ").map((Q) => A(Q, this.options)).join(" ").split(/\s+/).map((Q) => $(Q, this.options));
      V && (de = de.filter((Q) => (i("loose invalid filter", Q, this.options), !!Q.match(o[s.COMPARATORLOOSE])))), i("range list", de);
      const ie = /* @__PURE__ */ new Map(), we = de.map((Q) => new l(Q, this.options));
      for (const Q of we) {
        if (y(Q))
          return [Q];
        ie.set(Q.value, Q);
      }
      ie.size > 1 && ie.has("") && ie.delete("");
      const ve = [...ie.values()];
      return c.set(D, ve), ve;
    }
    intersects(N, j) {
      if (!(N instanceof d))
        throw new TypeError("a Range is required");
      return this.set.some((D) => _(D, j) && N.set.some((G) => _(G, j) && D.every((V) => G.every((te) => V.intersects(te, j)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(N) {
      if (!N)
        return !1;
      if (typeof N == "string")
        try {
          N = new u(N, this.options);
        } catch {
          return !1;
        }
      for (let j = 0; j < this.set.length; j++)
        if (q(this.set[j], N, this.options))
          return !0;
      return !1;
    }
  }
  Wi = d;
  const h = jf(), c = new h(), f = _a(), l = an(), i = rn(), u = Be(), {
    safeRe: o,
    t: s,
    comparatorTrimReplace: a,
    tildeTrimReplace: r,
    caretTrimReplace: n
  } = br(), { FLAG_INCLUDE_PRERELEASE: p, FLAG_LOOSE: g } = tn(), y = (x) => x.value === "<0.0.0-0", m = (x) => x.value === "", _ = (x, N) => {
    let j = !0;
    const D = x.slice();
    let G = D.pop();
    for (; j && D.length; )
      j = D.every((V) => G.intersects(V, N)), G = D.pop();
    return j;
  }, A = (x, N) => (x = x.replace(o[s.BUILD], ""), i("comp", x, N), x = I(x, N), i("caret", x), x = O(x, N), i("tildes", x), x = R(x, N), i("xrange", x), x = k(x, N), i("stars", x), x), P = (x) => !x || x.toLowerCase() === "x" || x === "*", O = (x, N) => x.trim().split(/\s+/).map((j) => b(j, N)).join(" "), b = (x, N) => {
    const j = N.loose ? o[s.TILDELOOSE] : o[s.TILDE];
    return x.replace(j, (D, G, V, te, de) => {
      i("tilde", x, D, G, V, te, de);
      let ie;
      return P(G) ? ie = "" : P(V) ? ie = `>=${G}.0.0 <${+G + 1}.0.0-0` : P(te) ? ie = `>=${G}.${V}.0 <${G}.${+V + 1}.0-0` : de ? (i("replaceTilde pr", de), ie = `>=${G}.${V}.${te}-${de} <${G}.${+V + 1}.0-0`) : ie = `>=${G}.${V}.${te} <${G}.${+V + 1}.0-0`, i("tilde return", ie), ie;
    });
  }, I = (x, N) => x.trim().split(/\s+/).map((j) => T(j, N)).join(" "), T = (x, N) => {
    i("caret", x, N);
    const j = N.loose ? o[s.CARETLOOSE] : o[s.CARET], D = N.includePrerelease ? "-0" : "";
    return x.replace(j, (G, V, te, de, ie) => {
      i("caret", x, G, V, te, de, ie);
      let we;
      return P(V) ? we = "" : P(te) ? we = `>=${V}.0.0${D} <${+V + 1}.0.0-0` : P(de) ? V === "0" ? we = `>=${V}.${te}.0${D} <${V}.${+te + 1}.0-0` : we = `>=${V}.${te}.0${D} <${+V + 1}.0.0-0` : ie ? (i("replaceCaret pr", ie), V === "0" ? te === "0" ? we = `>=${V}.${te}.${de}-${ie} <${V}.${te}.${+de + 1}-0` : we = `>=${V}.${te}.${de}-${ie} <${V}.${+te + 1}.0-0` : we = `>=${V}.${te}.${de}-${ie} <${+V + 1}.0.0-0`) : (i("no pr"), V === "0" ? te === "0" ? we = `>=${V}.${te}.${de}${D} <${V}.${te}.${+de + 1}-0` : we = `>=${V}.${te}.${de}${D} <${V}.${+te + 1}.0-0` : we = `>=${V}.${te}.${de} <${+V + 1}.0.0-0`), i("caret return", we), we;
    });
  }, R = (x, N) => (i("replaceXRanges", x, N), x.split(/\s+/).map((j) => E(j, N)).join(" ")), E = (x, N) => {
    x = x.trim();
    const j = N.loose ? o[s.XRANGELOOSE] : o[s.XRANGE];
    return x.replace(j, (D, G, V, te, de, ie) => {
      i("xRange", x, D, G, V, te, de, ie);
      const we = P(V), ve = we || P(te), Q = ve || P(de), ge = Q;
      return G === "=" && ge && (G = ""), ie = N.includePrerelease ? "-0" : "", we ? G === ">" || G === "<" ? D = "<0.0.0-0" : D = "*" : G && ge ? (ve && (te = 0), de = 0, G === ">" ? (G = ">=", ve ? (V = +V + 1, te = 0, de = 0) : (te = +te + 1, de = 0)) : G === "<=" && (G = "<", ve ? V = +V + 1 : te = +te + 1), G === "<" && (ie = "-0"), D = `${G + V}.${te}.${de}${ie}`) : ve ? D = `>=${V}.0.0${ie} <${+V + 1}.0.0-0` : Q && (D = `>=${V}.${te}.0${ie} <${V}.${+te + 1}.0-0`), i("xRange return", D), D;
    });
  }, k = (x, N) => (i("replaceStars", x, N), x.trim().replace(o[s.STAR], "")), $ = (x, N) => (i("replaceGTE0", x, N), x.trim().replace(o[N.includePrerelease ? s.GTE0PRE : s.GTE0], "")), L = (x) => (N, j, D, G, V, te, de, ie, we, ve, Q, ge) => (P(D) ? j = "" : P(G) ? j = `>=${D}.0.0${x ? "-0" : ""}` : P(V) ? j = `>=${D}.${G}.0${x ? "-0" : ""}` : te ? j = `>=${j}` : j = `>=${j}${x ? "-0" : ""}`, P(we) ? ie = "" : P(ve) ? ie = `<${+we + 1}.0.0-0` : P(Q) ? ie = `<${we}.${+ve + 1}.0-0` : ge ? ie = `<=${we}.${ve}.${Q}-${ge}` : x ? ie = `<${we}.${ve}.${+Q + 1}-0` : ie = `<=${ie}`, `${j} ${ie}`.trim()), q = (x, N, j) => {
    for (let D = 0; D < x.length; D++)
      if (!x[D].test(N))
        return !1;
    if (N.prerelease.length && !j.includePrerelease) {
      for (let D = 0; D < x.length; D++)
        if (i(x[D].semver), x[D].semver !== l.ANY && x[D].semver.prerelease.length > 0) {
          const G = x[D].semver;
          if (G.major === N.major && G.minor === N.minor && G.patch === N.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return Wi;
}
var Vi, Ws;
function an() {
  if (Ws) return Vi;
  Ws = 1;
  const e = /* @__PURE__ */ Symbol("SemVer ANY");
  class d {
    static get ANY() {
      return e;
    }
    constructor(a, r) {
      if (r = h(r), a instanceof d) {
        if (a.loose === !!r.loose)
          return a;
        a = a.value;
      }
      a = a.trim().split(/\s+/).join(" "), i("comparator", a, r), this.options = r, this.loose = !!r.loose, this.parse(a), this.semver === e ? this.value = "" : this.value = this.operator + this.semver.version, i("comp", this);
    }
    parse(a) {
      const r = this.options.loose ? c[f.COMPARATORLOOSE] : c[f.COMPARATOR], n = a.match(r);
      if (!n)
        throw new TypeError(`Invalid comparator: ${a}`);
      this.operator = n[1] !== void 0 ? n[1] : "", this.operator === "=" && (this.operator = ""), n[2] ? this.semver = new u(n[2], this.options.loose) : this.semver = e;
    }
    toString() {
      return this.value;
    }
    test(a) {
      if (i("Comparator.test", a, this.options.loose), this.semver === e || a === e)
        return !0;
      if (typeof a == "string")
        try {
          a = new u(a, this.options);
        } catch {
          return !1;
        }
      return l(a, this.operator, this.semver, this.options);
    }
    intersects(a, r) {
      if (!(a instanceof d))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new o(a.value, r).test(this.value) : a.operator === "" ? a.value === "" ? !0 : new o(this.value, r).test(a.semver) : (r = h(r), r.includePrerelease && (this.value === "<0.0.0-0" || a.value === "<0.0.0-0") || !r.includePrerelease && (this.value.startsWith("<0.0.0") || a.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && a.operator.startsWith(">") || this.operator.startsWith("<") && a.operator.startsWith("<") || this.semver.version === a.semver.version && this.operator.includes("=") && a.operator.includes("=") || l(this.semver, "<", a.semver, r) && this.operator.startsWith(">") && a.operator.startsWith("<") || l(this.semver, ">", a.semver, r) && this.operator.startsWith("<") && a.operator.startsWith(">")));
    }
  }
  Vi = d;
  const h = _a(), { safeRe: c, t: f } = br(), l = Su(), i = rn(), u = Be(), o = tt();
  return Vi;
}
var Yi, Vs;
function on() {
  if (Vs) return Yi;
  Vs = 1;
  const e = tt();
  return Yi = (h, c, f) => {
    try {
      c = new e(c, f);
    } catch {
      return !1;
    }
    return c.test(h);
  }, Yi;
}
var zi, Ys;
function Gf() {
  if (Ys) return zi;
  Ys = 1;
  const e = tt();
  return zi = (h, c) => new e(h, c).set.map((f) => f.map((l) => l.value).join(" ").trim().split(" ")), zi;
}
var Xi, zs;
function Wf() {
  if (zs) return Xi;
  zs = 1;
  const e = Be(), d = tt();
  return Xi = (c, f, l) => {
    let i = null, u = null, o = null;
    try {
      o = new d(f, l);
    } catch {
      return null;
    }
    return c.forEach((s) => {
      o.test(s) && (!i || u.compare(s) === -1) && (i = s, u = new e(i, l));
    }), i;
  }, Xi;
}
var Ji, Xs;
function Vf() {
  if (Xs) return Ji;
  Xs = 1;
  const e = Be(), d = tt();
  return Ji = (c, f, l) => {
    let i = null, u = null, o = null;
    try {
      o = new d(f, l);
    } catch {
      return null;
    }
    return c.forEach((s) => {
      o.test(s) && (!i || u.compare(s) === 1) && (i = s, u = new e(i, l));
    }), i;
  }, Ji;
}
var Ki, Js;
function Yf() {
  if (Js) return Ki;
  Js = 1;
  const e = Be(), d = tt(), h = nn();
  return Ki = (f, l) => {
    f = new d(f, l);
    let i = new e("0.0.0");
    if (f.test(i) || (i = new e("0.0.0-0"), f.test(i)))
      return i;
    i = null;
    for (let u = 0; u < f.set.length; ++u) {
      const o = f.set[u];
      let s = null;
      o.forEach((a) => {
        const r = new e(a.semver.version);
        switch (a.operator) {
          case ">":
            r.prerelease.length === 0 ? r.patch++ : r.prerelease.push(0), r.raw = r.format();
          /* fallthrough */
          case "":
          case ">=":
            (!s || h(r, s)) && (s = r);
            break;
          case "<":
          case "<=":
            break;
          /* istanbul ignore next */
          default:
            throw new Error(`Unexpected operation: ${a.operator}`);
        }
      }), s && (!i || h(i, s)) && (i = s);
    }
    return i && f.test(i) ? i : null;
  }, Ki;
}
var Qi, Ks;
function zf() {
  if (Ks) return Qi;
  Ks = 1;
  const e = tt();
  return Qi = (h, c) => {
    try {
      return new e(h, c).range || "*";
    } catch {
      return null;
    }
  }, Qi;
}
var Zi, Qs;
function Ca() {
  if (Qs) return Zi;
  Qs = 1;
  const e = Be(), d = an(), { ANY: h } = d, c = tt(), f = on(), l = nn(), i = Ra(), u = Ta(), o = Aa();
  return Zi = (a, r, n, p) => {
    a = new e(a, p), r = new c(r, p);
    let g, y, m, _, A;
    switch (n) {
      case ">":
        g = l, y = u, m = i, _ = ">", A = ">=";
        break;
      case "<":
        g = i, y = o, m = l, _ = "<", A = "<=";
        break;
      default:
        throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (f(a, r, p))
      return !1;
    for (let P = 0; P < r.set.length; ++P) {
      const O = r.set[P];
      let b = null, I = null;
      if (O.forEach((T) => {
        T.semver === h && (T = new d(">=0.0.0")), b = b || T, I = I || T, g(T.semver, b.semver, p) ? b = T : m(T.semver, I.semver, p) && (I = T);
      }), b.operator === _ || b.operator === A || (!I.operator || I.operator === _) && y(a, I.semver))
        return !1;
      if (I.operator === A && m(a, I.semver))
        return !1;
    }
    return !0;
  }, Zi;
}
var ea, Zs;
function Xf() {
  if (Zs) return ea;
  Zs = 1;
  const e = Ca();
  return ea = (h, c, f) => e(h, c, ">", f), ea;
}
var ta, el;
function Jf() {
  if (el) return ta;
  el = 1;
  const e = Ca();
  return ta = (h, c, f) => e(h, c, "<", f), ta;
}
var ra, tl;
function Kf() {
  if (tl) return ra;
  tl = 1;
  const e = tt();
  return ra = (h, c, f) => (h = new e(h, f), c = new e(c, f), h.intersects(c, f)), ra;
}
var na, rl;
function Qf() {
  if (rl) return na;
  rl = 1;
  const e = on(), d = et();
  return na = (h, c, f) => {
    const l = [];
    let i = null, u = null;
    const o = h.sort((n, p) => d(n, p, f));
    for (const n of o)
      e(n, c, f) ? (u = n, i || (i = n)) : (u && l.push([i, u]), u = null, i = null);
    i && l.push([i, null]);
    const s = [];
    for (const [n, p] of l)
      n === p ? s.push(n) : !p && n === o[0] ? s.push("*") : p ? n === o[0] ? s.push(`<=${p}`) : s.push(`${n} - ${p}`) : s.push(`>=${n}`);
    const a = s.join(" || "), r = typeof c.raw == "string" ? c.raw : String(c);
    return a.length < r.length ? a : c;
  }, na;
}
var ia, nl;
function Zf() {
  if (nl) return ia;
  nl = 1;
  const e = tt(), d = an(), { ANY: h } = d, c = on(), f = et(), l = (r, n, p = {}) => {
    if (r === n)
      return !0;
    r = new e(r, p), n = new e(n, p);
    let g = !1;
    e: for (const y of r.set) {
      for (const m of n.set) {
        const _ = o(y, m, p);
        if (g = g || _ !== null, _)
          continue e;
      }
      if (g)
        return !1;
    }
    return !0;
  }, i = [new d(">=0.0.0-0")], u = [new d(">=0.0.0")], o = (r, n, p) => {
    if (r === n)
      return !0;
    if (r.length === 1 && r[0].semver === h) {
      if (n.length === 1 && n[0].semver === h)
        return !0;
      p.includePrerelease ? r = i : r = u;
    }
    if (n.length === 1 && n[0].semver === h) {
      if (p.includePrerelease)
        return !0;
      n = u;
    }
    const g = /* @__PURE__ */ new Set();
    let y, m;
    for (const R of r)
      R.operator === ">" || R.operator === ">=" ? y = s(y, R, p) : R.operator === "<" || R.operator === "<=" ? m = a(m, R, p) : g.add(R.semver);
    if (g.size > 1)
      return null;
    let _;
    if (y && m) {
      if (_ = f(y.semver, m.semver, p), _ > 0)
        return null;
      if (_ === 0 && (y.operator !== ">=" || m.operator !== "<="))
        return null;
    }
    for (const R of g) {
      if (y && !c(R, String(y), p) || m && !c(R, String(m), p))
        return null;
      for (const E of n)
        if (!c(R, String(E), p))
          return !1;
      return !0;
    }
    let A, P, O, b, I = m && !p.includePrerelease && m.semver.prerelease.length ? m.semver : !1, T = y && !p.includePrerelease && y.semver.prerelease.length ? y.semver : !1;
    I && I.prerelease.length === 1 && m.operator === "<" && I.prerelease[0] === 0 && (I = !1);
    for (const R of n) {
      if (b = b || R.operator === ">" || R.operator === ">=", O = O || R.operator === "<" || R.operator === "<=", y) {
        if (T && R.semver.prerelease && R.semver.prerelease.length && R.semver.major === T.major && R.semver.minor === T.minor && R.semver.patch === T.patch && (T = !1), R.operator === ">" || R.operator === ">=") {
          if (A = s(y, R, p), A === R && A !== y)
            return !1;
        } else if (y.operator === ">=" && !c(y.semver, String(R), p))
          return !1;
      }
      if (m) {
        if (I && R.semver.prerelease && R.semver.prerelease.length && R.semver.major === I.major && R.semver.minor === I.minor && R.semver.patch === I.patch && (I = !1), R.operator === "<" || R.operator === "<=") {
          if (P = a(m, R, p), P === R && P !== m)
            return !1;
        } else if (m.operator === "<=" && !c(m.semver, String(R), p))
          return !1;
      }
      if (!R.operator && (m || y) && _ !== 0)
        return !1;
    }
    return !(y && O && !m && _ !== 0 || m && b && !y && _ !== 0 || T || I);
  }, s = (r, n, p) => {
    if (!r)
      return n;
    const g = f(r.semver, n.semver, p);
    return g > 0 ? r : g < 0 || n.operator === ">" && r.operator === ">=" ? n : r;
  }, a = (r, n, p) => {
    if (!r)
      return n;
    const g = f(r.semver, n.semver, p);
    return g < 0 ? r : g > 0 || n.operator === "<" && r.operator === "<=" ? n : r;
  };
  return ia = l, ia;
}
var aa, il;
function Ru() {
  if (il) return aa;
  il = 1;
  const e = br(), d = tn(), h = Be(), c = yu(), f = zt(), l = If(), i = Df(), u = Nf(), o = Ff(), s = xf(), a = Lf(), r = Uf(), n = kf(), p = et(), g = $f(), y = qf(), m = Sa(), _ = Mf(), A = Bf(), P = nn(), O = Ra(), b = wu(), I = _u(), T = Aa(), R = Ta(), E = Su(), k = Hf(), $ = an(), L = tt(), q = on(), x = Gf(), N = Wf(), j = Vf(), D = Yf(), G = zf(), V = Ca(), te = Xf(), de = Jf(), ie = Kf(), we = Qf(), ve = Zf();
  return aa = {
    parse: f,
    valid: l,
    clean: i,
    inc: u,
    diff: o,
    major: s,
    minor: a,
    patch: r,
    prerelease: n,
    compare: p,
    rcompare: g,
    compareLoose: y,
    compareBuild: m,
    sort: _,
    rsort: A,
    gt: P,
    lt: O,
    eq: b,
    neq: I,
    gte: T,
    lte: R,
    cmp: E,
    coerce: k,
    Comparator: $,
    Range: L,
    satisfies: q,
    toComparators: x,
    maxSatisfying: N,
    minSatisfying: j,
    minVersion: D,
    validRange: G,
    outside: V,
    gtr: te,
    ltr: de,
    intersects: ie,
    simplifyRange: we,
    subset: ve,
    SemVer: h,
    re: e.re,
    src: e.src,
    tokens: e.t,
    SEMVER_SPEC_VERSION: d.SEMVER_SPEC_VERSION,
    RELEASE_TYPES: d.RELEASE_TYPES,
    compareIdentifiers: c.compareIdentifiers,
    rcompareIdentifiers: c.rcompareIdentifiers
  }, aa;
}
var $t = {}, wr = { exports: {} };
wr.exports;
var al;
function ed() {
  return al || (al = 1, (function(e, d) {
    var h = 200, c = "__lodash_hash_undefined__", f = 1, l = 2, i = 9007199254740991, u = "[object Arguments]", o = "[object Array]", s = "[object AsyncFunction]", a = "[object Boolean]", r = "[object Date]", n = "[object Error]", p = "[object Function]", g = "[object GeneratorFunction]", y = "[object Map]", m = "[object Number]", _ = "[object Null]", A = "[object Object]", P = "[object Promise]", O = "[object Proxy]", b = "[object RegExp]", I = "[object Set]", T = "[object String]", R = "[object Symbol]", E = "[object Undefined]", k = "[object WeakMap]", $ = "[object ArrayBuffer]", L = "[object DataView]", q = "[object Float32Array]", x = "[object Float64Array]", N = "[object Int8Array]", j = "[object Int16Array]", D = "[object Int32Array]", G = "[object Uint8Array]", V = "[object Uint8ClampedArray]", te = "[object Uint16Array]", de = "[object Uint32Array]", ie = /[\\^$.*+?()[\]{}|]/g, we = /^\[object .+?Constructor\]$/, ve = /^(?:0|[1-9]\d*)$/, Q = {};
    Q[q] = Q[x] = Q[N] = Q[j] = Q[D] = Q[G] = Q[V] = Q[te] = Q[de] = !0, Q[u] = Q[o] = Q[$] = Q[a] = Q[L] = Q[r] = Q[n] = Q[p] = Q[y] = Q[m] = Q[A] = Q[b] = Q[I] = Q[T] = Q[k] = !1;
    var ge = typeof Qe == "object" && Qe && Qe.Object === Object && Qe, w = typeof self == "object" && self && self.Object === Object && self, v = ge || w || Function("return this")(), B = d && !d.nodeType && d, F = B && !0 && e && !e.nodeType && e, ce = F && F.exports === B, he = ce && ge.process, pe = (function() {
      try {
        return he && he.binding && he.binding("util");
      } catch {
      }
    })(), _e = pe && pe.isTypedArray;
    function Ee(C, U) {
      for (var K = -1, le = C == null ? 0 : C.length, Pe = 0, Se = []; ++K < le; ) {
        var Ne = C[K];
        U(Ne, K, C) && (Se[Pe++] = Ne);
      }
      return Se;
    }
    function He(C, U) {
      for (var K = -1, le = U.length, Pe = C.length; ++K < le; )
        C[Pe + K] = U[K];
      return C;
    }
    function Re(C, U) {
      for (var K = -1, le = C == null ? 0 : C.length; ++K < le; )
        if (U(C[K], K, C))
          return !0;
      return !1;
    }
    function qe(C, U) {
      for (var K = -1, le = Array(C); ++K < C; )
        le[K] = U(K);
      return le;
    }
    function lt(C) {
      return function(U) {
        return C(U);
      };
    }
    function it(C, U) {
      return C.has(U);
    }
    function rt(C, U) {
      return C?.[U];
    }
    function t(C) {
      var U = -1, K = Array(C.size);
      return C.forEach(function(le, Pe) {
        K[++U] = [Pe, le];
      }), K;
    }
    function H(C, U) {
      return function(K) {
        return C(U(K));
      };
    }
    function W(C) {
      var U = -1, K = Array(C.size);
      return C.forEach(function(le) {
        K[++U] = le;
      }), K;
    }
    var ne = Array.prototype, Y = Function.prototype, re = Object.prototype, Z = v["__core-js_shared__"], oe = Y.toString, ue = re.hasOwnProperty, Ae = (function() {
      var C = /[^.]+$/.exec(Z && Z.keys && Z.keys.IE_PROTO || "");
      return C ? "Symbol(src)_1." + C : "";
    })(), Te = re.toString, me = RegExp(
      "^" + oe.call(ue).replace(ie, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    ), S = ce ? v.Buffer : void 0, M = v.Symbol, z = v.Uint8Array, X = re.propertyIsEnumerable, J = ne.splice, ae = M ? M.toStringTag : void 0, ee = Object.getOwnPropertySymbols, se = S ? S.isBuffer : void 0, fe = H(Object.keys, Object), ye = Lt(v, "DataView"), be = Lt(v, "Map"), De = Lt(v, "Promise"), Ce = Lt(v, "Set"), xt = Lt(v, "WeakMap"), Je = Lt(Object, "create"), yt = St(ye), Hu = St(be), ju = St(De), Gu = St(Ce), Wu = St(xt), Ia = M ? M.prototype : void 0, ln = Ia ? Ia.valueOf : void 0;
    function wt(C) {
      var U = -1, K = C == null ? 0 : C.length;
      for (this.clear(); ++U < K; ) {
        var le = C[U];
        this.set(le[0], le[1]);
      }
    }
    function Vu() {
      this.__data__ = Je ? Je(null) : {}, this.size = 0;
    }
    function Yu(C) {
      var U = this.has(C) && delete this.__data__[C];
      return this.size -= U ? 1 : 0, U;
    }
    function zu(C) {
      var U = this.__data__;
      if (Je) {
        var K = U[C];
        return K === c ? void 0 : K;
      }
      return ue.call(U, C) ? U[C] : void 0;
    }
    function Xu(C) {
      var U = this.__data__;
      return Je ? U[C] !== void 0 : ue.call(U, C);
    }
    function Ju(C, U) {
      var K = this.__data__;
      return this.size += this.has(C) ? 0 : 1, K[C] = Je && U === void 0 ? c : U, this;
    }
    wt.prototype.clear = Vu, wt.prototype.delete = Yu, wt.prototype.get = zu, wt.prototype.has = Xu, wt.prototype.set = Ju;
    function at(C) {
      var U = -1, K = C == null ? 0 : C.length;
      for (this.clear(); ++U < K; ) {
        var le = C[U];
        this.set(le[0], le[1]);
      }
    }
    function Ku() {
      this.__data__ = [], this.size = 0;
    }
    function Qu(C) {
      var U = this.__data__, K = Or(U, C);
      if (K < 0)
        return !1;
      var le = U.length - 1;
      return K == le ? U.pop() : J.call(U, K, 1), --this.size, !0;
    }
    function Zu(C) {
      var U = this.__data__, K = Or(U, C);
      return K < 0 ? void 0 : U[K][1];
    }
    function ec(C) {
      return Or(this.__data__, C) > -1;
    }
    function tc(C, U) {
      var K = this.__data__, le = Or(K, C);
      return le < 0 ? (++this.size, K.push([C, U])) : K[le][1] = U, this;
    }
    at.prototype.clear = Ku, at.prototype.delete = Qu, at.prototype.get = Zu, at.prototype.has = ec, at.prototype.set = tc;
    function _t(C) {
      var U = -1, K = C == null ? 0 : C.length;
      for (this.clear(); ++U < K; ) {
        var le = C[U];
        this.set(le[0], le[1]);
      }
    }
    function rc() {
      this.size = 0, this.__data__ = {
        hash: new wt(),
        map: new (be || at)(),
        string: new wt()
      };
    }
    function nc(C) {
      var U = Ir(this, C).delete(C);
      return this.size -= U ? 1 : 0, U;
    }
    function ic(C) {
      return Ir(this, C).get(C);
    }
    function ac(C) {
      return Ir(this, C).has(C);
    }
    function oc(C, U) {
      var K = Ir(this, C), le = K.size;
      return K.set(C, U), this.size += K.size == le ? 0 : 1, this;
    }
    _t.prototype.clear = rc, _t.prototype.delete = nc, _t.prototype.get = ic, _t.prototype.has = ac, _t.prototype.set = oc;
    function Pr(C) {
      var U = -1, K = C == null ? 0 : C.length;
      for (this.__data__ = new _t(); ++U < K; )
        this.add(C[U]);
    }
    function sc(C) {
      return this.__data__.set(C, c), this;
    }
    function lc(C) {
      return this.__data__.has(C);
    }
    Pr.prototype.add = Pr.prototype.push = sc, Pr.prototype.has = lc;
    function ut(C) {
      var U = this.__data__ = new at(C);
      this.size = U.size;
    }
    function uc() {
      this.__data__ = new at(), this.size = 0;
    }
    function cc(C) {
      var U = this.__data__, K = U.delete(C);
      return this.size = U.size, K;
    }
    function fc(C) {
      return this.__data__.get(C);
    }
    function dc(C) {
      return this.__data__.has(C);
    }
    function hc(C, U) {
      var K = this.__data__;
      if (K instanceof at) {
        var le = K.__data__;
        if (!be || le.length < h - 1)
          return le.push([C, U]), this.size = ++K.size, this;
        K = this.__data__ = new _t(le);
      }
      return K.set(C, U), this.size = K.size, this;
    }
    ut.prototype.clear = uc, ut.prototype.delete = cc, ut.prototype.get = fc, ut.prototype.has = dc, ut.prototype.set = hc;
    function pc(C, U) {
      var K = Dr(C), le = !K && Oc(C), Pe = !K && !le && un(C), Se = !K && !le && !Pe && qa(C), Ne = K || le || Pe || Se, Fe = Ne ? qe(C.length, String) : [], Le = Fe.length;
      for (var Oe in C)
        ue.call(C, Oe) && !(Ne && // Safari 9 has enumerable `arguments.length` in strict mode.
        (Oe == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
        Pe && (Oe == "offset" || Oe == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
        Se && (Oe == "buffer" || Oe == "byteLength" || Oe == "byteOffset") || // Skip index properties.
        Ac(Oe, Le))) && Fe.push(Oe);
      return Fe;
    }
    function Or(C, U) {
      for (var K = C.length; K--; )
        if (La(C[K][0], U))
          return K;
      return -1;
    }
    function mc(C, U, K) {
      var le = U(C);
      return Dr(C) ? le : He(le, K(C));
    }
    function Xt(C) {
      return C == null ? C === void 0 ? E : _ : ae && ae in Object(C) ? Sc(C) : Pc(C);
    }
    function Da(C) {
      return Jt(C) && Xt(C) == u;
    }
    function Na(C, U, K, le, Pe) {
      return C === U ? !0 : C == null || U == null || !Jt(C) && !Jt(U) ? C !== C && U !== U : gc(C, U, K, le, Na, Pe);
    }
    function gc(C, U, K, le, Pe, Se) {
      var Ne = Dr(C), Fe = Dr(U), Le = Ne ? o : ct(C), Oe = Fe ? o : ct(U);
      Le = Le == u ? A : Le, Oe = Oe == u ? A : Oe;
      var Ge = Le == A, Ke = Oe == A, Ue = Le == Oe;
      if (Ue && un(C)) {
        if (!un(U))
          return !1;
        Ne = !0, Ge = !1;
      }
      if (Ue && !Ge)
        return Se || (Se = new ut()), Ne || qa(C) ? Fa(C, U, K, le, Pe, Se) : wc(C, U, Le, K, le, Pe, Se);
      if (!(K & f)) {
        var ze = Ge && ue.call(C, "__wrapped__"), Xe = Ke && ue.call(U, "__wrapped__");
        if (ze || Xe) {
          var ft = ze ? C.value() : C, ot = Xe ? U.value() : U;
          return Se || (Se = new ut()), Pe(ft, ot, K, le, Se);
        }
      }
      return Ue ? (Se || (Se = new ut()), _c(C, U, K, le, Pe, Se)) : !1;
    }
    function vc(C) {
      if (!$a(C) || Cc(C))
        return !1;
      var U = Ua(C) ? me : we;
      return U.test(St(C));
    }
    function Ec(C) {
      return Jt(C) && ka(C.length) && !!Q[Xt(C)];
    }
    function yc(C) {
      if (!bc(C))
        return fe(C);
      var U = [];
      for (var K in Object(C))
        ue.call(C, K) && K != "constructor" && U.push(K);
      return U;
    }
    function Fa(C, U, K, le, Pe, Se) {
      var Ne = K & f, Fe = C.length, Le = U.length;
      if (Fe != Le && !(Ne && Le > Fe))
        return !1;
      var Oe = Se.get(C);
      if (Oe && Se.get(U))
        return Oe == U;
      var Ge = -1, Ke = !0, Ue = K & l ? new Pr() : void 0;
      for (Se.set(C, U), Se.set(U, C); ++Ge < Fe; ) {
        var ze = C[Ge], Xe = U[Ge];
        if (le)
          var ft = Ne ? le(Xe, ze, Ge, U, C, Se) : le(ze, Xe, Ge, C, U, Se);
        if (ft !== void 0) {
          if (ft)
            continue;
          Ke = !1;
          break;
        }
        if (Ue) {
          if (!Re(U, function(ot, Rt) {
            if (!it(Ue, Rt) && (ze === ot || Pe(ze, ot, K, le, Se)))
              return Ue.push(Rt);
          })) {
            Ke = !1;
            break;
          }
        } else if (!(ze === Xe || Pe(ze, Xe, K, le, Se))) {
          Ke = !1;
          break;
        }
      }
      return Se.delete(C), Se.delete(U), Ke;
    }
    function wc(C, U, K, le, Pe, Se, Ne) {
      switch (K) {
        case L:
          if (C.byteLength != U.byteLength || C.byteOffset != U.byteOffset)
            return !1;
          C = C.buffer, U = U.buffer;
        case $:
          return !(C.byteLength != U.byteLength || !Se(new z(C), new z(U)));
        case a:
        case r:
        case m:
          return La(+C, +U);
        case n:
          return C.name == U.name && C.message == U.message;
        case b:
        case T:
          return C == U + "";
        case y:
          var Fe = t;
        case I:
          var Le = le & f;
          if (Fe || (Fe = W), C.size != U.size && !Le)
            return !1;
          var Oe = Ne.get(C);
          if (Oe)
            return Oe == U;
          le |= l, Ne.set(C, U);
          var Ge = Fa(Fe(C), Fe(U), le, Pe, Se, Ne);
          return Ne.delete(C), Ge;
        case R:
          if (ln)
            return ln.call(C) == ln.call(U);
      }
      return !1;
    }
    function _c(C, U, K, le, Pe, Se) {
      var Ne = K & f, Fe = xa(C), Le = Fe.length, Oe = xa(U), Ge = Oe.length;
      if (Le != Ge && !Ne)
        return !1;
      for (var Ke = Le; Ke--; ) {
        var Ue = Fe[Ke];
        if (!(Ne ? Ue in U : ue.call(U, Ue)))
          return !1;
      }
      var ze = Se.get(C);
      if (ze && Se.get(U))
        return ze == U;
      var Xe = !0;
      Se.set(C, U), Se.set(U, C);
      for (var ft = Ne; ++Ke < Le; ) {
        Ue = Fe[Ke];
        var ot = C[Ue], Rt = U[Ue];
        if (le)
          var Ma = Ne ? le(Rt, ot, Ue, U, C, Se) : le(ot, Rt, Ue, C, U, Se);
        if (!(Ma === void 0 ? ot === Rt || Pe(ot, Rt, K, le, Se) : Ma)) {
          Xe = !1;
          break;
        }
        ft || (ft = Ue == "constructor");
      }
      if (Xe && !ft) {
        var Nr = C.constructor, Fr = U.constructor;
        Nr != Fr && "constructor" in C && "constructor" in U && !(typeof Nr == "function" && Nr instanceof Nr && typeof Fr == "function" && Fr instanceof Fr) && (Xe = !1);
      }
      return Se.delete(C), Se.delete(U), Xe;
    }
    function xa(C) {
      return mc(C, Nc, Rc);
    }
    function Ir(C, U) {
      var K = C.__data__;
      return Tc(U) ? K[typeof U == "string" ? "string" : "hash"] : K.map;
    }
    function Lt(C, U) {
      var K = rt(C, U);
      return vc(K) ? K : void 0;
    }
    function Sc(C) {
      var U = ue.call(C, ae), K = C[ae];
      try {
        C[ae] = void 0;
        var le = !0;
      } catch {
      }
      var Pe = Te.call(C);
      return le && (U ? C[ae] = K : delete C[ae]), Pe;
    }
    var Rc = ee ? function(C) {
      return C == null ? [] : (C = Object(C), Ee(ee(C), function(U) {
        return X.call(C, U);
      }));
    } : Fc, ct = Xt;
    (ye && ct(new ye(new ArrayBuffer(1))) != L || be && ct(new be()) != y || De && ct(De.resolve()) != P || Ce && ct(new Ce()) != I || xt && ct(new xt()) != k) && (ct = function(C) {
      var U = Xt(C), K = U == A ? C.constructor : void 0, le = K ? St(K) : "";
      if (le)
        switch (le) {
          case yt:
            return L;
          case Hu:
            return y;
          case ju:
            return P;
          case Gu:
            return I;
          case Wu:
            return k;
        }
      return U;
    });
    function Ac(C, U) {
      return U = U ?? i, !!U && (typeof C == "number" || ve.test(C)) && C > -1 && C % 1 == 0 && C < U;
    }
    function Tc(C) {
      var U = typeof C;
      return U == "string" || U == "number" || U == "symbol" || U == "boolean" ? C !== "__proto__" : C === null;
    }
    function Cc(C) {
      return !!Ae && Ae in C;
    }
    function bc(C) {
      var U = C && C.constructor, K = typeof U == "function" && U.prototype || re;
      return C === K;
    }
    function Pc(C) {
      return Te.call(C);
    }
    function St(C) {
      if (C != null) {
        try {
          return oe.call(C);
        } catch {
        }
        try {
          return C + "";
        } catch {
        }
      }
      return "";
    }
    function La(C, U) {
      return C === U || C !== C && U !== U;
    }
    var Oc = Da(/* @__PURE__ */ (function() {
      return arguments;
    })()) ? Da : function(C) {
      return Jt(C) && ue.call(C, "callee") && !X.call(C, "callee");
    }, Dr = Array.isArray;
    function Ic(C) {
      return C != null && ka(C.length) && !Ua(C);
    }
    var un = se || xc;
    function Dc(C, U) {
      return Na(C, U);
    }
    function Ua(C) {
      if (!$a(C))
        return !1;
      var U = Xt(C);
      return U == p || U == g || U == s || U == O;
    }
    function ka(C) {
      return typeof C == "number" && C > -1 && C % 1 == 0 && C <= i;
    }
    function $a(C) {
      var U = typeof C;
      return C != null && (U == "object" || U == "function");
    }
    function Jt(C) {
      return C != null && typeof C == "object";
    }
    var qa = _e ? lt(_e) : Ec;
    function Nc(C) {
      return Ic(C) ? pc(C) : yc(C);
    }
    function Fc() {
      return [];
    }
    function xc() {
      return !1;
    }
    e.exports = Dc;
  })(wr, wr.exports)), wr.exports;
}
var ol;
function td() {
  if (ol) return $t;
  ol = 1, Object.defineProperty($t, "__esModule", { value: !0 }), $t.DownloadedUpdateHelper = void 0, $t.createTempUpdateFile = u;
  const e = Ar, d = gt, h = ed(), c = /* @__PURE__ */ Et(), f = Ie;
  let l = class {
    constructor(s) {
      this.cacheDir = s, this._file = null, this._packageFile = null, this.versionInfo = null, this.fileInfo = null, this._downloadedFileInfo = null;
    }
    get downloadedFileInfo() {
      return this._downloadedFileInfo;
    }
    get file() {
      return this._file;
    }
    get packageFile() {
      return this._packageFile;
    }
    get cacheDirForPendingUpdate() {
      return f.join(this.cacheDir, "pending");
    }
    async validateDownloadedPath(s, a, r, n) {
      if (this.versionInfo != null && this.file === s && this.fileInfo != null)
        return h(this.versionInfo, a) && h(this.fileInfo.info, r.info) && await (0, c.pathExists)(s) ? s : null;
      const p = await this.getValidCachedUpdateFile(r, n);
      return p === null ? null : (n.info(`Update has already been downloaded to ${s}).`), this._file = p, p);
    }
    async setDownloadedFile(s, a, r, n, p, g) {
      this._file = s, this._packageFile = a, this.versionInfo = r, this.fileInfo = n, this._downloadedFileInfo = {
        fileName: p,
        sha512: n.info.sha512,
        isAdminRightsRequired: n.info.isAdminRightsRequired === !0
      }, g && await (0, c.outputJson)(this.getUpdateInfoFile(), this._downloadedFileInfo);
    }
    async clear() {
      this._file = null, this._packageFile = null, this.versionInfo = null, this.fileInfo = null, await this.cleanCacheDirForPendingUpdate();
    }
    async cleanCacheDirForPendingUpdate() {
      try {
        await (0, c.emptyDir)(this.cacheDirForPendingUpdate);
      } catch {
      }
    }
    /**
     * Returns "update-info.json" which is created in the update cache directory's "pending" subfolder after the first update is downloaded.  If the update file does not exist then the cache is cleared and recreated.  If the update file exists then its properties are validated.
     * @param fileInfo
     * @param logger
     */
    async getValidCachedUpdateFile(s, a) {
      const r = this.getUpdateInfoFile();
      if (!await (0, c.pathExists)(r))
        return null;
      let p;
      try {
        p = await (0, c.readJson)(r);
      } catch (_) {
        let A = "No cached update info available";
        return _.code !== "ENOENT" && (await this.cleanCacheDirForPendingUpdate(), A += ` (error on read: ${_.message})`), a.info(A), null;
      }
      if (!(p?.fileName !== null))
        return a.warn("Cached update info is corrupted: no fileName, directory for cached update will be cleaned"), await this.cleanCacheDirForPendingUpdate(), null;
      if (s.info.sha512 !== p.sha512)
        return a.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${p.sha512}, expected: ${s.info.sha512}. Directory for cached update will be cleaned`), await this.cleanCacheDirForPendingUpdate(), null;
      const y = f.join(this.cacheDirForPendingUpdate, p.fileName);
      if (!await (0, c.pathExists)(y))
        return a.info("Cached update file doesn't exist"), null;
      const m = await i(y);
      return s.info.sha512 !== m ? (a.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${m}, expected: ${s.info.sha512}`), await this.cleanCacheDirForPendingUpdate(), null) : (this._downloadedFileInfo = p, y);
    }
    getUpdateInfoFile() {
      return f.join(this.cacheDirForPendingUpdate, "update-info.json");
    }
  };
  $t.DownloadedUpdateHelper = l;
  function i(o, s = "sha512", a = "base64", r) {
    return new Promise((n, p) => {
      const g = (0, e.createHash)(s);
      g.on("error", p).setEncoding(a), (0, d.createReadStream)(o, {
        ...r,
        highWaterMark: 1024 * 1024
        /* better to use more memory but hash faster */
      }).on("error", p).on("end", () => {
        g.end(), n(g.read());
      }).pipe(g, { end: !1 });
    });
  }
  async function u(o, s, a) {
    let r = 0, n = f.join(s, o);
    for (let p = 0; p < 3; p++)
      try {
        return await (0, c.unlink)(n), n;
      } catch (g) {
        if (g.code === "ENOENT")
          return n;
        a.warn(`Error on remove temp update file: ${g}`), n = f.join(s, `${r++}-${o}`);
      }
    return n;
  }
  return $t;
}
var tr = {}, Wr = {}, sl;
function rd() {
  if (sl) return Wr;
  sl = 1, Object.defineProperty(Wr, "__esModule", { value: !0 }), Wr.getAppCacheDir = h;
  const e = Ie, d = Qr;
  function h() {
    const c = (0, d.homedir)();
    let f;
    return process.platform === "win32" ? f = process.env.LOCALAPPDATA || e.join(c, "AppData", "Local") : process.platform === "darwin" ? f = e.join(c, "Library", "Caches") : f = process.env.XDG_CACHE_HOME || e.join(c, ".cache"), f;
  }
  return Wr;
}
var ll;
function nd() {
  if (ll) return tr;
  ll = 1, Object.defineProperty(tr, "__esModule", { value: !0 }), tr.ElectronAppAdapter = void 0;
  const e = Ie, d = rd();
  let h = class {
    constructor(f = It.app) {
      this.app = f;
    }
    whenReady() {
      return this.app.whenReady();
    }
    get version() {
      return this.app.getVersion();
    }
    get name() {
      return this.app.getName();
    }
    get isPackaged() {
      return this.app.isPackaged === !0;
    }
    get appUpdateConfigPath() {
      return this.isPackaged ? e.join(process.resourcesPath, "app-update.yml") : e.join(this.app.getAppPath(), "dev-app-update.yml");
    }
    get userDataPath() {
      return this.app.getPath("userData");
    }
    get baseCachePath() {
      return (0, d.getAppCacheDir)();
    }
    quit() {
      this.app.quit();
    }
    relaunch() {
      this.app.relaunch();
    }
    onQuit(f) {
      this.app.once("quit", (l, i) => f(i));
    }
  };
  return tr.ElectronAppAdapter = h, tr;
}
var oa = {}, ul;
function id() {
  return ul || (ul = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.ElectronHttpExecutor = e.NET_SESSION_NAME = void 0, e.getNetSession = h;
    const d = xe();
    e.NET_SESSION_NAME = "electron-updater";
    function h() {
      return It.session.fromPartition(e.NET_SESSION_NAME, {
        cache: !1
      });
    }
    class c extends d.HttpExecutor {
      constructor(l) {
        super(), this.proxyLoginCallback = l, this.cachedSession = null;
      }
      async download(l, i, u) {
        return await u.cancellationToken.createPromise((o, s, a) => {
          const r = {
            headers: u.headers || void 0,
            redirect: "manual"
          };
          (0, d.configureRequestUrl)(l, r), (0, d.configureRequestOptions)(r), this.doDownload(r, {
            destination: i,
            options: u,
            onCancel: a,
            callback: (n) => {
              n == null ? o(i) : s(n);
            },
            responseHandler: null
          }, 0);
        });
      }
      createRequest(l, i) {
        l.headers && l.headers.Host && (l.host = l.headers.Host, delete l.headers.Host), this.cachedSession == null && (this.cachedSession = h());
        const u = It.net.request({
          ...l,
          session: this.cachedSession
        });
        return u.on("response", i), this.proxyLoginCallback != null && u.on("login", this.proxyLoginCallback), u;
      }
      addRedirectHandlers(l, i, u, o, s) {
        l.on("redirect", (a, r, n) => {
          l.abort(), o > this.maxRedirects ? u(this.createMaxRedirectError()) : s(d.HttpExecutor.prepareRedirectUrlOptions(n, i));
        });
      }
    }
    e.ElectronHttpExecutor = c;
  })(oa)), oa;
}
var rr = {}, qt = {}, cl;
function Nt() {
  if (cl) return qt;
  cl = 1, Object.defineProperty(qt, "__esModule", { value: !0 }), qt.newBaseUrl = d, qt.newUrlFromBase = h, qt.getChannelFilename = c;
  const e = vt;
  function d(f) {
    const l = new e.URL(f);
    return l.pathname.endsWith("/") || (l.pathname += "/"), l;
  }
  function h(f, l, i = !1) {
    const u = new e.URL(f, l), o = l.search;
    return o != null && o.length !== 0 ? u.search = o : i && (u.search = `noCache=${Date.now().toString(32)}`), u;
  }
  function c(f) {
    return `${f}.yml`;
  }
  return qt;
}
var st = {}, sa, fl;
function Au() {
  if (fl) return sa;
  fl = 1;
  var e = "[object Symbol]", d = /[\\^$.*+?()[\]{}|]/g, h = RegExp(d.source), c = typeof Qe == "object" && Qe && Qe.Object === Object && Qe, f = typeof self == "object" && self && self.Object === Object && self, l = c || f || Function("return this")(), i = Object.prototype, u = i.toString, o = l.Symbol, s = o ? o.prototype : void 0, a = s ? s.toString : void 0;
  function r(m) {
    if (typeof m == "string")
      return m;
    if (p(m))
      return a ? a.call(m) : "";
    var _ = m + "";
    return _ == "0" && 1 / m == -1 / 0 ? "-0" : _;
  }
  function n(m) {
    return !!m && typeof m == "object";
  }
  function p(m) {
    return typeof m == "symbol" || n(m) && u.call(m) == e;
  }
  function g(m) {
    return m == null ? "" : r(m);
  }
  function y(m) {
    return m = g(m), m && h.test(m) ? m.replace(d, "\\$&") : m;
  }
  return sa = y, sa;
}
var dl;
function Ye() {
  if (dl) return st;
  dl = 1, Object.defineProperty(st, "__esModule", { value: !0 }), st.Provider = void 0, st.findFile = i, st.parseUpdateInfo = u, st.getFileList = o, st.resolveFiles = s;
  const e = xe(), d = wa(), h = vt, c = Nt(), f = Au();
  let l = class {
    constructor(r) {
      this.runtimeOptions = r, this.requestHeaders = null, this.executor = r.executor;
    }
    // By default, the blockmap file is in the same directory as the main file
    // But some providers may have a different blockmap file, so we need to override this method
    getBlockMapFiles(r, n, p, g = null) {
      const y = (0, c.newUrlFromBase)(`${r.pathname}.blockmap`, r);
      return [(0, c.newUrlFromBase)(`${r.pathname.replace(new RegExp(f(p), "g"), n)}.blockmap`, g ? new h.URL(g) : r), y];
    }
    get isUseMultipleRangeRequest() {
      return this.runtimeOptions.isUseMultipleRangeRequest !== !1;
    }
    getChannelFilePrefix() {
      if (this.runtimeOptions.platform === "linux") {
        const r = process.env.TEST_UPDATER_ARCH || process.arch;
        return "-linux" + (r === "x64" ? "" : `-${r}`);
      } else
        return this.runtimeOptions.platform === "darwin" ? "-mac" : "";
    }
    // due to historical reasons for windows we use channel name without platform specifier
    getDefaultChannelName() {
      return this.getCustomChannelName("latest");
    }
    getCustomChannelName(r) {
      return `${r}${this.getChannelFilePrefix()}`;
    }
    get fileExtraDownloadHeaders() {
      return null;
    }
    setRequestHeaders(r) {
      this.requestHeaders = r;
    }
    /**
     * Method to perform API request only to resolve update info, but not to download update.
     */
    httpRequest(r, n, p) {
      return this.executor.request(this.createRequestOptions(r, n), p);
    }
    createRequestOptions(r, n) {
      const p = {};
      return this.requestHeaders == null ? n != null && (p.headers = n) : p.headers = n == null ? this.requestHeaders : { ...this.requestHeaders, ...n }, (0, e.configureRequestUrl)(r, p), p;
    }
  };
  st.Provider = l;
  function i(a, r, n) {
    var p;
    if (a.length === 0)
      throw (0, e.newError)("No files provided", "ERR_UPDATER_NO_FILES_PROVIDED");
    const g = a.filter((m) => m.url.pathname.toLowerCase().endsWith(`.${r.toLowerCase()}`)), y = (p = g.find((m) => [m.url.pathname, m.info.url].some((_) => _.includes(process.arch)))) !== null && p !== void 0 ? p : g.shift();
    return y || (n == null ? a[0] : a.find((m) => !n.some((_) => m.url.pathname.toLowerCase().endsWith(`.${_.toLowerCase()}`))));
  }
  function u(a, r, n) {
    if (a == null)
      throw (0, e.newError)(`Cannot parse update info from ${r} in the latest release artifacts (${n}): rawData: null`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    let p;
    try {
      p = (0, d.load)(a);
    } catch (g) {
      throw (0, e.newError)(`Cannot parse update info from ${r} in the latest release artifacts (${n}): ${g.stack || g.message}, rawData: ${a}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
    }
    return p;
  }
  function o(a) {
    const r = a.files;
    if (r != null && r.length > 0)
      return r;
    if (a.path != null)
      return [
        {
          url: a.path,
          sha2: a.sha2,
          sha512: a.sha512
        }
      ];
    throw (0, e.newError)(`No files provided: ${(0, e.safeStringifyJson)(a)}`, "ERR_UPDATER_NO_FILES_PROVIDED");
  }
  function s(a, r, n = (p) => p) {
    const g = o(a).map((_) => {
      if (_.sha2 == null && _.sha512 == null)
        throw (0, e.newError)(`Update info doesn't contain nor sha256 neither sha512 checksum: ${(0, e.safeStringifyJson)(_)}`, "ERR_UPDATER_NO_CHECKSUM");
      return {
        url: (0, c.newUrlFromBase)(n(_.url), r),
        info: _
      };
    }), y = a.packages, m = y == null ? null : y[process.arch] || y.ia32;
    return m != null && (g[0].packageInfo = {
      ...m,
      path: (0, c.newUrlFromBase)(n(m.path), r).href
    }), g;
  }
  return st;
}
var hl;
function Tu() {
  if (hl) return rr;
  hl = 1, Object.defineProperty(rr, "__esModule", { value: !0 }), rr.GenericProvider = void 0;
  const e = xe(), d = Nt(), h = Ye();
  let c = class extends h.Provider {
    constructor(l, i, u) {
      super(u), this.configuration = l, this.updater = i, this.baseUrl = (0, d.newBaseUrl)(this.configuration.url);
    }
    get channel() {
      const l = this.updater.channel || this.configuration.channel;
      return l == null ? this.getDefaultChannelName() : this.getCustomChannelName(l);
    }
    async getLatestVersion() {
      const l = (0, d.getChannelFilename)(this.channel), i = (0, d.newUrlFromBase)(l, this.baseUrl, this.updater.isAddNoCacheQuery);
      for (let u = 0; ; u++)
        try {
          return (0, h.parseUpdateInfo)(await this.httpRequest(i), l, i);
        } catch (o) {
          if (o instanceof e.HttpError && o.statusCode === 404)
            throw (0, e.newError)(`Cannot find channel "${l}" update info: ${o.stack || o.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          if (o.code === "ECONNREFUSED" && u < 3) {
            await new Promise((s, a) => {
              try {
                setTimeout(s, 1e3 * u);
              } catch (r) {
                a(r);
              }
            });
            continue;
          }
          throw o;
        }
    }
    resolveFiles(l) {
      return (0, h.resolveFiles)(l, this.baseUrl);
    }
  };
  return rr.GenericProvider = c, rr;
}
var nr = {}, ir = {}, pl;
function ad() {
  if (pl) return ir;
  pl = 1, Object.defineProperty(ir, "__esModule", { value: !0 }), ir.BitbucketProvider = void 0;
  const e = xe(), d = Nt(), h = Ye();
  let c = class extends h.Provider {
    constructor(l, i, u) {
      super({
        ...u,
        isUseMultipleRangeRequest: !1
      }), this.configuration = l, this.updater = i;
      const { owner: o, slug: s } = l;
      this.baseUrl = (0, d.newBaseUrl)(`https://api.bitbucket.org/2.0/repositories/${o}/${s}/downloads`);
    }
    get channel() {
      return this.updater.channel || this.configuration.channel || "latest";
    }
    async getLatestVersion() {
      const l = new e.CancellationToken(), i = (0, d.getChannelFilename)(this.getCustomChannelName(this.channel)), u = (0, d.newUrlFromBase)(i, this.baseUrl, this.updater.isAddNoCacheQuery);
      try {
        const o = await this.httpRequest(u, void 0, l);
        return (0, h.parseUpdateInfo)(o, i, u);
      } catch (o) {
        throw (0, e.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${o.stack || o.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    resolveFiles(l) {
      return (0, h.resolveFiles)(l, this.baseUrl);
    }
    toString() {
      const { owner: l, slug: i } = this.configuration;
      return `Bitbucket (owner: ${l}, slug: ${i}, channel: ${this.channel})`;
    }
  };
  return ir.BitbucketProvider = c, ir;
}
var ht = {}, ml;
function Cu() {
  if (ml) return ht;
  ml = 1, Object.defineProperty(ht, "__esModule", { value: !0 }), ht.GitHubProvider = ht.BaseGitHubProvider = void 0, ht.computeReleaseNotes = s;
  const e = xe(), d = Ru(), h = vt, c = Nt(), f = Ye(), l = /\/tag\/([^/]+)$/;
  class i extends f.Provider {
    constructor(r, n, p) {
      super({
        ...p,
        /* because GitHib uses S3 */
        isUseMultipleRangeRequest: !1
      }), this.options = r, this.baseUrl = (0, c.newBaseUrl)((0, e.githubUrl)(r, n));
      const g = n === "github.com" ? "api.github.com" : n;
      this.baseApiUrl = (0, c.newBaseUrl)((0, e.githubUrl)(r, g));
    }
    computeGithubBasePath(r) {
      const n = this.options.host;
      return n && !["github.com", "api.github.com"].includes(n) ? `/api/v3${r}` : r;
    }
  }
  ht.BaseGitHubProvider = i;
  let u = class extends i {
    constructor(r, n, p) {
      super(r, "github.com", p), this.options = r, this.updater = n;
    }
    get channel() {
      const r = this.updater.channel || this.options.channel;
      return r == null ? this.getDefaultChannelName() : this.getCustomChannelName(r);
    }
    async getLatestVersion() {
      var r, n, p, g, y;
      const m = new e.CancellationToken(), _ = await this.httpRequest((0, c.newUrlFromBase)(`${this.basePath}.atom`, this.baseUrl), {
        accept: "application/xml, application/atom+xml, text/xml, */*"
      }, m), A = (0, e.parseXml)(_);
      let P = A.element("entry", !1, "No published versions on GitHub"), O = null;
      try {
        if (this.updater.allowPrerelease) {
          const k = ((r = this.updater) === null || r === void 0 ? void 0 : r.channel) || ((n = d.prerelease(this.updater.currentVersion)) === null || n === void 0 ? void 0 : n[0]) || null;
          if (k === null)
            O = l.exec(P.element("link").attribute("href"))[1];
          else
            for (const $ of A.getElements("entry")) {
              const L = l.exec($.element("link").attribute("href"));
              if (L === null)
                continue;
              const q = L[1], x = ((p = d.prerelease(q)) === null || p === void 0 ? void 0 : p[0]) || null, N = !k || ["alpha", "beta"].includes(k), j = x !== null && !["alpha", "beta"].includes(String(x));
              if (N && !j && !(k === "beta" && x === "alpha")) {
                O = q;
                break;
              }
              if (x && x === k) {
                O = q;
                break;
              }
            }
        } else {
          O = await this.getLatestTagName(m);
          for (const k of A.getElements("entry"))
            if (l.exec(k.element("link").attribute("href"))[1] === O) {
              P = k;
              break;
            }
        }
      } catch (k) {
        throw (0, e.newError)(`Cannot parse releases feed: ${k.stack || k.message},
XML:
${_}`, "ERR_UPDATER_INVALID_RELEASE_FEED");
      }
      if (O == null)
        throw (0, e.newError)("No published versions on GitHub", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
      let b, I = "", T = "";
      const R = async (k) => {
        I = (0, c.getChannelFilename)(k), T = (0, c.newUrlFromBase)(this.getBaseDownloadPath(String(O), I), this.baseUrl);
        const $ = this.createRequestOptions(T);
        try {
          return await this.executor.request($, m);
        } catch (L) {
          throw L instanceof e.HttpError && L.statusCode === 404 ? (0, e.newError)(`Cannot find ${I} in the latest release artifacts (${T}): ${L.stack || L.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : L;
        }
      };
      try {
        let k = this.channel;
        this.updater.allowPrerelease && (!((g = d.prerelease(O)) === null || g === void 0) && g[0]) && (k = this.getCustomChannelName(String((y = d.prerelease(O)) === null || y === void 0 ? void 0 : y[0]))), b = await R(k);
      } catch (k) {
        if (this.updater.allowPrerelease)
          b = await R(this.getDefaultChannelName());
        else
          throw k;
      }
      const E = (0, f.parseUpdateInfo)(b, I, T);
      return E.releaseName == null && (E.releaseName = P.elementValueOrEmpty("title")), E.releaseNotes == null && (E.releaseNotes = s(this.updater.currentVersion, this.updater.fullChangelog, A, P)), {
        tag: O,
        ...E
      };
    }
    async getLatestTagName(r) {
      const n = this.options, p = n.host == null || n.host === "github.com" ? (0, c.newUrlFromBase)(`${this.basePath}/latest`, this.baseUrl) : new h.URL(`${this.computeGithubBasePath(`/repos/${n.owner}/${n.repo}/releases`)}/latest`, this.baseApiUrl);
      try {
        const g = await this.httpRequest(p, { Accept: "application/json" }, r);
        return g == null ? null : JSON.parse(g).tag_name;
      } catch (g) {
        throw (0, e.newError)(`Unable to find latest version on GitHub (${p}), please ensure a production release exists: ${g.stack || g.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    get basePath() {
      return `/${this.options.owner}/${this.options.repo}/releases`;
    }
    resolveFiles(r) {
      return (0, f.resolveFiles)(r, this.baseUrl, (n) => this.getBaseDownloadPath(r.tag, n.replace(/ /g, "-")));
    }
    getBaseDownloadPath(r, n) {
      return `${this.basePath}/download/${r}/${n}`;
    }
  };
  ht.GitHubProvider = u;
  function o(a) {
    const r = a.elementValueOrEmpty("content");
    return r === "No content." ? "" : r;
  }
  function s(a, r, n, p) {
    if (!r)
      return o(p);
    const g = [];
    for (const y of n.getElements("entry")) {
      const m = /\/tag\/v?([^/]+)$/.exec(y.element("link").attribute("href"))[1];
      d.valid(m) && d.lt(a, m) && g.push({
        version: m,
        note: o(y)
      });
    }
    return g.sort((y, m) => d.rcompare(y.version, m.version));
  }
  return ht;
}
var ar = {}, gl;
function od() {
  if (gl) return ar;
  gl = 1, Object.defineProperty(ar, "__esModule", { value: !0 }), ar.GitLabProvider = void 0;
  const e = xe(), d = vt, h = Au(), c = Nt(), f = Ye();
  let l = class extends f.Provider {
    /**
     * Normalizes filenames by replacing spaces and underscores with dashes.
     *
     * This is a workaround to handle filename formatting differences between tools:
     * - electron-builder formats filenames like "test file.txt" as "test-file.txt"
     * - GitLab may provide asset URLs using underscores, such as "test_file.txt"
     *
     * Because of this mismatch, we can't reliably extract the correct filename from
     * the asset path without normalization. This function ensures consistent matching
     * across different filename formats by converting all spaces and underscores to dashes.
     *
     * @param filename The filename to normalize
     * @returns The normalized filename with spaces and underscores replaced by dashes
     */
    normalizeFilename(u) {
      return u.replace(/ |_/g, "-");
    }
    constructor(u, o, s) {
      super({
        ...s,
        // GitLab might not support multiple range requests efficiently
        isUseMultipleRangeRequest: !1
      }), this.options = u, this.updater = o, this.cachedLatestVersion = null;
      const r = u.host || "gitlab.com";
      this.baseApiUrl = (0, c.newBaseUrl)(`https://${r}/api/v4`);
    }
    get channel() {
      const u = this.updater.channel || this.options.channel;
      return u == null ? this.getDefaultChannelName() : this.getCustomChannelName(u);
    }
    async getLatestVersion() {
      const u = new e.CancellationToken(), o = (0, c.newUrlFromBase)(`projects/${this.options.projectId}/releases/permalink/latest`, this.baseApiUrl);
      let s;
      try {
        const A = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) }, P = await this.httpRequest(o, A, u);
        if (!P)
          throw (0, e.newError)("No latest release found", "ERR_UPDATER_NO_PUBLISHED_VERSIONS");
        s = JSON.parse(P);
      } catch (A) {
        throw (0, e.newError)(`Unable to find latest release on GitLab (${o}): ${A.stack || A.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
      const a = s.tag_name;
      let r = null, n = "", p = null;
      const g = async (A) => {
        n = (0, c.getChannelFilename)(A);
        const P = s.assets.links.find((b) => b.name === n);
        if (!P)
          throw (0, e.newError)(`Cannot find ${n} in the latest release assets`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        p = new d.URL(P.direct_asset_url);
        const O = this.options.token ? { "PRIVATE-TOKEN": this.options.token } : void 0;
        try {
          const b = await this.httpRequest(p, O, u);
          if (!b)
            throw (0, e.newError)(`Empty response from ${p}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
          return b;
        } catch (b) {
          throw b instanceof e.HttpError && b.statusCode === 404 ? (0, e.newError)(`Cannot find ${n} in the latest release artifacts (${p}): ${b.stack || b.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : b;
        }
      };
      try {
        r = await g(this.channel);
      } catch (A) {
        if (this.channel !== this.getDefaultChannelName())
          r = await g(this.getDefaultChannelName());
        else
          throw A;
      }
      if (!r)
        throw (0, e.newError)(`Unable to parse channel data from ${n}`, "ERR_UPDATER_INVALID_UPDATE_INFO");
      const y = (0, f.parseUpdateInfo)(r, n, p);
      y.releaseName == null && (y.releaseName = s.name), y.releaseNotes == null && (y.releaseNotes = s.description || null);
      const m = /* @__PURE__ */ new Map();
      for (const A of s.assets.links)
        m.set(this.normalizeFilename(A.name), A.direct_asset_url);
      const _ = {
        tag: a,
        assets: m,
        ...y
      };
      return this.cachedLatestVersion = _, _;
    }
    /**
     * Utility function to convert GitlabReleaseAsset to Map<string, string>
     * Maps asset names to their download URLs
     */
    convertAssetsToMap(u) {
      const o = /* @__PURE__ */ new Map();
      for (const s of u.links)
        o.set(this.normalizeFilename(s.name), s.direct_asset_url);
      return o;
    }
    /**
     * Find blockmap file URL in assets map for a specific filename
     */
    findBlockMapInAssets(u, o) {
      const s = [`${o}.blockmap`, `${this.normalizeFilename(o)}.blockmap`];
      for (const a of s) {
        const r = u.get(a);
        if (r)
          return new d.URL(r);
      }
      return null;
    }
    async fetchReleaseInfoByVersion(u) {
      const o = new e.CancellationToken(), s = [`v${u}`, u];
      for (const a of s) {
        const r = (0, c.newUrlFromBase)(`projects/${this.options.projectId}/releases/${encodeURIComponent(a)}`, this.baseApiUrl);
        try {
          const n = { "Content-Type": "application/json", ...this.setAuthHeaderForToken(this.options.token || null) }, p = await this.httpRequest(r, n, o);
          if (p)
            return JSON.parse(p);
        } catch (n) {
          if (n instanceof e.HttpError && n.statusCode === 404)
            continue;
          throw (0, e.newError)(`Unable to find release ${a} on GitLab (${r}): ${n.stack || n.message}`, "ERR_UPDATER_RELEASE_NOT_FOUND");
        }
      }
      throw (0, e.newError)(`Unable to find release with version ${u} (tried: ${s.join(", ")}) on GitLab`, "ERR_UPDATER_RELEASE_NOT_FOUND");
    }
    setAuthHeaderForToken(u) {
      const o = {};
      return u != null && (u.startsWith("Bearer") ? o.authorization = u : o["PRIVATE-TOKEN"] = u), o;
    }
    /**
     * Get version info for blockmap files, using cache when possible
     */
    async getVersionInfoForBlockMap(u) {
      if (this.cachedLatestVersion && this.cachedLatestVersion.version === u)
        return this.cachedLatestVersion.assets;
      const o = await this.fetchReleaseInfoByVersion(u);
      return o && o.assets ? this.convertAssetsToMap(o.assets) : null;
    }
    /**
     * Find blockmap URLs from version assets
     */
    async findBlockMapUrlsFromAssets(u, o, s) {
      let a = null, r = null;
      const n = await this.getVersionInfoForBlockMap(o);
      n && (a = this.findBlockMapInAssets(n, s));
      const p = await this.getVersionInfoForBlockMap(u);
      if (p) {
        const g = s.replace(new RegExp(h(o), "g"), u);
        r = this.findBlockMapInAssets(p, g);
      }
      return [r, a];
    }
    async getBlockMapFiles(u, o, s, a = null) {
      if (this.options.uploadTarget === "project_upload") {
        const r = u.pathname.split("/").pop() || "", [n, p] = await this.findBlockMapUrlsFromAssets(o, s, r);
        if (!p)
          throw (0, e.newError)(`Cannot find blockmap file for ${s} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
        if (!n)
          throw (0, e.newError)(`Cannot find blockmap file for ${o} in GitLab assets`, "ERR_UPDATER_BLOCKMAP_FILE_NOT_FOUND");
        return [n, p];
      } else
        return super.getBlockMapFiles(u, o, s, a);
    }
    resolveFiles(u) {
      return (0, f.getFileList)(u).map((o) => {
        const a = [
          o.url,
          // Original filename
          this.normalizeFilename(o.url)
          // Normalized filename (spaces/underscores → dashes)
        ].find((n) => u.assets.has(n)), r = a ? u.assets.get(a) : void 0;
        if (!r)
          throw (0, e.newError)(`Cannot find asset "${o.url}" in GitLab release assets. Available assets: ${Array.from(u.assets.keys()).join(", ")}`, "ERR_UPDATER_ASSET_NOT_FOUND");
        return {
          url: new d.URL(r),
          info: o
        };
      });
    }
    toString() {
      return `GitLab (projectId: ${this.options.projectId}, channel: ${this.channel})`;
    }
  };
  return ar.GitLabProvider = l, ar;
}
var or = {}, vl;
function sd() {
  if (vl) return or;
  vl = 1, Object.defineProperty(or, "__esModule", { value: !0 }), or.KeygenProvider = void 0;
  const e = xe(), d = Nt(), h = Ye();
  let c = class extends h.Provider {
    constructor(l, i, u) {
      super({
        ...u,
        isUseMultipleRangeRequest: !1
      }), this.configuration = l, this.updater = i, this.defaultHostname = "api.keygen.sh";
      const o = this.configuration.host || this.defaultHostname;
      this.baseUrl = (0, d.newBaseUrl)(`https://${o}/v1/accounts/${this.configuration.account}/artifacts?product=${this.configuration.product}`);
    }
    get channel() {
      return this.updater.channel || this.configuration.channel || "stable";
    }
    async getLatestVersion() {
      const l = new e.CancellationToken(), i = (0, d.getChannelFilename)(this.getCustomChannelName(this.channel)), u = (0, d.newUrlFromBase)(i, this.baseUrl, this.updater.isAddNoCacheQuery);
      try {
        const o = await this.httpRequest(u, {
          Accept: "application/vnd.api+json",
          "Keygen-Version": "1.1"
        }, l);
        return (0, h.parseUpdateInfo)(o, i, u);
      } catch (o) {
        throw (0, e.newError)(`Unable to find latest version on ${this.toString()}, please ensure release exists: ${o.stack || o.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    resolveFiles(l) {
      return (0, h.resolveFiles)(l, this.baseUrl);
    }
    toString() {
      const { account: l, product: i, platform: u } = this.configuration;
      return `Keygen (account: ${l}, product: ${i}, platform: ${u}, channel: ${this.channel})`;
    }
  };
  return or.KeygenProvider = c, or;
}
var sr = {}, El;
function ld() {
  if (El) return sr;
  El = 1, Object.defineProperty(sr, "__esModule", { value: !0 }), sr.PrivateGitHubProvider = void 0;
  const e = xe(), d = wa(), h = Ie, c = vt, f = Nt(), l = Cu(), i = Ye();
  let u = class extends l.BaseGitHubProvider {
    constructor(s, a, r, n) {
      super(s, "api.github.com", n), this.updater = a, this.token = r;
    }
    createRequestOptions(s, a) {
      const r = super.createRequestOptions(s, a);
      return r.redirect = "manual", r;
    }
    async getLatestVersion() {
      const s = new e.CancellationToken(), a = (0, f.getChannelFilename)(this.getDefaultChannelName()), r = await this.getLatestVersionInfo(s), n = r.assets.find((y) => y.name === a);
      if (n == null)
        throw (0, e.newError)(`Cannot find ${a} in the release ${r.html_url || r.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
      const p = new c.URL(n.url);
      let g;
      try {
        g = (0, d.load)(await this.httpRequest(p, this.configureHeaders("application/octet-stream"), s));
      } catch (y) {
        throw y instanceof e.HttpError && y.statusCode === 404 ? (0, e.newError)(`Cannot find ${a} in the latest release artifacts (${p}): ${y.stack || y.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") : y;
      }
      return g.assets = r.assets, g;
    }
    get fileExtraDownloadHeaders() {
      return this.configureHeaders("application/octet-stream");
    }
    configureHeaders(s) {
      return {
        accept: s,
        authorization: `token ${this.token}`
      };
    }
    async getLatestVersionInfo(s) {
      const a = this.updater.allowPrerelease;
      let r = this.basePath;
      a || (r = `${r}/latest`);
      const n = (0, f.newUrlFromBase)(r, this.baseUrl);
      try {
        const p = JSON.parse(await this.httpRequest(n, this.configureHeaders("application/vnd.github.v3+json"), s));
        return a ? p.find((g) => g.prerelease) || p[0] : p;
      } catch (p) {
        throw (0, e.newError)(`Unable to find latest version on GitHub (${n}), please ensure a production release exists: ${p.stack || p.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
      }
    }
    get basePath() {
      return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
    }
    resolveFiles(s) {
      return (0, i.getFileList)(s).map((a) => {
        const r = h.posix.basename(a.url).replace(/ /g, "-"), n = s.assets.find((p) => p != null && p.name === r);
        if (n == null)
          throw (0, e.newError)(`Cannot find asset "${r}" in: ${JSON.stringify(s.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
        return {
          url: new c.URL(n.url),
          info: a
        };
      });
    }
  };
  return sr.PrivateGitHubProvider = u, sr;
}
var yl;
function ud() {
  if (yl) return nr;
  yl = 1, Object.defineProperty(nr, "__esModule", { value: !0 }), nr.isUrlProbablySupportMultiRangeRequests = u, nr.createClient = o;
  const e = xe(), d = ad(), h = Tu(), c = Cu(), f = od(), l = sd(), i = ld();
  function u(s) {
    return !s.includes("s3.amazonaws.com");
  }
  function o(s, a, r) {
    if (typeof s == "string")
      throw (0, e.newError)("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
    const n = s.provider;
    switch (n) {
      case "github": {
        const p = s, g = (p.private ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN : null) || p.token;
        return g == null ? new c.GitHubProvider(p, a, r) : new i.PrivateGitHubProvider(p, a, g, r);
      }
      case "bitbucket":
        return new d.BitbucketProvider(s, a, r);
      case "gitlab":
        return new f.GitLabProvider(s, a, r);
      case "keygen":
        return new l.KeygenProvider(s, a, r);
      case "s3":
      case "spaces":
        return new h.GenericProvider({
          provider: "generic",
          url: (0, e.getS3LikeProviderBaseUrl)(s),
          channel: s.channel || null
        }, a, {
          ...r,
          // https://github.com/minio/minio/issues/5285#issuecomment-350428955
          isUseMultipleRangeRequest: !1
        });
      case "generic": {
        const p = s;
        return new h.GenericProvider(p, a, {
          ...r,
          isUseMultipleRangeRequest: p.useMultipleRangeRequest !== !1 && u(p.url)
        });
      }
      case "custom": {
        const p = s, g = p.updateProvider;
        if (!g)
          throw (0, e.newError)("Custom provider not specified", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
        return new g(p, a, r);
      }
      default:
        throw (0, e.newError)(`Unsupported provider: ${n}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
    }
  }
  return nr;
}
var lr = {}, ur = {}, Mt = {}, Bt = {}, wl;
function ba() {
  if (wl) return Bt;
  wl = 1, Object.defineProperty(Bt, "__esModule", { value: !0 }), Bt.OperationKind = void 0, Bt.computeOperations = d;
  var e;
  (function(i) {
    i[i.COPY = 0] = "COPY", i[i.DOWNLOAD = 1] = "DOWNLOAD";
  })(e || (Bt.OperationKind = e = {}));
  function d(i, u, o) {
    const s = l(i.files), a = l(u.files);
    let r = null;
    const n = u.files[0], p = [], g = n.name, y = s.get(g);
    if (y == null)
      throw new Error(`no file ${g} in old blockmap`);
    const m = a.get(g);
    let _ = 0;
    const { checksumToOffset: A, checksumToOldSize: P } = f(s.get(g), y.offset, o);
    let O = n.offset;
    for (let b = 0; b < m.checksums.length; O += m.sizes[b], b++) {
      const I = m.sizes[b], T = m.checksums[b];
      let R = A.get(T);
      R != null && P.get(T) !== I && (o.warn(`Checksum ("${T}") matches, but size differs (old: ${P.get(T)}, new: ${I})`), R = void 0), R === void 0 ? (_++, r != null && r.kind === e.DOWNLOAD && r.end === O ? r.end += I : (r = {
        kind: e.DOWNLOAD,
        start: O,
        end: O + I
        // oldBlocks: null,
      }, c(r, p, T, b))) : r != null && r.kind === e.COPY && r.end === R ? r.end += I : (r = {
        kind: e.COPY,
        start: R,
        end: R + I
        // oldBlocks: [checksum]
      }, c(r, p, T, b));
    }
    return _ > 0 && o.info(`File${n.name === "file" ? "" : " " + n.name} has ${_} changed blocks`), p;
  }
  const h = process.env.DIFFERENTIAL_DOWNLOAD_PLAN_BUILDER_VALIDATE_RANGES === "true";
  function c(i, u, o, s) {
    if (h && u.length !== 0) {
      const a = u[u.length - 1];
      if (a.kind === i.kind && i.start < a.end && i.start > a.start) {
        const r = [a.start, a.end, i.start, i.end].reduce((n, p) => n < p ? n : p);
        throw new Error(`operation (block index: ${s}, checksum: ${o}, kind: ${e[i.kind]}) overlaps previous operation (checksum: ${o}):
abs: ${a.start} until ${a.end} and ${i.start} until ${i.end}
rel: ${a.start - r} until ${a.end - r} and ${i.start - r} until ${i.end - r}`);
      }
    }
    u.push(i);
  }
  function f(i, u, o) {
    const s = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
    let r = u;
    for (let n = 0; n < i.checksums.length; n++) {
      const p = i.checksums[n], g = i.sizes[n], y = a.get(p);
      if (y === void 0)
        s.set(p, r), a.set(p, g);
      else if (o.debug != null) {
        const m = y === g ? "(same size)" : `(size: ${y}, this size: ${g})`;
        o.debug(`${p} duplicated in blockmap ${m}, it doesn't lead to broken differential downloader, just corresponding block will be skipped)`);
      }
      r += g;
    }
    return { checksumToOffset: s, checksumToOldSize: a };
  }
  function l(i) {
    const u = /* @__PURE__ */ new Map();
    for (const o of i)
      u.set(o.name, o);
    return u;
  }
  return Bt;
}
var _l;
function bu() {
  if (_l) return Mt;
  _l = 1, Object.defineProperty(Mt, "__esModule", { value: !0 }), Mt.DataSplitter = void 0, Mt.copyData = i;
  const e = xe(), d = gt, h = Rr, c = ba(), f = Buffer.from(`\r
\r
`);
  var l;
  (function(o) {
    o[o.INIT = 0] = "INIT", o[o.HEADER = 1] = "HEADER", o[o.BODY = 2] = "BODY";
  })(l || (l = {}));
  function i(o, s, a, r, n) {
    const p = (0, d.createReadStream)("", {
      fd: a,
      autoClose: !1,
      start: o.start,
      // end is inclusive
      end: o.end - 1
    });
    p.on("error", r), p.once("end", n), p.pipe(s, {
      end: !1
    });
  }
  let u = class extends h.Writable {
    constructor(s, a, r, n, p, g, y, m) {
      super(), this.out = s, this.options = a, this.partIndexToTaskIndex = r, this.partIndexToLength = p, this.finishHandler = g, this.grandTotalBytes = y, this.onProgress = m, this.start = Date.now(), this.nextUpdate = this.start + 1e3, this.transferred = 0, this.delta = 0, this.partIndex = -1, this.headerListBuffer = null, this.readState = l.INIT, this.ignoreByteCount = 0, this.remainingPartDataCount = 0, this.actualPartLength = 0, this.boundaryLength = n.length + 4, this.ignoreByteCount = this.boundaryLength - 2;
    }
    get isFinished() {
      return this.partIndex === this.partIndexToLength.length;
    }
    // noinspection JSUnusedGlobalSymbols
    _write(s, a, r) {
      if (this.isFinished) {
        console.error(`Trailing ignored data: ${s.length} bytes`);
        return;
      }
      this.handleData(s).then(() => {
        if (this.onProgress) {
          const n = Date.now();
          (n >= this.nextUpdate || this.transferred === this.grandTotalBytes) && this.grandTotalBytes && (n - this.start) / 1e3 && (this.nextUpdate = n + 1e3, this.onProgress({
            total: this.grandTotalBytes,
            delta: this.delta,
            transferred: this.transferred,
            percent: this.transferred / this.grandTotalBytes * 100,
            bytesPerSecond: Math.round(this.transferred / ((n - this.start) / 1e3))
          }), this.delta = 0);
        }
        r();
      }).catch(r);
    }
    async handleData(s) {
      let a = 0;
      if (this.ignoreByteCount !== 0 && this.remainingPartDataCount !== 0)
        throw (0, e.newError)("Internal error", "ERR_DATA_SPLITTER_BYTE_COUNT_MISMATCH");
      if (this.ignoreByteCount > 0) {
        const r = Math.min(this.ignoreByteCount, s.length);
        this.ignoreByteCount -= r, a = r;
      } else if (this.remainingPartDataCount > 0) {
        const r = Math.min(this.remainingPartDataCount, s.length);
        this.remainingPartDataCount -= r, await this.processPartData(s, 0, r), a = r;
      }
      if (a !== s.length) {
        if (this.readState === l.HEADER) {
          const r = this.searchHeaderListEnd(s, a);
          if (r === -1)
            return;
          a = r, this.readState = l.BODY, this.headerListBuffer = null;
        }
        for (; ; ) {
          if (this.readState === l.BODY)
            this.readState = l.INIT;
          else {
            this.partIndex++;
            let g = this.partIndexToTaskIndex.get(this.partIndex);
            if (g == null)
              if (this.isFinished)
                g = this.options.end;
              else
                throw (0, e.newError)("taskIndex is null", "ERR_DATA_SPLITTER_TASK_INDEX_IS_NULL");
            const y = this.partIndex === 0 ? this.options.start : this.partIndexToTaskIndex.get(this.partIndex - 1) + 1;
            if (y < g)
              await this.copyExistingData(y, g);
            else if (y > g)
              throw (0, e.newError)("prevTaskIndex must be < taskIndex", "ERR_DATA_SPLITTER_TASK_INDEX_ASSERT_FAILED");
            if (this.isFinished) {
              this.onPartEnd(), this.finishHandler();
              return;
            }
            if (a = this.searchHeaderListEnd(s, a), a === -1) {
              this.readState = l.HEADER;
              return;
            }
          }
          const r = this.partIndexToLength[this.partIndex], n = a + r, p = Math.min(n, s.length);
          if (await this.processPartStarted(s, a, p), this.remainingPartDataCount = r - (p - a), this.remainingPartDataCount > 0)
            return;
          if (a = n + this.boundaryLength, a >= s.length) {
            this.ignoreByteCount = this.boundaryLength - (s.length - n);
            return;
          }
        }
      }
    }
    copyExistingData(s, a) {
      return new Promise((r, n) => {
        const p = () => {
          if (s === a) {
            r();
            return;
          }
          const g = this.options.tasks[s];
          if (g.kind !== c.OperationKind.COPY) {
            n(new Error("Task kind must be COPY"));
            return;
          }
          i(g, this.out, this.options.oldFileFd, n, () => {
            s++, p();
          });
        };
        p();
      });
    }
    searchHeaderListEnd(s, a) {
      const r = s.indexOf(f, a);
      if (r !== -1)
        return r + f.length;
      const n = a === 0 ? s : s.slice(a);
      return this.headerListBuffer == null ? this.headerListBuffer = n : this.headerListBuffer = Buffer.concat([this.headerListBuffer, n]), -1;
    }
    onPartEnd() {
      const s = this.partIndexToLength[this.partIndex - 1];
      if (this.actualPartLength !== s)
        throw (0, e.newError)(`Expected length: ${s} differs from actual: ${this.actualPartLength}`, "ERR_DATA_SPLITTER_LENGTH_MISMATCH");
      this.actualPartLength = 0;
    }
    processPartStarted(s, a, r) {
      return this.partIndex !== 0 && this.onPartEnd(), this.processPartData(s, a, r);
    }
    processPartData(s, a, r) {
      this.actualPartLength += r - a, this.transferred += r - a, this.delta += r - a;
      const n = this.out;
      return n.write(a === 0 && s.length === r ? s : s.slice(a, r)) ? Promise.resolve() : new Promise((p, g) => {
        n.on("error", g), n.once("drain", () => {
          n.removeListener("error", g), p();
        });
      });
    }
  };
  return Mt.DataSplitter = u, Mt;
}
var cr = {}, Sl;
function cd() {
  if (Sl) return cr;
  Sl = 1, Object.defineProperty(cr, "__esModule", { value: !0 }), cr.executeTasksUsingMultipleRangeRequests = c, cr.checkIsRangesSupported = l;
  const e = xe(), d = bu(), h = ba();
  function c(i, u, o, s, a) {
    const r = (n) => {
      if (n >= u.length) {
        i.fileMetadataBuffer != null && o.write(i.fileMetadataBuffer), o.end();
        return;
      }
      const p = n + 1e3;
      f(i, {
        tasks: u,
        start: n,
        end: Math.min(u.length, p),
        oldFileFd: s
      }, o, () => r(p), a);
    };
    return r;
  }
  function f(i, u, o, s, a) {
    let r = "bytes=", n = 0, p = 0;
    const g = /* @__PURE__ */ new Map(), y = [];
    for (let A = u.start; A < u.end; A++) {
      const P = u.tasks[A];
      P.kind === h.OperationKind.DOWNLOAD && (r += `${P.start}-${P.end - 1}, `, g.set(n, A), n++, y.push(P.end - P.start), p += P.end - P.start);
    }
    if (n <= 1) {
      const A = (P) => {
        if (P >= u.end) {
          s();
          return;
        }
        const O = u.tasks[P++];
        if (O.kind === h.OperationKind.COPY)
          (0, d.copyData)(O, o, u.oldFileFd, a, () => A(P));
        else {
          const b = i.createRequestOptions();
          b.headers.Range = `bytes=${O.start}-${O.end - 1}`;
          const I = i.httpExecutor.createRequest(b, (T) => {
            T.on("error", a), l(T, a) && (T.pipe(o, {
              end: !1
            }), T.once("end", () => A(P)));
          });
          i.httpExecutor.addErrorAndTimeoutHandlers(I, a), I.end();
        }
      };
      A(u.start);
      return;
    }
    const m = i.createRequestOptions();
    m.headers.Range = r.substring(0, r.length - 2);
    const _ = i.httpExecutor.createRequest(m, (A) => {
      if (!l(A, a))
        return;
      const P = (0, e.safeGetHeader)(A, "content-type"), O = /^multipart\/.+?\s*;\s*boundary=(?:"([^"]+)"|([^\s";]+))\s*$/i.exec(P);
      if (O == null) {
        a(new Error(`Content-Type "multipart/byteranges" is expected, but got "${P}"`));
        return;
      }
      const b = new d.DataSplitter(o, u, g, O[1] || O[2], y, s, p, i.options.onProgress);
      b.on("error", a), A.pipe(b), A.on("end", () => {
        setTimeout(() => {
          _.abort(), a(new Error("Response ends without calling any handlers"));
        }, 1e4);
      });
    });
    i.httpExecutor.addErrorAndTimeoutHandlers(_, a), _.end();
  }
  function l(i, u) {
    if (i.statusCode >= 400)
      return u((0, e.createHttpError)(i)), !1;
    if (i.statusCode !== 206) {
      const o = (0, e.safeGetHeader)(i, "accept-ranges");
      if (o == null || o === "none")
        return u(new Error(`Server doesn't support Accept-Ranges (response code ${i.statusCode})`)), !1;
    }
    return !0;
  }
  return cr;
}
var fr = {}, Rl;
function fd() {
  if (Rl) return fr;
  Rl = 1, Object.defineProperty(fr, "__esModule", { value: !0 }), fr.ProgressDifferentialDownloadCallbackTransform = void 0;
  const e = Rr;
  var d;
  (function(c) {
    c[c.COPY = 0] = "COPY", c[c.DOWNLOAD = 1] = "DOWNLOAD";
  })(d || (d = {}));
  let h = class extends e.Transform {
    constructor(f, l, i) {
      super(), this.progressDifferentialDownloadInfo = f, this.cancellationToken = l, this.onProgress = i, this.start = Date.now(), this.transferred = 0, this.delta = 0, this.expectedBytes = 0, this.index = 0, this.operationType = d.COPY, this.nextUpdate = this.start + 1e3;
    }
    _transform(f, l, i) {
      if (this.cancellationToken.cancelled) {
        i(new Error("cancelled"), null);
        return;
      }
      if (this.operationType == d.COPY) {
        i(null, f);
        return;
      }
      this.transferred += f.length, this.delta += f.length;
      const u = Date.now();
      u >= this.nextUpdate && this.transferred !== this.expectedBytes && this.transferred !== this.progressDifferentialDownloadInfo.grandTotal && (this.nextUpdate = u + 1e3, this.onProgress({
        total: this.progressDifferentialDownloadInfo.grandTotal,
        delta: this.delta,
        transferred: this.transferred,
        percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
        bytesPerSecond: Math.round(this.transferred / ((u - this.start) / 1e3))
      }), this.delta = 0), i(null, f);
    }
    beginFileCopy() {
      this.operationType = d.COPY;
    }
    beginRangeDownload() {
      this.operationType = d.DOWNLOAD, this.expectedBytes += this.progressDifferentialDownloadInfo.expectedByteCounts[this.index++];
    }
    endRangeDownload() {
      this.transferred !== this.progressDifferentialDownloadInfo.grandTotal && this.onProgress({
        total: this.progressDifferentialDownloadInfo.grandTotal,
        delta: this.delta,
        transferred: this.transferred,
        percent: this.transferred / this.progressDifferentialDownloadInfo.grandTotal * 100,
        bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
      });
    }
    // Called when we are 100% done with the connection/download
    _flush(f) {
      if (this.cancellationToken.cancelled) {
        f(new Error("cancelled"));
        return;
      }
      this.onProgress({
        total: this.progressDifferentialDownloadInfo.grandTotal,
        delta: this.delta,
        transferred: this.transferred,
        percent: 100,
        bytesPerSecond: Math.round(this.transferred / ((Date.now() - this.start) / 1e3))
      }), this.delta = 0, this.transferred = 0, f(null);
    }
  };
  return fr.ProgressDifferentialDownloadCallbackTransform = h, fr;
}
var Al;
function Pu() {
  if (Al) return ur;
  Al = 1, Object.defineProperty(ur, "__esModule", { value: !0 }), ur.DifferentialDownloader = void 0;
  const e = xe(), d = /* @__PURE__ */ Et(), h = gt, c = bu(), f = vt, l = ba(), i = cd(), u = fd();
  let o = class {
    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    constructor(n, p, g) {
      this.blockAwareFileInfo = n, this.httpExecutor = p, this.options = g, this.fileMetadataBuffer = null, this.logger = g.logger;
    }
    createRequestOptions() {
      const n = {
        headers: {
          ...this.options.requestHeaders,
          accept: "*/*"
        }
      };
      return (0, e.configureRequestUrl)(this.options.newUrl, n), (0, e.configureRequestOptions)(n), n;
    }
    doDownload(n, p) {
      if (n.version !== p.version)
        throw new Error(`version is different (${n.version} - ${p.version}), full download is required`);
      const g = this.logger, y = (0, l.computeOperations)(n, p, g);
      g.debug != null && g.debug(JSON.stringify(y, null, 2));
      let m = 0, _ = 0;
      for (const P of y) {
        const O = P.end - P.start;
        P.kind === l.OperationKind.DOWNLOAD ? m += O : _ += O;
      }
      const A = this.blockAwareFileInfo.size;
      if (m + _ + (this.fileMetadataBuffer == null ? 0 : this.fileMetadataBuffer.length) !== A)
        throw new Error(`Internal error, size mismatch: downloadSize: ${m}, copySize: ${_}, newSize: ${A}`);
      return g.info(`Full: ${s(A)}, To download: ${s(m)} (${Math.round(m / (A / 100))}%)`), this.downloadFile(y);
    }
    downloadFile(n) {
      const p = [], g = () => Promise.all(p.map((y) => (0, d.close)(y.descriptor).catch((m) => {
        this.logger.error(`cannot close file "${y.path}": ${m}`);
      })));
      return this.doDownloadFile(n, p).then(g).catch((y) => g().catch((m) => {
        try {
          this.logger.error(`cannot close files: ${m}`);
        } catch (_) {
          try {
            console.error(_);
          } catch {
          }
        }
        throw y;
      }).then(() => {
        throw y;
      }));
    }
    async doDownloadFile(n, p) {
      const g = await (0, d.open)(this.options.oldFile, "r");
      p.push({ descriptor: g, path: this.options.oldFile });
      const y = await (0, d.open)(this.options.newFile, "w");
      p.push({ descriptor: y, path: this.options.newFile });
      const m = (0, h.createWriteStream)(this.options.newFile, { fd: y });
      await new Promise((_, A) => {
        const P = [];
        let O;
        if (!this.options.isUseMultipleRangeRequest && this.options.onProgress) {
          const L = [];
          let q = 0;
          for (const N of n)
            N.kind === l.OperationKind.DOWNLOAD && (L.push(N.end - N.start), q += N.end - N.start);
          const x = {
            expectedByteCounts: L,
            grandTotal: q
          };
          O = new u.ProgressDifferentialDownloadCallbackTransform(x, this.options.cancellationToken, this.options.onProgress), P.push(O);
        }
        const b = new e.DigestTransform(this.blockAwareFileInfo.sha512);
        b.isValidateOnEnd = !1, P.push(b), m.on("finish", () => {
          m.close(() => {
            p.splice(1, 1);
            try {
              b.validate();
            } catch (L) {
              A(L);
              return;
            }
            _(void 0);
          });
        }), P.push(m);
        let I = null;
        for (const L of P)
          L.on("error", A), I == null ? I = L : I = I.pipe(L);
        const T = P[0];
        let R;
        if (this.options.isUseMultipleRangeRequest) {
          R = (0, i.executeTasksUsingMultipleRangeRequests)(this, n, T, g, A), R(0);
          return;
        }
        let E = 0, k = null;
        this.logger.info(`Differential download: ${this.options.newUrl}`);
        const $ = this.createRequestOptions();
        $.redirect = "manual", R = (L) => {
          var q, x;
          if (L >= n.length) {
            this.fileMetadataBuffer != null && T.write(this.fileMetadataBuffer), T.end();
            return;
          }
          const N = n[L++];
          if (N.kind === l.OperationKind.COPY) {
            O && O.beginFileCopy(), (0, c.copyData)(N, T, g, A, () => R(L));
            return;
          }
          const j = `bytes=${N.start}-${N.end - 1}`;
          $.headers.range = j, (x = (q = this.logger) === null || q === void 0 ? void 0 : q.debug) === null || x === void 0 || x.call(q, `download range: ${j}`), O && O.beginRangeDownload();
          const D = this.httpExecutor.createRequest($, (G) => {
            G.on("error", A), G.on("aborted", () => {
              A(new Error("response has been aborted by the server"));
            }), G.statusCode >= 400 && A((0, e.createHttpError)(G)), G.pipe(T, {
              end: !1
            }), G.once("end", () => {
              O && O.endRangeDownload(), ++E === 100 ? (E = 0, setTimeout(() => R(L), 1e3)) : R(L);
            });
          });
          D.on("redirect", (G, V, te) => {
            this.logger.info(`Redirect to ${a(te)}`), k = te, (0, e.configureRequestUrl)(new f.URL(k), $), D.followRedirect();
          }), this.httpExecutor.addErrorAndTimeoutHandlers(D, A), D.end();
        }, R(0);
      });
    }
    async readRemoteBytes(n, p) {
      const g = Buffer.allocUnsafe(p + 1 - n), y = this.createRequestOptions();
      y.headers.range = `bytes=${n}-${p}`;
      let m = 0;
      if (await this.request(y, (_) => {
        _.copy(g, m), m += _.length;
      }), m !== g.length)
        throw new Error(`Received data length ${m} is not equal to expected ${g.length}`);
      return g;
    }
    request(n, p) {
      return new Promise((g, y) => {
        const m = this.httpExecutor.createRequest(n, (_) => {
          (0, i.checkIsRangesSupported)(_, y) && (_.on("error", y), _.on("aborted", () => {
            y(new Error("response has been aborted by the server"));
          }), _.on("data", p), _.on("end", () => g()));
        });
        this.httpExecutor.addErrorAndTimeoutHandlers(m, y), m.end();
      });
    }
  };
  ur.DifferentialDownloader = o;
  function s(r, n = " KB") {
    return new Intl.NumberFormat("en").format((r / 1024).toFixed(2)) + n;
  }
  function a(r) {
    const n = r.indexOf("?");
    return n < 0 ? r : r.substring(0, n);
  }
  return ur;
}
var Tl;
function dd() {
  if (Tl) return lr;
  Tl = 1, Object.defineProperty(lr, "__esModule", { value: !0 }), lr.GenericDifferentialDownloader = void 0;
  const e = Pu();
  let d = class extends e.DifferentialDownloader {
    download(c, f) {
      return this.doDownload(c, f);
    }
  };
  return lr.GenericDifferentialDownloader = d, lr;
}
var la = {}, Cl;
function Ft() {
  return Cl || (Cl = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.UpdaterSignal = e.UPDATE_DOWNLOADED = e.DOWNLOAD_PROGRESS = e.CancellationToken = void 0, e.addHandler = c;
    const d = xe();
    Object.defineProperty(e, "CancellationToken", { enumerable: !0, get: function() {
      return d.CancellationToken;
    } }), e.DOWNLOAD_PROGRESS = "download-progress", e.UPDATE_DOWNLOADED = "update-downloaded";
    class h {
      constructor(l) {
        this.emitter = l;
      }
      /**
       * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
       */
      login(l) {
        c(this.emitter, "login", l);
      }
      progress(l) {
        c(this.emitter, e.DOWNLOAD_PROGRESS, l);
      }
      updateDownloaded(l) {
        c(this.emitter, e.UPDATE_DOWNLOADED, l);
      }
      updateCancelled(l) {
        c(this.emitter, "update-cancelled", l);
      }
    }
    e.UpdaterSignal = h;
    function c(f, l, i) {
      f.on(l, i);
    }
  })(la)), la;
}
var bl;
function Pa() {
  if (bl) return Tt;
  bl = 1, Object.defineProperty(Tt, "__esModule", { value: !0 }), Tt.NoOpLogger = Tt.AppUpdater = void 0;
  const e = xe(), d = Ar, h = Qr, c = Jl, f = /* @__PURE__ */ Et(), l = wa(), i = Of(), u = Ie, o = Ru(), s = td(), a = nd(), r = id(), n = Tu(), p = ud(), g = Ql, y = dd(), m = Ft();
  let _ = class Ou extends c.EventEmitter {
    /**
     * Get the update channel. Doesn't return `channel` from the update configuration, only if was previously set.
     */
    get channel() {
      return this._channel;
    }
    /**
     * Set the update channel. Overrides `channel` in the update configuration.
     *
     * `allowDowngrade` will be automatically set to `true`. If this behavior is not suitable for you, simple set `allowDowngrade` explicitly after.
     */
    set channel(b) {
      if (this._channel != null) {
        if (typeof b != "string")
          throw (0, e.newError)(`Channel must be a string, but got: ${b}`, "ERR_UPDATER_INVALID_CHANNEL");
        if (b.length === 0)
          throw (0, e.newError)("Channel must be not an empty string", "ERR_UPDATER_INVALID_CHANNEL");
      }
      this._channel = b, this.allowDowngrade = !0;
    }
    /**
     *  Shortcut for explicitly adding auth tokens to request headers
     */
    addAuthHeader(b) {
      this.requestHeaders = Object.assign({}, this.requestHeaders, {
        authorization: b
      });
    }
    // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    get netSession() {
      return (0, r.getNetSession)();
    }
    /**
     * The logger. You can pass [electron-log](https://github.com/megahertz/electron-log), [winston](https://github.com/winstonjs/winston) or another logger with the following interface: `{ info(), warn(), error() }`.
     * Set it to `null` if you would like to disable a logging feature.
     */
    get logger() {
      return this._logger;
    }
    set logger(b) {
      this._logger = b ?? new P();
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     * test only
     * @private
     */
    set updateConfigPath(b) {
      this.clientPromise = null, this._appUpdateConfigPath = b, this.configOnDisk = new i.Lazy(() => this.loadUpdateConfig());
    }
    /**
     * Allows developer to override default logic for determining if an update is supported.
     * The default logic compares the `UpdateInfo` minimum system version against the `os.release()` with `semver` package
     */
    get isUpdateSupported() {
      return this._isUpdateSupported;
    }
    set isUpdateSupported(b) {
      b && (this._isUpdateSupported = b);
    }
    /**
     * Allows developer to override default logic for determining if the user is below the rollout threshold.
     * The default logic compares the staging percentage with numerical representation of user ID.
     * An override can define custom logic, or bypass it if needed.
     */
    get isUserWithinRollout() {
      return this._isUserWithinRollout;
    }
    set isUserWithinRollout(b) {
      b && (this._isUserWithinRollout = b);
    }
    constructor(b, I) {
      super(), this.autoDownload = !0, this.autoInstallOnAppQuit = !0, this.autoRunAppAfterInstall = !0, this.allowPrerelease = !1, this.fullChangelog = !1, this.allowDowngrade = !1, this.disableWebInstaller = !1, this.disableDifferentialDownload = !1, this.forceDevUpdateConfig = !1, this.previousBlockmapBaseUrlOverride = null, this._channel = null, this.downloadedUpdateHelper = null, this.requestHeaders = null, this._logger = console, this.signals = new m.UpdaterSignal(this), this._appUpdateConfigPath = null, this._isUpdateSupported = (E) => this.checkIfUpdateSupported(E), this._isUserWithinRollout = (E) => this.isStagingMatch(E), this.clientPromise = null, this.stagingUserIdPromise = new i.Lazy(() => this.getOrCreateStagingUserId()), this.configOnDisk = new i.Lazy(() => this.loadUpdateConfig()), this.checkForUpdatesPromise = null, this.downloadPromise = null, this.updateInfoAndProvider = null, this._testOnlyOptions = null, this.on("error", (E) => {
        this._logger.error(`Error: ${E.stack || E.message}`);
      }), I == null ? (this.app = new a.ElectronAppAdapter(), this.httpExecutor = new r.ElectronHttpExecutor((E, k) => this.emit("login", E, k))) : (this.app = I, this.httpExecutor = null);
      const T = this.app.version, R = (0, o.parse)(T);
      if (R == null)
        throw (0, e.newError)(`App version is not a valid semver version: "${T}"`, "ERR_UPDATER_INVALID_VERSION");
      this.currentVersion = R, this.allowPrerelease = A(R), b != null && (this.setFeedURL(b), typeof b != "string" && b.requestHeaders && (this.requestHeaders = b.requestHeaders));
    }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    getFeedURL() {
      return "Deprecated. Do not use it.";
    }
    /**
     * Configure update provider. If value is `string`, [GenericServerOptions](./publish.md#genericserveroptions) will be set with value as `url`.
     * @param options If you want to override configuration in the `app-update.yml`.
     */
    setFeedURL(b) {
      const I = this.createProviderRuntimeOptions();
      let T;
      typeof b == "string" ? T = new n.GenericProvider({ provider: "generic", url: b }, this, {
        ...I,
        isUseMultipleRangeRequest: (0, p.isUrlProbablySupportMultiRangeRequests)(b)
      }) : T = (0, p.createClient)(b, this, I), this.clientPromise = Promise.resolve(T);
    }
    /**
     * Asks the server whether there is an update.
     * @returns null if the updater is disabled, otherwise info about the latest version
     */
    checkForUpdates() {
      if (!this.isUpdaterActive())
        return Promise.resolve(null);
      let b = this.checkForUpdatesPromise;
      if (b != null)
        return this._logger.info("Checking for update (already in progress)"), b;
      const I = () => this.checkForUpdatesPromise = null;
      return this._logger.info("Checking for update"), b = this.doCheckForUpdates().then((T) => (I(), T)).catch((T) => {
        throw I(), this.emit("error", T, `Cannot check for updates: ${(T.stack || T).toString()}`), T;
      }), this.checkForUpdatesPromise = b, b;
    }
    isUpdaterActive() {
      return this.app.isPackaged || this.forceDevUpdateConfig ? !0 : (this._logger.info("Skip checkForUpdates because application is not packed and dev update config is not forced"), !1);
    }
    // noinspection JSUnusedGlobalSymbols
    checkForUpdatesAndNotify(b) {
      return this.checkForUpdates().then((I) => I?.downloadPromise ? (I.downloadPromise.then(() => {
        const T = Ou.formatDownloadNotification(I.updateInfo.version, this.app.name, b);
        new It.Notification(T).show();
      }), I) : (this._logger.debug != null && this._logger.debug("checkForUpdatesAndNotify called, downloadPromise is null"), I));
    }
    static formatDownloadNotification(b, I, T) {
      return T == null && (T = {
        title: "A new update is ready to install",
        body: "{appName} version {version} has been downloaded and will be automatically installed on exit"
      }), T = {
        title: T.title.replace("{appName}", I).replace("{version}", b),
        body: T.body.replace("{appName}", I).replace("{version}", b)
      }, T;
    }
    async isStagingMatch(b) {
      const I = b.stagingPercentage;
      let T = I;
      if (T == null)
        return !0;
      if (T = parseInt(T, 10), isNaN(T))
        return this._logger.warn(`Staging percentage is NaN: ${I}`), !0;
      T = T / 100;
      const R = await this.stagingUserIdPromise.value, k = e.UUID.parse(R).readUInt32BE(12) / 4294967295;
      return this._logger.info(`Staging percentage: ${T}, percentage: ${k}, user id: ${R}`), k < T;
    }
    computeFinalHeaders(b) {
      return this.requestHeaders != null && Object.assign(b, this.requestHeaders), b;
    }
    async isUpdateAvailable(b) {
      const I = (0, o.parse)(b.version);
      if (I == null)
        throw (0, e.newError)(`This file could not be downloaded, or the latest version (from update server) does not have a valid semver version: "${b.version}"`, "ERR_UPDATER_INVALID_VERSION");
      const T = this.currentVersion;
      if ((0, o.eq)(I, T) || !await Promise.resolve(this.isUpdateSupported(b)) || !await Promise.resolve(this.isUserWithinRollout(b)))
        return !1;
      const E = (0, o.gt)(I, T), k = (0, o.lt)(I, T);
      return E ? !0 : this.allowDowngrade && k;
    }
    checkIfUpdateSupported(b) {
      const I = b?.minimumSystemVersion, T = (0, h.release)();
      if (I)
        try {
          if ((0, o.lt)(T, I))
            return this._logger.info(`Current OS version ${T} is less than the minimum OS version required ${I} for version ${T}`), !1;
        } catch (R) {
          this._logger.warn(`Failed to compare current OS version(${T}) with minimum OS version(${I}): ${(R.message || R).toString()}`);
        }
      return !0;
    }
    async getUpdateInfoAndProvider() {
      await this.app.whenReady(), this.clientPromise == null && (this.clientPromise = this.configOnDisk.value.then((T) => (0, p.createClient)(T, this, this.createProviderRuntimeOptions())));
      const b = await this.clientPromise, I = await this.stagingUserIdPromise.value;
      return b.setRequestHeaders(this.computeFinalHeaders({ "x-user-staging-id": I })), {
        info: await b.getLatestVersion(),
        provider: b
      };
    }
    createProviderRuntimeOptions() {
      return {
        isUseMultipleRangeRequest: !0,
        platform: this._testOnlyOptions == null ? process.platform : this._testOnlyOptions.platform,
        executor: this.httpExecutor
      };
    }
    async doCheckForUpdates() {
      this.emit("checking-for-update");
      const b = await this.getUpdateInfoAndProvider(), I = b.info;
      if (!await this.isUpdateAvailable(I))
        return this._logger.info(`Update for version ${this.currentVersion.format()} is not available (latest version: ${I.version}, downgrade is ${this.allowDowngrade ? "allowed" : "disallowed"}).`), this.emit("update-not-available", I), {
          isUpdateAvailable: !1,
          versionInfo: I,
          updateInfo: I
        };
      this.updateInfoAndProvider = b, this.onUpdateAvailable(I);
      const T = new e.CancellationToken();
      return {
        isUpdateAvailable: !0,
        versionInfo: I,
        updateInfo: I,
        cancellationToken: T,
        downloadPromise: this.autoDownload ? this.downloadUpdate(T) : null
      };
    }
    onUpdateAvailable(b) {
      this._logger.info(`Found version ${b.version} (url: ${(0, e.asArray)(b.files).map((I) => I.url).join(", ")})`), this.emit("update-available", b);
    }
    /**
     * Start downloading update manually. You can use this method if `autoDownload` option is set to `false`.
     * @returns {Promise<Array<string>>} Paths to downloaded files.
     */
    downloadUpdate(b = new e.CancellationToken()) {
      const I = this.updateInfoAndProvider;
      if (I == null) {
        const R = new Error("Please check update first");
        return this.dispatchError(R), Promise.reject(R);
      }
      if (this.downloadPromise != null)
        return this._logger.info("Downloading update (already in progress)"), this.downloadPromise;
      this._logger.info(`Downloading update from ${(0, e.asArray)(I.info.files).map((R) => R.url).join(", ")}`);
      const T = (R) => {
        if (!(R instanceof e.CancellationError))
          try {
            this.dispatchError(R);
          } catch (E) {
            this._logger.warn(`Cannot dispatch error event: ${E.stack || E}`);
          }
        return R;
      };
      return this.downloadPromise = this.doDownloadUpdate({
        updateInfoAndProvider: I,
        requestHeaders: this.computeRequestHeaders(I.provider),
        cancellationToken: b,
        disableWebInstaller: this.disableWebInstaller,
        disableDifferentialDownload: this.disableDifferentialDownload
      }).catch((R) => {
        throw T(R);
      }).finally(() => {
        this.downloadPromise = null;
      }), this.downloadPromise;
    }
    dispatchError(b) {
      this.emit("error", b, (b.stack || b).toString());
    }
    dispatchUpdateDownloaded(b) {
      this.emit(m.UPDATE_DOWNLOADED, b);
    }
    async loadUpdateConfig() {
      return this._appUpdateConfigPath == null && (this._appUpdateConfigPath = this.app.appUpdateConfigPath), (0, l.load)(await (0, f.readFile)(this._appUpdateConfigPath, "utf-8"));
    }
    computeRequestHeaders(b) {
      const I = b.fileExtraDownloadHeaders;
      if (I != null) {
        const T = this.requestHeaders;
        return T == null ? I : {
          ...I,
          ...T
        };
      }
      return this.computeFinalHeaders({ accept: "*/*" });
    }
    async getOrCreateStagingUserId() {
      const b = u.join(this.app.userDataPath, ".updaterId");
      try {
        const T = await (0, f.readFile)(b, "utf-8");
        if (e.UUID.check(T))
          return T;
        this._logger.warn(`Staging user id file exists, but content was invalid: ${T}`);
      } catch (T) {
        T.code !== "ENOENT" && this._logger.warn(`Couldn't read staging user ID, creating a blank one: ${T}`);
      }
      const I = e.UUID.v5((0, d.randomBytes)(4096), e.UUID.OID);
      this._logger.info(`Generated new staging user ID: ${I}`);
      try {
        await (0, f.outputFile)(b, I);
      } catch (T) {
        this._logger.warn(`Couldn't write out staging user ID: ${T}`);
      }
      return I;
    }
    /** @internal */
    get isAddNoCacheQuery() {
      const b = this.requestHeaders;
      if (b == null)
        return !0;
      for (const I of Object.keys(b)) {
        const T = I.toLowerCase();
        if (T === "authorization" || T === "private-token")
          return !1;
      }
      return !0;
    }
    async getOrCreateDownloadHelper() {
      let b = this.downloadedUpdateHelper;
      if (b == null) {
        const I = (await this.configOnDisk.value).updaterCacheDirName, T = this._logger;
        I == null && T.error("updaterCacheDirName is not specified in app-update.yml Was app build using at least electron-builder 20.34.0?");
        const R = u.join(this.app.baseCachePath, I || this.app.name);
        T.debug != null && T.debug(`updater cache dir: ${R}`), b = new s.DownloadedUpdateHelper(R), this.downloadedUpdateHelper = b;
      }
      return b;
    }
    async executeDownload(b) {
      const I = b.fileInfo, T = {
        headers: b.downloadUpdateOptions.requestHeaders,
        cancellationToken: b.downloadUpdateOptions.cancellationToken,
        sha2: I.info.sha2,
        sha512: I.info.sha512
      };
      this.listenerCount(m.DOWNLOAD_PROGRESS) > 0 && (T.onProgress = (ie) => this.emit(m.DOWNLOAD_PROGRESS, ie));
      const R = b.downloadUpdateOptions.updateInfoAndProvider.info, E = R.version, k = I.packageInfo;
      function $() {
        const ie = decodeURIComponent(b.fileInfo.url.pathname);
        return ie.toLowerCase().endsWith(`.${b.fileExtension.toLowerCase()}`) ? u.basename(ie) : b.fileInfo.info.url;
      }
      const L = await this.getOrCreateDownloadHelper(), q = L.cacheDirForPendingUpdate;
      await (0, f.mkdir)(q, { recursive: !0 });
      const x = $();
      let N = u.join(q, x);
      const j = k == null ? null : u.join(q, `package-${E}${u.extname(k.path) || ".7z"}`), D = async (ie) => {
        await L.setDownloadedFile(N, j, R, I, x, ie), await b.done({
          ...R,
          downloadedFile: N
        });
        const we = u.join(q, "current.blockmap");
        return await (0, f.pathExists)(we) && await (0, f.copyFile)(we, u.join(L.cacheDir, "current.blockmap")), j == null ? [N] : [N, j];
      }, G = this._logger, V = await L.validateDownloadedPath(N, R, I, G);
      if (V != null)
        return N = V, await D(!1);
      const te = async () => (await L.clear().catch(() => {
      }), await (0, f.unlink)(N).catch(() => {
      })), de = await (0, s.createTempUpdateFile)(`temp-${x}`, q, G);
      try {
        await b.task(de, T, j, te), await (0, e.retry)(() => (0, f.rename)(de, N), {
          retries: 60,
          interval: 500,
          shouldRetry: (ie) => ie instanceof Error && /^EBUSY:/.test(ie.message) ? !0 : (G.warn(`Cannot rename temp file to final file: ${ie.message || ie.stack}`), !1)
        });
      } catch (ie) {
        throw await te(), ie instanceof e.CancellationError && (G.info("cancelled"), this.emit("update-cancelled", R)), ie;
      }
      return G.info(`New version ${E} has been downloaded to ${N}`), await D(!0);
    }
    async differentialDownloadInstaller(b, I, T, R, E) {
      try {
        if (this._testOnlyOptions != null && !this._testOnlyOptions.isUseDifferentialDownload)
          return !0;
        const k = I.updateInfoAndProvider.provider, $ = await k.getBlockMapFiles(b.url, this.app.version, I.updateInfoAndProvider.info.version, this.previousBlockmapBaseUrlOverride);
        this._logger.info(`Download block maps (old: "${$[0]}", new: ${$[1]})`);
        const L = async (G) => {
          const V = await this.httpExecutor.downloadToBuffer(G, {
            headers: I.requestHeaders,
            cancellationToken: I.cancellationToken
          });
          if (V == null || V.length === 0)
            throw new Error(`Blockmap "${G.href}" is empty`);
          try {
            return JSON.parse((0, g.gunzipSync)(V).toString());
          } catch (te) {
            throw new Error(`Cannot parse blockmap "${G.href}", error: ${te}`);
          }
        }, q = {
          newUrl: b.url,
          oldFile: u.join(this.downloadedUpdateHelper.cacheDir, E),
          logger: this._logger,
          newFile: T,
          isUseMultipleRangeRequest: k.isUseMultipleRangeRequest,
          requestHeaders: I.requestHeaders,
          cancellationToken: I.cancellationToken
        };
        this.listenerCount(m.DOWNLOAD_PROGRESS) > 0 && (q.onProgress = (G) => this.emit(m.DOWNLOAD_PROGRESS, G));
        const x = async (G, V) => {
          const te = u.join(V, "current.blockmap");
          await (0, f.outputFile)(te, (0, g.gzipSync)(JSON.stringify(G)));
        }, N = async (G) => {
          const V = u.join(G, "current.blockmap");
          try {
            if (await (0, f.pathExists)(V))
              return JSON.parse((0, g.gunzipSync)(await (0, f.readFile)(V)).toString());
          } catch (te) {
            this._logger.warn(`Cannot parse blockmap "${V}", error: ${te}`);
          }
          return null;
        }, j = await L($[1]);
        await x(j, this.downloadedUpdateHelper.cacheDirForPendingUpdate);
        let D = await N(this.downloadedUpdateHelper.cacheDir);
        return D == null && (D = await L($[0])), await new y.GenericDifferentialDownloader(b.info, this.httpExecutor, q).download(D, j), !1;
      } catch (k) {
        if (this._logger.error(`Cannot download differentially, fallback to full download: ${k.stack || k}`), this._testOnlyOptions != null)
          throw k;
        return !0;
      }
    }
  };
  Tt.AppUpdater = _;
  function A(O) {
    const b = (0, o.prerelease)(O);
    return b != null && b.length > 0;
  }
  class P {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info(b) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(b) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error(b) {
    }
  }
  return Tt.NoOpLogger = P, Tt;
}
var Pl;
function sn() {
  if (Pl) return Kt;
  Pl = 1, Object.defineProperty(Kt, "__esModule", { value: !0 }), Kt.BaseUpdater = void 0;
  const e = Kr, d = Pa();
  let h = class extends d.AppUpdater {
    constructor(f, l) {
      super(f, l), this.quitAndInstallCalled = !1, this.quitHandlerAdded = !1;
    }
    quitAndInstall(f = !1, l = !1) {
      this._logger.info("Install on explicit quitAndInstall"), this.install(f, f ? l : this.autoRunAppAfterInstall) ? setImmediate(() => {
        It.autoUpdater.emit("before-quit-for-update"), this.app.quit();
      }) : this.quitAndInstallCalled = !1;
    }
    executeDownload(f) {
      return super.executeDownload({
        ...f,
        done: (l) => (this.dispatchUpdateDownloaded(l), this.addQuitHandler(), Promise.resolve())
      });
    }
    get installerPath() {
      return this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.file;
    }
    // must be sync (because quit even handler is not async)
    install(f = !1, l = !1) {
      if (this.quitAndInstallCalled)
        return this._logger.warn("install call ignored: quitAndInstallCalled is set to true"), !1;
      const i = this.downloadedUpdateHelper, u = this.installerPath, o = i == null ? null : i.downloadedFileInfo;
      if (u == null || o == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      this.quitAndInstallCalled = !0;
      try {
        return this._logger.info(`Install: isSilent: ${f}, isForceRunAfter: ${l}`), this.doInstall({
          isSilent: f,
          isForceRunAfter: l,
          isAdminRightsRequired: o.isAdminRightsRequired
        });
      } catch (s) {
        return this.dispatchError(s), !1;
      }
    }
    addQuitHandler() {
      this.quitHandlerAdded || !this.autoInstallOnAppQuit || (this.quitHandlerAdded = !0, this.app.onQuit((f) => {
        if (this.quitAndInstallCalled) {
          this._logger.info("Update installer has already been triggered. Quitting application.");
          return;
        }
        if (!this.autoInstallOnAppQuit) {
          this._logger.info("Update will not be installed on quit because autoInstallOnAppQuit is set to false.");
          return;
        }
        if (f !== 0) {
          this._logger.info(`Update will be not installed on quit because application is quitting with exit code ${f}`);
          return;
        }
        this._logger.info("Auto install update on quit"), this.install(!0, !1);
      }));
    }
    spawnSyncLog(f, l = [], i = {}) {
      this._logger.info(`Executing: ${f} with args: ${l}`);
      const u = (0, e.spawnSync)(f, l, {
        env: { ...process.env, ...i },
        encoding: "utf-8",
        shell: !0
      }), { error: o, status: s, stdout: a, stderr: r } = u;
      if (o != null)
        throw this._logger.error(r), o;
      if (s != null && s !== 0)
        throw this._logger.error(r), new Error(`Command ${f} exited with code ${s}`);
      return a.trim();
    }
    /**
     * This handles both node 8 and node 10 way of emitting error when spawning a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    // https://github.com/electron-userland/electron-builder/issues/1129
    // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
    async spawnLog(f, l = [], i = void 0, u = "ignore") {
      return this._logger.info(`Executing: ${f} with args: ${l}`), new Promise((o, s) => {
        try {
          const a = { stdio: u, env: i, detached: !0 }, r = (0, e.spawn)(f, l, a);
          r.on("error", (n) => {
            s(n);
          }), r.unref(), r.pid !== void 0 && o(!0);
        } catch (a) {
          s(a);
        }
      });
    }
  };
  return Kt.BaseUpdater = h, Kt;
}
var dr = {}, hr = {}, Ol;
function Iu() {
  if (Ol) return hr;
  Ol = 1, Object.defineProperty(hr, "__esModule", { value: !0 }), hr.FileWithEmbeddedBlockMapDifferentialDownloader = void 0;
  const e = /* @__PURE__ */ Et(), d = Pu(), h = Ql;
  let c = class extends d.DifferentialDownloader {
    async download() {
      const u = this.blockAwareFileInfo, o = u.size, s = o - (u.blockMapSize + 4);
      this.fileMetadataBuffer = await this.readRemoteBytes(s, o - 1);
      const a = f(this.fileMetadataBuffer.slice(0, this.fileMetadataBuffer.length - 4));
      await this.doDownload(await l(this.options.oldFile), a);
    }
  };
  hr.FileWithEmbeddedBlockMapDifferentialDownloader = c;
  function f(i) {
    return JSON.parse((0, h.inflateRawSync)(i).toString());
  }
  async function l(i) {
    const u = await (0, e.open)(i, "r");
    try {
      const o = (await (0, e.fstat)(u)).size, s = Buffer.allocUnsafe(4);
      await (0, e.read)(u, s, 0, s.length, o - s.length);
      const a = Buffer.allocUnsafe(s.readUInt32BE(0));
      return await (0, e.read)(u, a, 0, a.length, o - s.length - a.length), await (0, e.close)(u), f(a);
    } catch (o) {
      throw await (0, e.close)(u), o;
    }
  }
  return hr;
}
var Il;
function Dl() {
  if (Il) return dr;
  Il = 1, Object.defineProperty(dr, "__esModule", { value: !0 }), dr.AppImageUpdater = void 0;
  const e = xe(), d = Kr, h = /* @__PURE__ */ Et(), c = gt, f = Ie, l = sn(), i = Iu(), u = Ye(), o = Ft();
  let s = class extends l.BaseUpdater {
    constructor(r, n) {
      super(r, n);
    }
    isUpdaterActive() {
      return process.env.APPIMAGE == null && !this.forceDevUpdateConfig ? (process.env.SNAP == null ? this._logger.warn("APPIMAGE env is not defined, current application is not an AppImage") : this._logger.info("SNAP env is defined, updater is disabled"), !1) : super.isUpdaterActive();
    }
    /*** @private */
    doDownloadUpdate(r) {
      const n = r.updateInfoAndProvider.provider, p = (0, u.findFile)(n.resolveFiles(r.updateInfoAndProvider.info), "AppImage", ["rpm", "deb", "pacman"]);
      return this.executeDownload({
        fileExtension: "AppImage",
        fileInfo: p,
        downloadUpdateOptions: r,
        task: async (g, y) => {
          const m = process.env.APPIMAGE;
          if (m == null)
            throw (0, e.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
          (r.disableDifferentialDownload || await this.downloadDifferential(p, m, g, n, r)) && await this.httpExecutor.download(p.url, g, y), await (0, h.chmod)(g, 493);
        }
      });
    }
    async downloadDifferential(r, n, p, g, y) {
      try {
        const m = {
          newUrl: r.url,
          oldFile: n,
          logger: this._logger,
          newFile: p,
          isUseMultipleRangeRequest: g.isUseMultipleRangeRequest,
          requestHeaders: y.requestHeaders,
          cancellationToken: y.cancellationToken
        };
        return this.listenerCount(o.DOWNLOAD_PROGRESS) > 0 && (m.onProgress = (_) => this.emit(o.DOWNLOAD_PROGRESS, _)), await new i.FileWithEmbeddedBlockMapDifferentialDownloader(r.info, this.httpExecutor, m).download(), !1;
      } catch (m) {
        return this._logger.error(`Cannot download differentially, fallback to full download: ${m.stack || m}`), process.platform === "linux";
      }
    }
    doInstall(r) {
      const n = process.env.APPIMAGE;
      if (n == null)
        throw (0, e.newError)("APPIMAGE env is not defined", "ERR_UPDATER_OLD_FILE_NOT_FOUND");
      (0, c.unlinkSync)(n);
      let p;
      const g = f.basename(n), y = this.installerPath;
      if (y == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      f.basename(y) === g || !/\d+\.\d+\.\d+/.test(g) ? p = n : p = f.join(f.dirname(n), f.basename(y)), (0, d.execFileSync)("mv", ["-f", y, p]), p !== n && this.emit("appimage-filename-updated", p);
      const m = {
        ...process.env,
        APPIMAGE_SILENT_INSTALL: "true"
      };
      return r.isForceRunAfter ? this.spawnLog(p, [], m) : (m.APPIMAGE_EXIT_AFTER_INSTALL = "true", (0, d.execFileSync)(p, [], { env: m })), !0;
    }
  };
  return dr.AppImageUpdater = s, dr;
}
var pr = {}, mr = {}, Nl;
function Oa() {
  if (Nl) return mr;
  Nl = 1, Object.defineProperty(mr, "__esModule", { value: !0 }), mr.LinuxUpdater = void 0;
  const e = sn();
  let d = class extends e.BaseUpdater {
    constructor(c, f) {
      super(c, f);
    }
    /**
     * Returns true if the current process is running as root.
     */
    isRunningAsRoot() {
      var c;
      return ((c = process.getuid) === null || c === void 0 ? void 0 : c.call(process)) === 0;
    }
    /**
     * Sanitizies the installer path for using with command line tools.
     */
    get installerPath() {
      var c, f;
      return (f = (c = super.installerPath) === null || c === void 0 ? void 0 : c.replace(/\\/g, "\\\\").replace(/ /g, "\\ ")) !== null && f !== void 0 ? f : null;
    }
    runCommandWithSudoIfNeeded(c) {
      if (this.isRunningAsRoot())
        return this._logger.info("Running as root, no need to use sudo"), this.spawnSyncLog(c[0], c.slice(1));
      const { name: f } = this.app, l = `"${f} would like to update"`, i = this.sudoWithArgs(l);
      this._logger.info(`Running as non-root user, using sudo to install: ${i}`);
      let u = '"';
      return (/pkexec/i.test(i[0]) || i[0] === "sudo") && (u = ""), this.spawnSyncLog(i[0], [...i.length > 1 ? i.slice(1) : [], `${u}/bin/bash`, "-c", `'${c.join(" ")}'${u}`]);
    }
    sudoWithArgs(c) {
      const f = this.determineSudoCommand(), l = [f];
      return /kdesudo/i.test(f) ? (l.push("--comment", c), l.push("-c")) : /gksudo/i.test(f) ? l.push("--message", c) : /pkexec/i.test(f) && l.push("--disable-internal-agent"), l;
    }
    hasCommand(c) {
      try {
        return this.spawnSyncLog("command", ["-v", c]), !0;
      } catch {
        return !1;
      }
    }
    determineSudoCommand() {
      const c = ["gksudo", "kdesudo", "pkexec", "beesu"];
      for (const f of c)
        if (this.hasCommand(f))
          return f;
      return "sudo";
    }
    /**
     * Detects the package manager to use based on the available commands.
     * Allows overriding the default behavior by setting the ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER environment variable.
     * If the environment variable is set, it will be used directly. (This is useful for testing each package manager logic path.)
     * Otherwise, it checks for the presence of the specified package manager commands in the order provided.
     * @param pms - An array of package manager commands to check for, in priority order.
     * @returns The detected package manager command or "unknown" if none are found.
     */
    detectPackageManager(c) {
      var f;
      const l = (f = process.env.ELECTRON_BUILDER_LINUX_PACKAGE_MANAGER) === null || f === void 0 ? void 0 : f.trim();
      if (l)
        return l;
      for (const i of c)
        if (this.hasCommand(i))
          return i;
      return this._logger.warn(`No package manager found in the list: ${c.join(", ")}. Defaulting to the first one: ${c[0]}`), c[0];
    }
  };
  return mr.LinuxUpdater = d, mr;
}
var Fl;
function xl() {
  if (Fl) return pr;
  Fl = 1, Object.defineProperty(pr, "__esModule", { value: !0 }), pr.DebUpdater = void 0;
  const e = Ye(), d = Ft(), h = Oa();
  let c = class Du extends h.LinuxUpdater {
    constructor(l, i) {
      super(l, i);
    }
    /*** @private */
    doDownloadUpdate(l) {
      const i = l.updateInfoAndProvider.provider, u = (0, e.findFile)(i.resolveFiles(l.updateInfoAndProvider.info), "deb", ["AppImage", "rpm", "pacman"]);
      return this.executeDownload({
        fileExtension: "deb",
        fileInfo: u,
        downloadUpdateOptions: l,
        task: async (o, s) => {
          this.listenerCount(d.DOWNLOAD_PROGRESS) > 0 && (s.onProgress = (a) => this.emit(d.DOWNLOAD_PROGRESS, a)), await this.httpExecutor.download(u.url, o, s);
        }
      });
    }
    doInstall(l) {
      const i = this.installerPath;
      if (i == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      if (!this.hasCommand("dpkg") && !this.hasCommand("apt"))
        return this.dispatchError(new Error("Neither dpkg nor apt command found. Cannot install .deb package.")), !1;
      const u = ["dpkg", "apt"], o = this.detectPackageManager(u);
      try {
        Du.installWithCommandRunner(o, i, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
      } catch (s) {
        return this.dispatchError(s), !1;
      }
      return l.isForceRunAfter && this.app.relaunch(), !0;
    }
    static installWithCommandRunner(l, i, u, o) {
      var s;
      if (l === "dpkg")
        try {
          u(["dpkg", "-i", i]);
        } catch (a) {
          o.warn((s = a.message) !== null && s !== void 0 ? s : a), o.warn("dpkg installation failed, trying to fix broken dependencies with apt-get"), u(["apt-get", "install", "-f", "-y"]);
        }
      else if (l === "apt")
        o.warn("Using apt to install a local .deb. This may fail for unsigned packages unless properly configured."), u([
          "apt",
          "install",
          "-y",
          "--allow-unauthenticated",
          // needed for unsigned .debs
          "--allow-downgrades",
          // allow lower version installs
          "--allow-change-held-packages",
          i
        ]);
      else
        throw new Error(`Package manager ${l} not supported`);
    }
  };
  return pr.DebUpdater = c, pr;
}
var gr = {}, Ll;
function Ul() {
  if (Ll) return gr;
  Ll = 1, Object.defineProperty(gr, "__esModule", { value: !0 }), gr.PacmanUpdater = void 0;
  const e = Ft(), d = Ye(), h = Oa();
  let c = class Nu extends h.LinuxUpdater {
    constructor(l, i) {
      super(l, i);
    }
    /*** @private */
    doDownloadUpdate(l) {
      const i = l.updateInfoAndProvider.provider, u = (0, d.findFile)(i.resolveFiles(l.updateInfoAndProvider.info), "pacman", ["AppImage", "deb", "rpm"]);
      return this.executeDownload({
        fileExtension: "pacman",
        fileInfo: u,
        downloadUpdateOptions: l,
        task: async (o, s) => {
          this.listenerCount(e.DOWNLOAD_PROGRESS) > 0 && (s.onProgress = (a) => this.emit(e.DOWNLOAD_PROGRESS, a)), await this.httpExecutor.download(u.url, o, s);
        }
      });
    }
    doInstall(l) {
      const i = this.installerPath;
      if (i == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      try {
        Nu.installWithCommandRunner(i, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
      } catch (u) {
        return this.dispatchError(u), !1;
      }
      return l.isForceRunAfter && this.app.relaunch(), !0;
    }
    static installWithCommandRunner(l, i, u) {
      var o;
      try {
        i(["pacman", "-U", "--noconfirm", l]);
      } catch (s) {
        u.warn((o = s.message) !== null && o !== void 0 ? o : s), u.warn("pacman installation failed, attempting to update package database and retry");
        try {
          i(["pacman", "-Sy", "--noconfirm"]), i(["pacman", "-U", "--noconfirm", l]);
        } catch (a) {
          throw u.error("Retry after pacman -Sy failed"), a;
        }
      }
    }
  };
  return gr.PacmanUpdater = c, gr;
}
var vr = {}, kl;
function $l() {
  if (kl) return vr;
  kl = 1, Object.defineProperty(vr, "__esModule", { value: !0 }), vr.RpmUpdater = void 0;
  const e = Ft(), d = Ye(), h = Oa();
  let c = class Fu extends h.LinuxUpdater {
    constructor(l, i) {
      super(l, i);
    }
    /*** @private */
    doDownloadUpdate(l) {
      const i = l.updateInfoAndProvider.provider, u = (0, d.findFile)(i.resolveFiles(l.updateInfoAndProvider.info), "rpm", ["AppImage", "deb", "pacman"]);
      return this.executeDownload({
        fileExtension: "rpm",
        fileInfo: u,
        downloadUpdateOptions: l,
        task: async (o, s) => {
          this.listenerCount(e.DOWNLOAD_PROGRESS) > 0 && (s.onProgress = (a) => this.emit(e.DOWNLOAD_PROGRESS, a)), await this.httpExecutor.download(u.url, o, s);
        }
      });
    }
    doInstall(l) {
      const i = this.installerPath;
      if (i == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      const u = ["zypper", "dnf", "yum", "rpm"], o = this.detectPackageManager(u);
      try {
        Fu.installWithCommandRunner(o, i, this.runCommandWithSudoIfNeeded.bind(this), this._logger);
      } catch (s) {
        return this.dispatchError(s), !1;
      }
      return l.isForceRunAfter && this.app.relaunch(), !0;
    }
    static installWithCommandRunner(l, i, u, o) {
      if (l === "zypper")
        return u(["zypper", "--non-interactive", "--no-refresh", "install", "--allow-unsigned-rpm", "-f", i]);
      if (l === "dnf")
        return u(["dnf", "install", "--nogpgcheck", "-y", i]);
      if (l === "yum")
        return u(["yum", "install", "--nogpgcheck", "-y", i]);
      if (l === "rpm")
        return o.warn("Installing with rpm only (no dependency resolution)."), u(["rpm", "-Uvh", "--replacepkgs", "--replacefiles", "--nodeps", i]);
      throw new Error(`Package manager ${l} not supported`);
    }
  };
  return vr.RpmUpdater = c, vr;
}
var Er = {}, ql;
function Ml() {
  if (ql) return Er;
  ql = 1, Object.defineProperty(Er, "__esModule", { value: !0 }), Er.MacUpdater = void 0;
  const e = xe(), d = /* @__PURE__ */ Et(), h = gt, c = Ie, f = $c, l = Pa(), i = Ye(), u = Kr, o = Ar;
  let s = class extends l.AppUpdater {
    constructor(r, n) {
      super(r, n), this.nativeUpdater = It.autoUpdater, this.squirrelDownloadedUpdate = !1, this.nativeUpdater.on("error", (p) => {
        this._logger.warn(p), this.emit("error", p);
      }), this.nativeUpdater.on("update-downloaded", () => {
        this.squirrelDownloadedUpdate = !0, this.debug("nativeUpdater.update-downloaded");
      });
    }
    debug(r) {
      this._logger.debug != null && this._logger.debug(r);
    }
    closeServerIfExists() {
      this.server && (this.debug("Closing proxy server"), this.server.close((r) => {
        r && this.debug("proxy server wasn't already open, probably attempted closing again as a safety check before quit");
      }));
    }
    async doDownloadUpdate(r) {
      let n = r.updateInfoAndProvider.provider.resolveFiles(r.updateInfoAndProvider.info);
      const p = this._logger, g = "sysctl.proc_translated";
      let y = !1;
      try {
        this.debug("Checking for macOS Rosetta environment"), y = (0, u.execFileSync)("sysctl", [g], { encoding: "utf8" }).includes(`${g}: 1`), p.info(`Checked for macOS Rosetta environment (isRosetta=${y})`);
      } catch (b) {
        p.warn(`sysctl shell command to check for macOS Rosetta environment failed: ${b}`);
      }
      let m = !1;
      try {
        this.debug("Checking for arm64 in uname");
        const I = (0, u.execFileSync)("uname", ["-a"], { encoding: "utf8" }).includes("ARM");
        p.info(`Checked 'uname -a': arm64=${I}`), m = m || I;
      } catch (b) {
        p.warn(`uname shell command to check for arm64 failed: ${b}`);
      }
      m = m || process.arch === "arm64" || y;
      const _ = (b) => {
        var I;
        return b.url.pathname.includes("arm64") || ((I = b.info.url) === null || I === void 0 ? void 0 : I.includes("arm64"));
      };
      m && n.some(_) ? n = n.filter((b) => m === _(b)) : n = n.filter((b) => !_(b));
      const A = (0, i.findFile)(n, "zip", ["pkg", "dmg"]);
      if (A == null)
        throw (0, e.newError)(`ZIP file not provided: ${(0, e.safeStringifyJson)(n)}`, "ERR_UPDATER_ZIP_FILE_NOT_FOUND");
      const P = r.updateInfoAndProvider.provider, O = "update.zip";
      return this.executeDownload({
        fileExtension: "zip",
        fileInfo: A,
        downloadUpdateOptions: r,
        task: async (b, I) => {
          const T = c.join(this.downloadedUpdateHelper.cacheDir, O), R = () => (0, d.pathExistsSync)(T) ? !r.disableDifferentialDownload : (p.info("Unable to locate previous update.zip for differential download (is this first install?), falling back to full download"), !1);
          let E = !0;
          R() && (E = await this.differentialDownloadInstaller(A, r, b, P, O)), E && await this.httpExecutor.download(A.url, b, I);
        },
        done: async (b) => {
          if (!r.disableDifferentialDownload)
            try {
              const I = c.join(this.downloadedUpdateHelper.cacheDir, O);
              await (0, d.copyFile)(b.downloadedFile, I);
            } catch (I) {
              this._logger.warn(`Unable to copy file for caching for future differential downloads: ${I.message}`);
            }
          return this.updateDownloaded(A, b);
        }
      });
    }
    async updateDownloaded(r, n) {
      var p;
      const g = n.downloadedFile, y = (p = r.info.size) !== null && p !== void 0 ? p : (await (0, d.stat)(g)).size, m = this._logger, _ = `fileToProxy=${r.url.href}`;
      this.closeServerIfExists(), this.debug(`Creating proxy server for native Squirrel.Mac (${_})`), this.server = (0, f.createServer)(), this.debug(`Proxy server for native Squirrel.Mac is created (${_})`), this.server.on("close", () => {
        m.info(`Proxy server for native Squirrel.Mac is closed (${_})`);
      });
      const A = (P) => {
        const O = P.address();
        return typeof O == "string" ? O : `http://127.0.0.1:${O?.port}`;
      };
      return await new Promise((P, O) => {
        const b = (0, o.randomBytes)(64).toString("base64").replace(/\//g, "_").replace(/\+/g, "-"), I = Buffer.from(`autoupdater:${b}`, "ascii"), T = `/${(0, o.randomBytes)(64).toString("hex")}.zip`;
        this.server.on("request", (R, E) => {
          const k = R.url;
          if (m.info(`${k} requested`), k === "/") {
            if (!R.headers.authorization || R.headers.authorization.indexOf("Basic ") === -1) {
              E.statusCode = 401, E.statusMessage = "Invalid Authentication Credentials", E.end(), m.warn("No authenthication info");
              return;
            }
            const q = R.headers.authorization.split(" ")[1], x = Buffer.from(q, "base64").toString("ascii"), [N, j] = x.split(":");
            if (N !== "autoupdater" || j !== b) {
              E.statusCode = 401, E.statusMessage = "Invalid Authentication Credentials", E.end(), m.warn("Invalid authenthication credentials");
              return;
            }
            const D = Buffer.from(`{ "url": "${A(this.server)}${T}" }`);
            E.writeHead(200, { "Content-Type": "application/json", "Content-Length": D.length }), E.end(D);
            return;
          }
          if (!k.startsWith(T)) {
            m.warn(`${k} requested, but not supported`), E.writeHead(404), E.end();
            return;
          }
          m.info(`${T} requested by Squirrel.Mac, pipe ${g}`);
          let $ = !1;
          E.on("finish", () => {
            $ || (this.nativeUpdater.removeListener("error", O), P([]));
          });
          const L = (0, h.createReadStream)(g);
          L.on("error", (q) => {
            try {
              E.end();
            } catch (x) {
              m.warn(`cannot end response: ${x}`);
            }
            $ = !0, this.nativeUpdater.removeListener("error", O), O(new Error(`Cannot pipe "${g}": ${q}`));
          }), E.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Length": y
          }), L.pipe(E);
        }), this.debug(`Proxy server for native Squirrel.Mac is starting to listen (${_})`), this.server.listen(0, "127.0.0.1", () => {
          this.debug(`Proxy server for native Squirrel.Mac is listening (address=${A(this.server)}, ${_})`), this.nativeUpdater.setFeedURL({
            url: A(this.server),
            headers: {
              "Cache-Control": "no-cache",
              Authorization: `Basic ${I.toString("base64")}`
            }
          }), this.dispatchUpdateDownloaded(n), this.autoInstallOnAppQuit ? (this.nativeUpdater.once("error", O), this.nativeUpdater.checkForUpdates()) : P([]);
        });
      });
    }
    handleUpdateDownloaded() {
      this.autoRunAppAfterInstall ? this.nativeUpdater.quitAndInstall() : this.app.quit(), this.closeServerIfExists();
    }
    quitAndInstall() {
      this.squirrelDownloadedUpdate ? this.handleUpdateDownloaded() : (this.nativeUpdater.on("update-downloaded", () => this.handleUpdateDownloaded()), this.autoInstallOnAppQuit || this.nativeUpdater.checkForUpdates());
    }
  };
  return Er.MacUpdater = s, Er;
}
var yr = {}, Vr = {}, Bl;
function hd() {
  if (Bl) return Vr;
  Bl = 1, Object.defineProperty(Vr, "__esModule", { value: !0 }), Vr.verifySignature = l;
  const e = xe(), d = Kr, h = Qr, c = Ie;
  function f(s, a) {
    return ['set "PSModulePath=" & chcp 65001 >NUL & powershell.exe', ["-NoProfile", "-NonInteractive", "-InputFormat", "None", "-Command", s], {
      shell: !0,
      timeout: a
    }];
  }
  function l(s, a, r) {
    return new Promise((n, p) => {
      const g = a.replace(/'/g, "''");
      r.info(`Verifying signature ${g}`), (0, d.execFile)(...f(`"Get-AuthenticodeSignature -LiteralPath '${g}' | ConvertTo-Json -Compress"`, 20 * 1e3), (y, m, _) => {
        var A;
        try {
          if (y != null || _) {
            u(r, y, _, p), n(null);
            return;
          }
          const P = i(m);
          if (P.Status === 0) {
            try {
              const T = c.normalize(P.Path), R = c.normalize(a);
              if (r.info(`LiteralPath: ${T}. Update Path: ${R}`), T !== R) {
                u(r, new Error(`LiteralPath of ${T} is different than ${R}`), _, p), n(null);
                return;
              }
            } catch (T) {
              r.warn(`Unable to verify LiteralPath of update asset due to missing data.Path. Skipping this step of validation. Message: ${(A = T.message) !== null && A !== void 0 ? A : T.stack}`);
            }
            const b = (0, e.parseDn)(P.SignerCertificate.Subject);
            let I = !1;
            for (const T of s) {
              const R = (0, e.parseDn)(T);
              if (R.size ? I = Array.from(R.keys()).every((k) => R.get(k) === b.get(k)) : T === b.get("CN") && (r.warn(`Signature validated using only CN ${T}. Please add your full Distinguished Name (DN) to publisherNames configuration`), I = !0), I) {
                n(null);
                return;
              }
            }
          }
          const O = `publisherNames: ${s.join(" | ")}, raw info: ` + JSON.stringify(P, (b, I) => b === "RawData" ? void 0 : I, 2);
          r.warn(`Sign verification failed, installer signed with incorrect certificate: ${O}`), n(O);
        } catch (P) {
          u(r, P, null, p), n(null);
          return;
        }
      });
    });
  }
  function i(s) {
    const a = JSON.parse(s);
    delete a.PrivateKey, delete a.IsOSBinary, delete a.SignatureType;
    const r = a.SignerCertificate;
    return r != null && (delete r.Archived, delete r.Extensions, delete r.Handle, delete r.HasPrivateKey, delete r.SubjectName), a;
  }
  function u(s, a, r, n) {
    if (o()) {
      s.warn(`Cannot execute Get-AuthenticodeSignature: ${a || r}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
      return;
    }
    try {
      (0, d.execFileSync)(...f("ConvertTo-Json test", 10 * 1e3));
    } catch (p) {
      s.warn(`Cannot execute ConvertTo-Json: ${p.message}. Ignoring signature validation due to unsupported powershell version. Please upgrade to powershell 3 or higher.`);
      return;
    }
    a != null && n(a), r && n(new Error(`Cannot execute Get-AuthenticodeSignature, stderr: ${r}. Failing signature validation due to unknown stderr.`));
  }
  function o() {
    const s = h.release();
    return s.startsWith("6.") && !s.startsWith("6.3");
  }
  return Vr;
}
var Hl;
function jl() {
  if (Hl) return yr;
  Hl = 1, Object.defineProperty(yr, "__esModule", { value: !0 }), yr.NsisUpdater = void 0;
  const e = xe(), d = Ie, h = sn(), c = Iu(), f = Ft(), l = Ye(), i = /* @__PURE__ */ Et(), u = hd(), o = vt;
  let s = class extends h.BaseUpdater {
    constructor(r, n) {
      super(r, n), this._verifyUpdateCodeSignature = (p, g) => (0, u.verifySignature)(p, g, this._logger);
    }
    /**
     * The verifyUpdateCodeSignature. You can pass [win-verify-signature](https://github.com/beyondkmp/win-verify-trust) or another custom verify function: ` (publisherName: string[], path: string) => Promise<string | null>`.
     * The default verify function uses [windowsExecutableCodeSignatureVerifier](https://github.com/electron-userland/electron-builder/blob/master/packages/electron-updater/src/windowsExecutableCodeSignatureVerifier.ts)
     */
    get verifyUpdateCodeSignature() {
      return this._verifyUpdateCodeSignature;
    }
    set verifyUpdateCodeSignature(r) {
      r && (this._verifyUpdateCodeSignature = r);
    }
    /*** @private */
    doDownloadUpdate(r) {
      const n = r.updateInfoAndProvider.provider, p = (0, l.findFile)(n.resolveFiles(r.updateInfoAndProvider.info), "exe");
      return this.executeDownload({
        fileExtension: "exe",
        downloadUpdateOptions: r,
        fileInfo: p,
        task: async (g, y, m, _) => {
          const A = p.packageInfo, P = A != null && m != null;
          if (P && r.disableWebInstaller)
            throw (0, e.newError)(`Unable to download new version ${r.updateInfoAndProvider.info.version}. Web Installers are disabled`, "ERR_UPDATER_WEB_INSTALLER_DISABLED");
          !P && !r.disableWebInstaller && this._logger.warn("disableWebInstaller is set to false, you should set it to true if you do not plan on using a web installer. This will default to true in a future version."), (P || r.disableDifferentialDownload || await this.differentialDownloadInstaller(p, r, g, n, e.CURRENT_APP_INSTALLER_FILE_NAME)) && await this.httpExecutor.download(p.url, g, y);
          const O = await this.verifySignature(g);
          if (O != null)
            throw await _(), (0, e.newError)(`New version ${r.updateInfoAndProvider.info.version} is not signed by the application owner: ${O}`, "ERR_UPDATER_INVALID_SIGNATURE");
          if (P && await this.differentialDownloadWebPackage(r, A, m, n))
            try {
              await this.httpExecutor.download(new o.URL(A.path), m, {
                headers: r.requestHeaders,
                cancellationToken: r.cancellationToken,
                sha512: A.sha512
              });
            } catch (b) {
              try {
                await (0, i.unlink)(m);
              } catch {
              }
              throw b;
            }
        }
      });
    }
    // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
    // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
    // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
    async verifySignature(r) {
      let n;
      try {
        if (n = (await this.configOnDisk.value).publisherName, n == null)
          return null;
      } catch (p) {
        if (p.code === "ENOENT")
          return null;
        throw p;
      }
      return await this._verifyUpdateCodeSignature(Array.isArray(n) ? n : [n], r);
    }
    doInstall(r) {
      const n = this.installerPath;
      if (n == null)
        return this.dispatchError(new Error("No update filepath provided, can't quit and install")), !1;
      const p = ["--updated"];
      r.isSilent && p.push("/S"), r.isForceRunAfter && p.push("--force-run"), this.installDirectory && p.push(`/D=${this.installDirectory}`);
      const g = this.downloadedUpdateHelper == null ? null : this.downloadedUpdateHelper.packageFile;
      g != null && p.push(`--package-file=${g}`);
      const y = () => {
        this.spawnLog(d.join(process.resourcesPath, "elevate.exe"), [n].concat(p)).catch((m) => this.dispatchError(m));
      };
      return r.isAdminRightsRequired ? (this._logger.info("isAdminRightsRequired is set to true, run installer using elevate.exe"), y(), !0) : (this.spawnLog(n, p).catch((m) => {
        const _ = m.code;
        this._logger.info(`Cannot run installer: error code: ${_}, error message: "${m.message}", will be executed again using elevate if EACCES, and will try to use electron.shell.openItem if ENOENT`), _ === "UNKNOWN" || _ === "EACCES" ? y() : _ === "ENOENT" ? It.shell.openPath(n).catch((A) => this.dispatchError(A)) : this.dispatchError(m);
      }), !0);
    }
    async differentialDownloadWebPackage(r, n, p, g) {
      if (n.blockMapSize == null)
        return !0;
      try {
        const y = {
          newUrl: new o.URL(n.path),
          oldFile: d.join(this.downloadedUpdateHelper.cacheDir, e.CURRENT_APP_PACKAGE_FILE_NAME),
          logger: this._logger,
          newFile: p,
          requestHeaders: this.requestHeaders,
          isUseMultipleRangeRequest: g.isUseMultipleRangeRequest,
          cancellationToken: r.cancellationToken
        };
        this.listenerCount(f.DOWNLOAD_PROGRESS) > 0 && (y.onProgress = (m) => this.emit(f.DOWNLOAD_PROGRESS, m)), await new c.FileWithEmbeddedBlockMapDifferentialDownloader(n, this.httpExecutor, y).download();
      } catch (y) {
        return this._logger.error(`Cannot download differentially, fallback to full download: ${y.stack || y}`), process.platform === "win32";
      }
      return !1;
    }
  };
  return yr.NsisUpdater = s, yr;
}
var Gl;
function pd() {
  return Gl || (Gl = 1, (function(e) {
    var d = At && At.__createBinding || (Object.create ? (function(m, _, A, P) {
      P === void 0 && (P = A);
      var O = Object.getOwnPropertyDescriptor(_, A);
      (!O || ("get" in O ? !_.__esModule : O.writable || O.configurable)) && (O = { enumerable: !0, get: function() {
        return _[A];
      } }), Object.defineProperty(m, P, O);
    }) : (function(m, _, A, P) {
      P === void 0 && (P = A), m[P] = _[A];
    })), h = At && At.__exportStar || function(m, _) {
      for (var A in m) A !== "default" && !Object.prototype.hasOwnProperty.call(_, A) && d(_, m, A);
    };
    Object.defineProperty(e, "__esModule", { value: !0 }), e.NsisUpdater = e.MacUpdater = e.RpmUpdater = e.PacmanUpdater = e.DebUpdater = e.AppImageUpdater = e.Provider = e.NoOpLogger = e.AppUpdater = e.BaseUpdater = void 0;
    const c = /* @__PURE__ */ Et(), f = Ie;
    var l = sn();
    Object.defineProperty(e, "BaseUpdater", { enumerable: !0, get: function() {
      return l.BaseUpdater;
    } });
    var i = Pa();
    Object.defineProperty(e, "AppUpdater", { enumerable: !0, get: function() {
      return i.AppUpdater;
    } }), Object.defineProperty(e, "NoOpLogger", { enumerable: !0, get: function() {
      return i.NoOpLogger;
    } });
    var u = Ye();
    Object.defineProperty(e, "Provider", { enumerable: !0, get: function() {
      return u.Provider;
    } });
    var o = Dl();
    Object.defineProperty(e, "AppImageUpdater", { enumerable: !0, get: function() {
      return o.AppImageUpdater;
    } });
    var s = xl();
    Object.defineProperty(e, "DebUpdater", { enumerable: !0, get: function() {
      return s.DebUpdater;
    } });
    var a = Ul();
    Object.defineProperty(e, "PacmanUpdater", { enumerable: !0, get: function() {
      return a.PacmanUpdater;
    } });
    var r = $l();
    Object.defineProperty(e, "RpmUpdater", { enumerable: !0, get: function() {
      return r.RpmUpdater;
    } });
    var n = Ml();
    Object.defineProperty(e, "MacUpdater", { enumerable: !0, get: function() {
      return n.MacUpdater;
    } });
    var p = jl();
    Object.defineProperty(e, "NsisUpdater", { enumerable: !0, get: function() {
      return p.NsisUpdater;
    } }), h(Ft(), e);
    let g;
    function y() {
      if (process.platform === "win32")
        g = new (jl()).NsisUpdater();
      else if (process.platform === "darwin")
        g = new (Ml()).MacUpdater();
      else {
        g = new (Dl()).AppImageUpdater();
        try {
          const m = f.join(process.resourcesPath, "package-type");
          if (!(0, c.existsSync)(m))
            return g;
          switch ((0, c.readFileSync)(m).toString().trim()) {
            case "deb":
              g = new (xl()).DebUpdater();
              break;
            case "rpm":
              g = new ($l()).RpmUpdater();
              break;
            case "pacman":
              g = new (Ul()).PacmanUpdater();
              break;
            default:
              break;
          }
        } catch (m) {
          console.warn("Unable to detect 'package-type' for autoUpdater (rpm/deb/pacman support). If you'd like to expand support, please consider contributing to electron-builder", m.message);
        }
      }
      return g;
    }
    Object.defineProperty(e, "autoUpdater", {
      enumerable: !0,
      get: () => g || y()
    });
  })(At)), At;
}
var ua = pd();
async function md() {
  try {
    const e = await Lc.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    return e && e.length > 0 ? e[0].thumbnail.toDataURL() : null;
  } catch (e) {
    return console.error("Failed to capture screen:", e), null;
  }
}
const gd = Bc(Mc);
let We = !1, Ht = 0, jt = 0, Ot = null, mt = null, Wt = null, Xr = null, Jr = null, xu = 6e4;
const Lu = 120 * 1e3, vd = 2;
function Ed() {
  Yr.on("keydown", () => {
    We && jt++;
  }), Yr.on("mousedown", () => {
    We && Ht++;
  }), Yr.start();
}
function yd(e, d, h, c = 6e4) {
  We || (We = !0, xu = c, Wt = e, Xr = d, Jr = h, Ht = 0, jt = 0, Uu());
}
function Uu() {
  Ot = setInterval(async () => {
    const e = await qc(), d = e?.owner.name || "Unknown", h = e?.title || "Unknown", c = await Od(d, h), f = Ht === 0 && jt === 0, l = {
      session_id: Wt,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      mouse_count: Ht,
      keyboard_count: jt,
      app_name: d,
      window_title: h,
      domain: c,
      idle_flag: f
    };
    Ht = 0, jt = 0, Xr && Xr(l);
  }, xu), fa();
}
function fa() {
  if (!We) return;
  const e = [];
  for (; e.length < vd; ) {
    const d = Math.floor(Math.random() * Lu);
    e.includes(d) || e.push(d);
  }
  e.sort((d, h) => d - h), ku(e, 0, 0);
}
function ku(e, d, h) {
  if (!We) return;
  if (d >= e.length) {
    fa();
    return;
  }
  const c = e[d] - h;
  mt = setTimeout(async () => {
    if (!We || !Wt) return;
    try {
      const l = await md();
      l && Jr && Jr({
        session_id: Wt,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        base64: l
      });
    } catch (l) {
      console.error("Screenshot error:", l);
    }
    if (d === e.length - 1) {
      const l = Lu - e[d];
      mt = setTimeout(() => fa(), Math.max(l, 0));
    } else
      ku(e, d + 1, e[d]);
  }, c);
}
function wd() {
  We && (We = !1, Wt = null, Xr = null, Jr = null, Ot && (clearInterval(Ot), Ot = null), mt && (clearTimeout(mt), mt = null));
}
function _d() {
  Yr.stop();
}
function Sd() {
  We && (We = !1, Ot && (clearInterval(Ot), Ot = null), mt && (clearTimeout(mt), mt = null));
}
function Rd() {
  We || !Wt || (We = !0, Ht = 0, jt = 0, Uu());
}
const Ad = /* @__PURE__ */ new Set([
  "chrome",
  "google chrome",
  "chromium",
  "firefox",
  "mozilla firefox",
  "msedge",
  "microsoft edge",
  "safari",
  "opera",
  "brave browser",
  "vivaldi",
  "arc"
]), Td = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$app = [System.Windows.Automation.AutomationElement]::RootElement
$focused = [System.Windows.Automation.AutomationElement]::FocusedElement
if ($null -eq $focused) { exit 1 }
$parent = $focused
for ($i = 0; $i -lt 8; $i++) {
  $pattern = $null
  try { $pattern = $parent.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) } catch {}
  if ($pattern) {
    $val = ($pattern).Current.Value
    if ($val -match '^https?://') { Write-Output $val; exit 0 }
    if ($val -match '^[a-zA-Z0-9][a-zA-Z0-9-]*\\.[a-zA-Z]{2,}') { Write-Output ('https://' + $val); exit 0 }
  }
  try { $parent = $parent.TreeWalker.RawViewWalker.GetParent($parent) } catch { break }
  if ($null -eq $parent) { break }
}
exit 1
`.trim(), Cd = [
  / [-–—|] Google Chrome$/i,
  / [-–—|] Chromium$/i,
  / [-–—|] Microsoft Edge$/i,
  / [-–—|] Mozilla Firefox$/i,
  / [-–—|] Firefox$/i,
  / [-–—|] Safari$/i,
  / [-–—|] Opera$/i,
  / [-–—|] Brave$/i,
  / [-–—|] Vivaldi$/i,
  / [-–—|] Arc$/i
], bd = /(?:https?:\/\/)?([a-z0-9][a-z0-9\-]*(?:\.[a-z0-9\-]+)+)(?:[:/]|$)/i, Pd = /localhost(?::[0-9]+)?/i;
async function Od(e, d) {
  const h = e.toLowerCase();
  if (![...Ad].some((u) => h.includes(u))) return "";
  if (process.platform === "win32")
    try {
      const { stdout: u } = await gd("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        Td
      ], { timeout: 2e3 }), o = u.trim();
      if (o)
        try {
          return new URL(o).hostname;
        } catch {
          return o;
        }
    } catch {
    }
  let f = d;
  for (const u of Cd)
    f = f.replace(u, "").trim();
  const l = Pd.exec(f);
  if (l) return l[0];
  const i = bd.exec(f);
  if (i?.[1]) {
    const u = i[1];
    if (u.length >= 4 && /\.[a-z]{2,}$/i.test(u))
      return u.toLowerCase();
  }
  return "";
}
const da = Gt.join(pt.getPath("userData"), "tracker_cache.json");
let Ze = [], $u = 1;
function Id() {
  if (ca.existsSync(da))
    try {
      const e = ca.readFileSync(da, "utf8");
      Ze = JSON.parse(e), Ze.length > 0 && ($u = Math.max(...Ze.map((d) => d.id || 0)) + 1);
    } catch (e) {
      console.error("Failed to parse cache JSON. Starting fresh.", e), Ze = [];
    }
}
function qu() {
  ca.writeFileSync(da, JSON.stringify(Ze, null, 2), "utf8");
}
function Dd() {
  Id();
}
function Nd(e) {
  const d = {
    id: $u++,
    session_id: e.session_id,
    timestamp: e.timestamp,
    mouse_count: e.mouse_count || 0,
    keyboard_count: e.keyboard_count || 0,
    app_name: e.app_name || "",
    window_title: e.window_title || "",
    domain: e.domain || "",
    idle_flag: !!e.idle_flag,
    type: e.type || void 0,
    file_url: e.file_url || "",
    file_data: e.file_data || "",
    synced: 0
  };
  Ze.push(d), qu();
}
function Fd() {
  return Ze.filter((e) => e.synced === 0).slice(0, 50);
}
function xd(e) {
  if (e.length === 0) return;
  let d = !1;
  Ze = Ze.map((c) => c.id && e.includes(c.id) ? (d = !0, { ...c, synced: 1 }) : c);
  const h = /* @__PURE__ */ new Date();
  h.setDate(h.getDate() - 7), Ze = Ze.filter((c) => !(c.synced === 1 && new Date(c.timestamp) < h)), d && qu();
}
const Ld = process.env.VITE_API_BASE_URL || "http://localhost:3001";
let ha = null, Wl = null;
function Ud(e) {
  ha = setInterval(Mu, 3e4);
}
function kd() {
  ha && clearInterval(ha);
}
async function $d(e) {
  Nd(e), await Mu();
}
async function Mu() {
  const e = Fd();
  if (e.length !== 0)
    try {
      const d = e.map((l) => ({
        session_id: l.session_id,
        timestamp: l.timestamp,
        mouse_count: l.mouse_count,
        keyboard_count: l.keyboard_count,
        app_name: l.app_name,
        window_title: l.window_title,
        domain: l.domain || "",
        idle_flag: !!l.idle_flag,
        // We pass the screenshot base64 directly to our API for now
        file_url: l.file_url
      })), h = await fetch(`${Ld}/api/heartbeats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Wl ? { Authorization: `Bearer ${Wl}` } : {}
        },
        body: JSON.stringify(d)
      });
      if (!h.ok)
        throw new Error(`API Error: ${h.status} ${h.statusText}`);
      const c = await h.json();
      console.log(`✅ Successfully synced ${e.length} samples to backend API.`, c);
      const f = e.map((l) => l.id);
      xd(f);
    } catch (d) {
      console.error("Failed to sync tracking data (will retry next loop):", d);
    }
}
const Bu = Gt.dirname(Uc(import.meta.url));
process.env.DIST = Gt.join(Bu, "../dist");
process.env.VITE_PUBLIC = pt.isPackaged ? process.env.DIST : Gt.join(process.env.DIST, "../public");
let Pt = null, _r = null;
const Vl = process.env.VITE_DEV_SERVER_URL;
function Yl() {
  Pt = new zl({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 500,
    webPreferences: {
      preload: Gt.join(Bu, "preload.mjs"),
      // Ensure webSecurity is on unless specifically disabled!
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), Pt.webContents.on("did-finish-load", () => {
    Pt?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Vl ? Pt.loadURL(Vl) : Pt.loadFile(Gt.join(process.env.DIST || "", "index.html"));
}
pt.on("window-all-closed", () => {
  process.platform !== "darwin" && pt.quit();
});
pt.whenReady().then(async () => {
  Yl(), pt.on("activate", () => {
    zl.getAllWindows().length === 0 && Yl();
  }), Dd(), Ud(), Ed(), pt.isPackaged && (ua.autoUpdater.checkForUpdatesAndNotify(), ua.autoUpdater.on("update-downloaded", () => {
    if (zr.isSupported()) {
      const e = new zr({
        title: "🔄 DigiReps Update Ready",
        body: "A new version has been downloaded. Restart the app to apply it."
      });
      e.show(), e.on("click", () => {
        ua.autoUpdater.quitAndInstall();
      });
    }
  }));
});
pt.on("will-quit", () => {
  _d(), kd();
});
Sr.handle("start-tracking", async (e, { projectId: d, userId: h }) => {
  console.log("Starting tracking for project:", d, "user:", h);
  const c = process.env.VITE_API_BASE_URL || "http://localhost:3001";
  let f;
  try {
    const i = await fetch(`${c}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: h || "local-user", project_id: d })
    });
    if (i.ok)
      f = (await i.json()).session_id, console.log(`✅ Session created: ${f}`);
    else {
      const o = (await i.json().catch(() => ({}))).error || `Backend returned ${i.status}`;
      return console.error("❌ Failed to create session:", o), { status: "error", error: `Could not start session: ${o}` };
    }
  } catch (i) {
    return console.error("❌ Could not reach backend:", i), { status: "error", error: "Cannot connect to the backend server. Please make sure it is running." };
  }
  _r = f;
  const l = process.env.VITE_API_BASE_URL || "http://localhost:3001";
  return yd(f, (i) => {
    Pt?.webContents.send("tracking-sample", i), $d(i);
  }, async (i) => {
    Pt?.webContents.send("tracking-screenshot", i);
    try {
      const u = await fetch(`${l}/api/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(i)
      });
      u.ok ? console.log("📸 Screenshot uploaded to backend") : console.error("Screenshot upload failed:", u.status);
    } catch (u) {
      console.error("Screenshot upload error (will retry next session):", u);
    }
  }, 6e4), { status: "running", session_id: f };
});
Sr.handle("stop-tracking", async () => {
  if (console.log("Stopping tracking"), wd(), _r) {
    const e = process.env.VITE_API_BASE_URL || "http://localhost:3001";
    try {
      await fetch(`${e}/api/sessions/${_r}/end`, { method: "POST" }), console.log(`🏁 Session ${_r} marked as ended in DB`);
    } catch (d) {
      console.warn("Could not end session in DB:", d);
    }
    _r = null;
  }
  return { status: "stopped" };
});
Sr.handle("pause-tracking", async () => (console.log("Pausing tracking"), Sd(), { status: "paused" }));
Sr.handle("resume-tracking", async () => (console.log("Resuming tracking"), Rd(), { status: "running" }));
Sr.handle("show-notification", (e, { title: d, body: h }) => {
  zr.isSupported() && new zr({
    title: d,
    body: h,
    urgency: "critical",
    // Windows doesn't use this much, but helps in some environments
    silent: !1
    // Ensure system sound plays
  }).show();
});
