import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type RuntimeConfig = {
  ipos_authorization: string | null;
  ipos_access_token: string | null;
  cron_secret: string | null;
  company_uid: string;
  brand_uid: string;
  city_uid: string;
  store_uid: string;
  store_name: string;
  org_id: string;
  warehouse_id: string;
};

type CatalogRecord = Record<string, unknown> & {
  id?: string;
  item_id?: string;
  item_name?: string;
};

type IposSale = {
  tran_id?: string;
  tran_no?: string;
  tran_date?: number;
  sale_updated_at?: number;
  store_uid?: string;
  deleted?: boolean;
  sale_detail?: unknown[];
  [key: string]: unknown;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TIME_ZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_PAGES = 100;
const SALE_DETAIL_CONCURRENCY = 5;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function serviceHeaders(): HeadersInit {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
  };
}

async function rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`Supabase RPC ${name} failed (${response.status}): ${detail}`);
  }

  return await response.json() as T;
}

function localDayWindow(dayOffset = 0): { start: number; end: number; label: string } {
  const shifted = new Date(Date.now() + TIME_ZONE_OFFSET_MS);
  const utcStart = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + dayOffset,
  ) - TIME_ZONE_OFFSET_MS;

  return {
    start: utcStart,
    end: utcStart + 24 * 60 * 60 * 1000 - 1000,
    label: new Date(utcStart + TIME_ZONE_OFFSET_MS).toISOString().slice(0, 10),
  };
}

function localDayWindowForLabel(label: string): { start: number; end: number; label: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (!match) throw new Error("sync_date must use YYYY-MM-DD");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  const parsed = new Date(localMidnightAsUtc);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("sync_date is not a valid calendar date");
  }

  const utcStart = localMidnightAsUtc - TIME_ZONE_OFFSET_MS;
  return {
    start: utcStart,
    end: utcStart + 24 * 60 * 60 * 1000 - 1000,
    label,
  };
}

function salesFromPayload(payload: unknown): IposSale[] {
  if (Array.isArray(payload)) return payload as IposSale[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "result", "items", "sales"]) {
      if (Array.isArray(record[key])) return record[key] as IposSale[];
    }
  }
  throw new Error("Unexpected iPOS response: sales array not found");
}

function saleFromPayload(payload: unknown): IposSale {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const data = record.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as IposSale;
    }
  }
  throw new Error("Unexpected iPOS response: sale detail not found");
}

function arrayFromPayload(payload: unknown): CatalogRecord[] {
  if (Array.isArray(payload)) return payload as CatalogRecord[];
  if (payload && typeof payload === "object") {
    const data = (payload as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as CatalogRecord[];
  }
  throw new Error("Unexpected iPOS catalog response: data array not found");
}

async function loadConfig(): Promise<RuntimeConfig> {
  return await rpc<RuntimeConfig>("ly_ipos_get_runtime_config", {});
}

function iposHeaders(config: RuntimeConfig): HeadersInit {
  return {
    accept: "application/json, text/plain, */*",
    authorization: config.ipos_authorization!,
    access_token: config.ipos_access_token!,
    fabi_type: "pos-cms",
    origin: "https://fabi.ipos.vn",
    referer: "https://fabi.ipos.vn/",
    "accept-language": "vi",
    "x-client-timezone": String(TIME_ZONE_OFFSET_MS),
  };
}

async function fetchCatalogEndpoint(config: RuntimeConfig, endpoint: string): Promise<CatalogRecord[]> {
  const url = new URL(`https://posapi.ipos.vn/api/mdata/v1/${endpoint}`);
  url.searchParams.set("skip_limit", "true");
  url.searchParams.set("company_uid", config.company_uid);
  url.searchParams.set("brand_uid", config.brand_uid);
  url.searchParams.set("city_uid", config.city_uid);

  const response = await fetch(url, { headers: iposHeaders(config) });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`iPOS catalog ${endpoint} failed (${response.status}): ${detail}`);
  }
  return arrayFromPayload(await response.json());
}

async function syncCatalog(config: RuntimeConfig): Promise<Record<string, unknown>> {
  const [items, types, classes, units] = await Promise.all([
    fetchCatalogEndpoint(config, "items"),
    fetchCatalogEndpoint(config, "item-types"),
    fetchCatalogEndpoint(config, "item-classes"),
    fetchCatalogEndpoint(config, "units"),
  ]);

  const typeByUid = new Map(types.map((entry) => [String(entry.id ?? ""), entry]));
  const classByUid = new Map(classes.map((entry) => [String(entry.id ?? ""), entry]));
  const unitByUid = new Map(units.map((entry) => [String(entry.id ?? ""), entry]));
  const normalized = items.map((item) => {
    const type = typeByUid.get(String(item.item_type_uid ?? ""));
    const itemClass = classByUid.get(String(item.item_class_uid ?? ""));
    const unit = unitByUid.get(String(item.unit_uid ?? ""));
    return {
      item_id: item.item_id,
      item_name: item.item_name,
      ots_price: item.ots_price,
      ta_price: item.ta_price,
      active: item.active,
      deleted: item.deleted,
      item_type_id: type?.item_type_id ?? null,
      item_type_name: type?.item_type_name ?? null,
      item_class_id: itemClass?.item_class_id ?? null,
      item_class_name: itemClass?.item_class_name ?? null,
      unit_id: unit?.unit_id ?? null,
      unit_name: unit?.unit_name ?? null,
    };
  });

  return await rpc<Record<string, unknown>>("ly_ipos_upsert_products", {
    p_org_id: config.org_id,
    p_warehouse_id: config.warehouse_id,
    p_items: normalized,
  });
}

async function fetchSalesForDay(config: RuntimeConfig, start: number, end: number): Promise<IposSale[]> {
  const all: IposSale[] = [];
  const seenPageSignatures = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL("https://posapi.ipos.vn/api/reports_v1/v3/pos-cms/report/sale-by-date");
    url.searchParams.set("company_uid", config.company_uid);
    url.searchParams.set("brand_uid", config.brand_uid);
    url.searchParams.set("store_uid", config.store_uid);
    url.searchParams.set("page", String(page));
    url.searchParams.set("start_date", String(start));
    url.searchParams.set("end_date", String(end));
    url.searchParams.set("sort", "dsc");
    url.searchParams.set("store_open_at", "0");

    const response = await fetch(url, { headers: iposHeaders(config) });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1000);
      throw new Error(`iPOS request failed (${response.status}): ${detail}`);
    }

    const pageSales = salesFromPayload(await response.json());
    if (pageSales.length === 0) break;

    const signature = pageSales.map((sale) => sale.tran_id ?? "").join("|");
    if (seenPageSignatures.has(signature)) break;
    seenPageSignatures.add(signature);
    all.push(...pageSales);
  }

  const unique = new Map<string, IposSale>();
  for (const sale of all) {
    if (sale.tran_id) unique.set(sale.tran_id, sale);
  }

  const headers = [...unique.values()];
  const detailed: IposSale[] = [];
  for (let index = 0; index < headers.length; index += SALE_DETAIL_CONCURRENCY) {
    const batch = headers.slice(index, index + SALE_DETAIL_CONCURRENCY);
    detailed.push(...await Promise.all(
      batch.map((sale) => fetchSaleDetail(config, sale, start, end)),
    ));
  }
  return detailed;
}

async function fetchSaleDetail(
  config: RuntimeConfig,
  saleHeader: IposSale,
  start: number,
  end: number,
): Promise<IposSale> {
  if (!saleHeader.tran_id) throw new Error("iPOS sale is missing tran_id");

  const url = new URL("https://posapi.ipos.vn/api/v1/reports/sales/get-sale-by-tran-id");
  url.searchParams.set("company_uid", config.company_uid);
  url.searchParams.set("brand_uid", config.brand_uid);
  url.searchParams.set("store_uid", config.store_uid);
  url.searchParams.set("start_date", String(start));
  url.searchParams.set("end_date", String(end));
  url.searchParams.set("tran_id", saleHeader.tran_id);

  const response = await fetch(url, { headers: iposHeaders(config) });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`iPOS sale detail failed (${response.status}): ${detail}`);
  }

  const detailed = saleFromPayload(await response.json());
  return { ...saleHeader, ...detailed };
}

async function recordAttempt(
  config: RuntimeConfig,
  values: { success: boolean; error?: string },
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    org_id: config.org_id,
    store_uid: config.store_uid,
    last_attempt_at: now,
    updated_at: now,
    last_error: values.success ? null : (values.error ?? "Unknown error").slice(0, 2000),
  };
  if (values.success) payload.last_success_at = now;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/ly_ipos_sync_state?on_conflict=org_id,store_uid`,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(),
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    console.error("Could not record iPOS sync state", response.status, (await response.text()).slice(0, 500));
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase runtime configuration is unavailable" }, 500);
  }

  let config: RuntimeConfig;
  try {
    config = await loadConfig();
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  if (!config.cron_secret || request.headers.get("x-ly-cron-secret") !== config.cron_secret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!config.ipos_authorization || !config.ipos_access_token) {
    return jsonResponse({
      error: "iPOS credentials are not configured",
      store: config.store_name,
    }, 503);
  }

  try {
    let requestBody: Record<string, unknown> = {};
    try {
      requestBody = await request.json() as Record<string, unknown>;
    } catch {
      // Cron calls may omit a body. Defaults are intentionally safe.
    }

    const localNow = new Date(Date.now() + TIME_ZONE_OFFSET_MS);
    const requestedDate = typeof requestBody.sync_date === "string" ? requestBody.sync_date : null;
    const shouldSyncCatalog = requestBody.sync_catalog === true ||
      (!requestedDate && localNow.getUTCMinutes() % 15 === 0);
    const catalog = shouldSyncCatalog ? await syncCatalog(config) : null;

    if (requestBody.catalog_only === true) {
      return jsonResponse({
        ok: true,
        store: config.store_name,
        catalog,
        sales_upserted: 0,
        inventory_changed: false,
      });
    }

    const currentWindow = requestedDate
      ? localDayWindowForLabel(requestedDate)
      : localDayWindow(0);
    const windows = [currentWindow];
    if (!requestedDate && localNow.getUTCHours() === 0 && localNow.getUTCMinutes() < 10) {
      windows.push(localDayWindow(-1));
    }

    const fetched = (await Promise.all(
      windows.map((window) => fetchSalesForDay(config, window.start, window.end)),
    )).flat();

    const unique = new Map<string, IposSale>();
    for (const sale of fetched) {
      if (
        sale.tran_id &&
        sale.store_uid === config.store_uid &&
        sale.deleted !== true
      ) {
        unique.set(sale.tran_id, sale);
      }
    }

    const sales = [...unique.values()].sort((a, b) =>
      Number(a.sale_updated_at ?? a.tran_date ?? 0) - Number(b.sale_updated_at ?? b.tran_date ?? 0)
    );

    let itemLines = 0;
    let withoutRecipe = 0;
    for (const sale of sales) {
      const result = await rpc<Record<string, unknown>>("ly_ipos_upsert_sale", {
        p_org_id: config.org_id,
        p_warehouse_id: config.warehouse_id,
        p_sale: sale,
      });
      itemLines += Number(result.items ?? 0);
      withoutRecipe += Number(result.items_without_recipe ?? 0);
    }

    await recordAttempt(config, { success: true });
    return jsonResponse({
      ok: true,
      store: config.store_name,
      catalog,
      windows: windows.map((window) => window.label),
      sales_fetched: fetched.length,
      sales_upserted: sales.length,
      item_lines_upserted: itemLines,
      item_lines_without_recipe: withoutRecipe,
      inventory_changed: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordAttempt(config, { success: false, error: message });
    console.error("iPOS sync failed", message);
    return jsonResponse({ ok: false, store: config.store_name, error: message }, 502);
  }
});
