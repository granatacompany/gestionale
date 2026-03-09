
/* =========================================================
   AUTH GUARD + SIDEBAR ACTIVE + SUPABASE SYNC (KV)
   ========================================================= */

const AUTH_KEY = "spazioexe_auth";

function paginaCorrente() {
  const p = window.location.pathname.split("/").pop();
  return p || "index.html";
}

function isLoggato() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

/* =========================
   SUPABASE CONFIG
   ========================= */

// 🔧 INCOLLA QUI I TUOI DATI SUPABASE
const SUPABASE_URL = "https://ncvtjvsqnedpisnnflod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QhkbuhieU8AdHbAeIR1p1g_lBS3G_EM";

// 1 negozio = 1 shop_id (puoi lasciarlo fisso per Mounir)
const SHOP_ID = "mounir";

const KV_TABLE = "spazioexe_kv";

// Chiavi che oggi usi in localStorage (nei tuoi file)
const SYNC_KEYS = [
  "clienti",
  "preventivi",
  "riparazioni",
  "ordini",
  "magazzino",
  "movimentiMagazzino",
  "vendite",
  "servizi",
  "obiettiviGiornalieriServizi",
];

const sbClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* =========================
   SYNC LAYER
   ========================= */

function safeParseJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function toJsonb(valueStr) {
  const parsed = safeParseJson(valueStr);
  return parsed !== null ? parsed : valueStr;
}

function fromJsonb(value) {
  // value può essere oggetto/array/string/numero…
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function kvUpsert(key, valueStr) {
  if (!sbClient) return;

  const payload = {
    shop_id: SHOP_ID,
    key,
    value: toJsonb(valueStr),
    updated_at: new Date().toISOString(),
  };

  await sbClient
    .from(KV_TABLE)
    .upsert(payload, { onConflict: "shop_id,key" });
}

async function kvFetchAll() {
  if (!sbClient) return [];

  const { data, error } = await sbClient
    .from(KV_TABLE)
    .select("key,value")
    .eq("shop_id", SHOP_ID);

  if (error) return [];
  return data || [];
}

async function ensureSupabaseSessionOrKick() {
  // Se sei dentro e non hai sessione supabase -> fuori (evita scritture anonime)
  const pagina = paginaCorrente();
  if (pagina === "index.html") return true;

  if (!sbClient) return true; // se manca CDN, almeno non rompiamo tutto

  const { data } = await sbClient.auth.getSession();
  const hasSession = Boolean(data?.session);

  if (!hasSession) {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem("spazioexe_ruolo");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

function patchLocalStorageSync() {
  // intercetto setItem/removeItem/clear per replicare su Supabase
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  localStorage.setItem = function (k, v) {
    originalSetItem(k, v);
    if (SYNC_KEYS.includes(k)) {
      // fire-and-forget
      kvUpsert(k, v);
    }
  };

  localStorage.removeItem = function (k) {
    originalRemoveItem(k);
    if (sbClient && SYNC_KEYS.includes(k)) {
      sbClient.from(KV_TABLE).delete().eq("shop_id", SHOP_ID).eq("key", k);
    }
  };

  localStorage.clear = function () {
    originalClear();
    if (sbClient) {
      sbClient.from(KV_TABLE).delete().eq("shop_id", SHOP_ID);
    }
  };
}

async function syncDownThenSeedUp() {
  // 1) Scarico tutto dal cloud -> localStorage (senza rompere)
  const rows = await kvFetchAll();
  const map = new Map(rows.map(r => [r.key, r.value]));

  // uso setItem originale per evitare loop dopo patch
  const originalSetItem = Object.getPrototypeOf(localStorage).setItem
    ? Object.getPrototypeOf(localStorage).setItem.bind(localStorage)
    : localStorage.setItem.bind(localStorage);

  SYNC_KEYS.forEach((k) => {
    if (map.has(k)) {
      originalSetItem(k, fromJsonb(map.get(k)));
    }
  });

  // 2) Se cloud è vuoto per una chiave ma local ha dati, “semo” su cloud
  for (const k of SYNC_KEYS) {
    if (!map.has(k)) {
      const localVal = localStorage.getItem(k);
      if (localVal !== null && localVal !== "") {
        await kvUpsert(k, localVal);
      }
    }
  }
}

/* =========================
   BOOT
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  const pagina = paginaCorrente();

  // Guard “locale” (come prima)
  if (pagina !== "index.html" && !isLoggato()) {
    window.location.href = "index.html";
    return;
  }

  // Guard Supabase session
  const ok = await ensureSupabaseSessionOrKick();
  if (!ok) return;

  // Sync iniziale + hook su setItem
  patchLocalStorageSync();
  await syncDownThenSeedUp();

  // Sidebar active
  const linkSidebar = document.querySelectorAll(".sidebar a");
  linkSidebar.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === pagina) link.classList.add("active");
  });
});