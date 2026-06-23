// pvpnet.js — service-agnostic PvP transport.
//
// The game talks to ONE interface (createPvpLink) and never to a concrete
// service. Today the only wired transport is "loopback" (BroadcastChannel —
// two tabs in the same browser/origin, perfect for dev testing on one machine).
// Tomorrow a "tailscale" transport (WebSocket/WebRTC to a 100.x peer) can drop
// in behind the same interface, so nothing above this file has to change.
//
// Link interface returned by createPvpLink(opts):
//   { send(payloadObj), close() }
// opts: { transport, role:'host'|'join', code, addr, port, cfg, onState, onMessage }
//   onState(state, note)   state ∈ 'connecting'|'connected'|'closed'|'error'
//   onMessage(payloadObj)  a message from the peer (already parsed)

(function () {
  const CHAN_PREFIX = 'gok-pvp-';

  // ---- Loopback: same-origin cross-tab via BroadcastChannel -----------------
  function loopbackLink({ role, code, cfg, onState, onMessage }) {
    if (typeof BroadcastChannel === 'undefined') {
      onState('error', 'BroadcastChannel is unsupported here.');
      return { send() {}, close() {} };
    }
    const peerId = Math.random().toString(36).slice(2, 9);
    const chan = new BroadcastChannel(CHAN_PREFIX + code);
    let connected = false;
    let peer = null;

    const post = (t, data) => { try { chan.postMessage({ t, from: peerId, data }); } catch (e) {} };
    const markUp = (pid) => {
      if (connected) return;
      connected = true; peer = pid;
      onState('connected', `Linked to peer ${pid}.`);
    };

    chan.onmessage = (e) => {
      const m = e.data;
      if (!m || m.from === peerId) return;            // ignore our own posts
      if (m.t === 'host-ready') {                     // a host announced itself
        if (role === 'join') post('hello', {});
      } else if (m.t === 'hello') {                   // a joiner knocked
        if (role === 'host') { post('welcome', { cfg }); markUp(m.from); }
      } else if (m.t === 'welcome') {                 // host accepted us
        if (role === 'join') markUp(m.from);
      } else if (m.t === 'bye') {
        if (m.from === peer) onState('closed', 'Peer left the link.');
      } else if (m.t === 'msg') {
        onMessage(m.data);
      }
    };

    onState('connecting', role === 'host'
      ? `Hosting on code ${code} — waiting for a peer…`
      : `Joining code ${code}…`);
    // Announce, covering both arrival orders.
    if (role === 'host') post('host-ready', {});
    else post('hello', {});

    return {
      send: (payload) => post('msg', payload),
      close: () => { post('bye', {}); try { chan.close(); } catch (e) {} },
    };
  }

  // ---- Tailscale: future tailnet transport (not wired yet) ------------------
  function tailscaleLink({ onState }) {
    onState('error', 'Tailscale transport is not wired yet — use Loopback for now.');
    return { send() {}, close() {} };
  }

  window.PVP_TRANSPORTS = [
    { id: 'loopback',  label: 'Loopback',  sub: 'Two tabs · this browser', available: true  },
    { id: 'tailscale', label: 'Tailscale', sub: 'LAN / tailnet · later',   available: false },
  ];

  window.createPvpLink = (opts) =>
    opts.transport === 'tailscale' ? tailscaleLink(opts) : loopbackLink(opts);
})();
