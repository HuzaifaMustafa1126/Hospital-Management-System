import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  FlaskConical,
  FolderTree,
  Layers3,
  Plus,
  Power,
  Search,
  Tags,
  TestTube2,
  WalletCards,
  X,
} from "lucide-react";
import { BaseModal } from "../components/BaseModal";
import { useNotifications } from "../context/NotificationContext";
import { labCatalogService as api } from "../services/lab-catalog.service";

const SIZE = 10;
const TABS = [
  ["GROUPED", "Composite Profiles", Layers3],
  ["TEST", "Individual Tests", TestTube2],
  ["PROFILE", "Complete Profiles", FlaskConical],
  ["COMBINATION", "Combined Tests", Layers3],
  ["CATEGORY", "Categories", FolderTree],
  ["PRICE", "Pricing", WalletCards],
];
const LABEL = {
  GROUPED: "Composite Profile",
  TEST: "Individual Test",
  PROFILE: "Complete Profile",
  COMBINATION: "Combination",
  CATEGORY: "Category",
  PRICE: "Price Configuration",
};
const emptyFilters = {
  search: "",
  categoryId: "",
  status: "all",
  orderable: "all",
  pricing: "all",
};
const message = (error, fallback) => error.response?.data?.message || fallback;
const targetId = (row) =>
  row.labTestId || row.labProfileId || row.labCombinationId;
const inputDate = (value) =>
  value ? String(value).replace(" ", "T").slice(0, 19) : "";
const dbDate = (value) =>
  value ? (value.length === 16 ? `${value}:00` : value) : null;
const localNow = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
};

function currentPrice(item) {
  const now = Date.now();
  const found = (item.prices || []).filter(
    (p) =>
      p.isActive &&
      new Date(p.effectiveFrom).getTime() <= now &&
      (!p.effectiveTo || now < new Date(p.effectiveTo).getTime()),
  );
  if (found.length > 1) return { state: "conflict", text: "Price Conflict" };
  const price = found[0];
  if (!price || price.pricingStatus === "PENDING" || price.priceAmount == null)
    return { state: "pending", text: "Price Pending" };
  return {
    state: "configured",
    text:
      Number(price.priceAmount) === 0
        ? "Free"
        : `PKR ${new Intl.NumberFormat("en-PK").format(Number(price.priceAmount))}`,
  };
}
function Price({ item }) {
  const value = currentPrice(item);
  return (
    <span
      className={`font-semibold ${value.state === "configured" ? "text-emerald-700" : value.state === "conflict" ? "text-rose-700" : "text-amber-700"}`}
    >
      {value.text}
    </span>
  );
}

async function loadGroupedCatalog() {
  const [tests, profiles, combinations, categories] = await Promise.all([
    api.allTests({ status: "all", orderable: "all" }),
    api.allProfiles({ status: "all", orderable: "all" }),
    api.allCombinations({ status: "all" }),
    api.allCategories({ status: "all" }),
  ]);
  const profileDetails = await Promise.all(
    profiles.map((profile) => api.profile(profile.id)),
  );
  const memberIds = new Set(
    profileDetails.flatMap((profile) => profile.tests.map((test) => test.id)),
  );
  const profileGroups = profileDetails.map((profile) => ({
    key: `PROFILE:${profile.id}`,
    name: profile.name,
    kind: "PROFILE",
    item: profile,
    children: profile.tests.map((item) => ({ kind: "TEST", item })),
  }));
  const categoryGroups = categories
    .map((category) => ({
      key: `CATEGORY:${category.id}`,
      name: category.name,
      kind: "CATEGORY",
      item: null,
      children: tests
        .filter(
          (test) =>
            test.categoryId === category.id && !memberIds.has(test.id),
        )
        .map((item) => ({ kind: "TEST", item })),
    }))
    .filter((group) => group.children.length);
  const combinationGroup = {
    key: "COMBINATIONS",
    name: "Combined Tests",
    kind: "CATEGORY",
    item: null,
    children: combinations.map((item) => ({ kind: "COMBINATION", item })),
  };
  return [...profileGroups, ...categoryGroups, combinationGroup];
}

export function LabManagementPage() {
  const { confirm, notify } = useNotifications();
  const [type, setType] = useState("GROUPED");
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [foundation, setFoundation] = useState({
    categories: [],
    tests: [],
    profiles: [],
    combinations: [],
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    profiles: 0,
    pending: 0,
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const loadFoundation = useCallback(async () => {
    const [categories, tests, profiles, combinations, active, pending] =
      await Promise.all([
        api.allCategories({ status: "all" }),
        api.allTests({ status: "all", orderable: "all" }),
        api.allProfiles({ status: "all", orderable: "all" }),
        api.allCombinations({ status: "all" }),
        api.tests({ page: 1, limit: 1, status: "active", orderable: "all" }),
        api.prices({
          page: 1,
          limit: 1,
          status: "all",
          pricingStatus: "PENDING",
        }),
      ]);
    setFoundation({ categories, tests, profiles, combinations });
    setStats({
      total: tests.length,
      active: active.pagination.total,
      profiles: profiles.length,
      pending: pending.pagination.total,
    });
  }, []);
  const load = useCallback(async () => {
    const requestId = ++listRequest.current;
    try {
      setLoading(true);
      setError("");
      const common = {
        search: applied.search || undefined,
        status: applied.status,
      };
      let rows;
      if (type === "GROUPED") rows = await loadGroupedCatalog();
      else if (type === "TEST")
        rows = await api.allTests({
          ...common,
          categoryId: applied.categoryId || undefined,
          orderable: applied.orderable,
        });
      else if (type === "PROFILE")
        rows = await api.allProfiles({
          ...common,
          orderable: applied.orderable,
        });
      else if (type === "COMBINATION") rows = await api.allCombinations(common);
      else if (type === "CATEGORY") rows = await api.allCategories(common);
      else
        rows = await api.allPrices({
          status: applied.status,
          pricingStatus:
            applied.pricing === "all"
              ? undefined
              : applied.pricing.toUpperCase(),
        });
      if (requestId === listRequest.current) setItems(rows);
    } catch (e) {
      if (requestId === listRequest.current) {
        setItems([]);
        setError(message(e, "Unable to load the laboratory catalogue."));
      }
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [applied, type]);
  useEffect(() => {
    loadFoundation().catch((e) =>
      setError(message(e, "Unable to load catalog totals.")),
    );
  }, [loadFoundation]);
  useEffect(() => {
    void load();
  }, [load]);
  const refresh = async () => {
    await Promise.all([loadFoundation(), load()]);
  };

  const filtered = useMemo(
    () => {
      if (type === "GROUPED") {
        const term = applied.search.trim().toLowerCase();
        return items
          .map((group) => {
            const groupMatches = group.name.toLowerCase().includes(term);
            const children = group.children.filter(({ item }) => {
              if (
                term &&
                !groupMatches &&
                !`${item.name} ${item.code}`.toLowerCase().includes(term)
              ) return false;
              if (applied.status !== "all" && item.isActive !== (applied.status === "active")) return false;
              if (applied.pricing !== "all") {
                const configured = currentPrice(item).state === "configured";
                if (applied.pricing === "configured" ? !configured : configured) return false;
              }
              return true;
            });
            if (!children.length && !group.item) return null;
            return { ...group, children };
          })
          .filter(Boolean);
      }
      return items.filter((item) => {
        const term = applied.search.trim().toLowerCase();
        if (
          type === "PRICE" &&
          term &&
          !`${item.itemName} ${item.itemCode}`.toLowerCase().includes(term)
        )
          return false;
        if (!["CATEGORY", "PRICE"].includes(type) && applied.pricing !== "all")
          return applied.pricing === "configured"
            ? currentPrice(item).state === "configured"
            : currentPrice(item).state !== "configured";
        return true;
      });
    },
    [applied, items, type],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const visible = filtered.slice((page - 1) * SIZE, page * SIZE);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const changeTab = (next) => {
    listRequest.current += 1;
    detailRequest.current += 1;
    setType(next);
    setPage(1);
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setItems([]);
    setModal(null);
    setError("");
    setLoading(true);
  };
  const edit = async (item, itemType = type) => {
    const requestId = ++detailRequest.current;
    try {
      const record = itemType === "PROFILE" ? await api.profile(item.id) : item;
      if (requestId === detailRequest.current)
        setModal({ kind: "form", type: itemType, item: record });
    } catch (e) {
      if (requestId === detailRequest.current)
        notify({
          type: "error",
          title: "Unable to Edit",
          message: message(e, "Details could not be loaded."),
        });
    }
  };
  const view = async (item, itemType = type) => {
    const requestId = ++detailRequest.current;
    try {
      const record =
        itemType === "TEST"
          ? await api.test(item.id)
          : itemType === "PROFILE"
            ? await api.profile(item.id)
            : item;
      if (requestId === detailRequest.current)
        setModal({ kind: "view", type: itemType, item: record });
    } catch (e) {
      if (requestId === detailRequest.current)
        notify({
          type: "error",
          title: "Unable to View",
          message: message(e, "Details could not be loaded."),
        });
    }
  };
  const editPrice = async (item, itemType = type) => {
    const requestId = ++detailRequest.current;
    try {
      const effective = await api.effectivePrice({
        itemType,
        targetId: item.id,
      });
      if (requestId === detailRequest.current)
        setModal({ kind: "price", type: itemType, item, effective });
    } catch (e) {
      if (requestId === detailRequest.current)
        notify({
          type: "error",
          title: "Unable to Edit Price",
          message: message(e, "The current database price could not be loaded."),
        });
    }
  };
  const status = async (item, itemType = type) => {
    const next = !item.isActive;
    if (
      !(await confirm({
        title: `${next ? "Activate" : "Deactivate"} ${LABEL[itemType]}?`,
        message:
          "This changes future availability only. Historical records are preserved.",
        confirmLabel: next ? "Activate" : "Deactivate",
        tone: next ? "warning" : "danger",
      }))
    )
      return;
    try {
      const action = {
        TEST: "setTestStatus",
        PROFILE: "setProfileStatus",
        COMBINATION: "setCombinationStatus",
        CATEGORY: "setCategoryStatus",
        PRICE: "setPriceStatus",
      }[itemType];
      await api[action](item.id, next);
      notify({
        type: "success",
        title: "Status Updated",
        message: `${item.name || item.itemName} is now ${next ? "active" : "inactive"}.`,
      });
      await refresh();
    } catch (e) {
      notify({
        type: "error",
        title: "Update Failed",
        message: message(e, "Status could not be updated."),
      });
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            Clinical configuration
          </p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">
            Lab Management
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage laboratory tests, profiles, combinations, categories, and
            pricing.
          </p>
        </div>
        <button
          className="hms-button-primary"
          onClick={() =>
            setModal({
              kind: "form",
              type: type === "GROUPED" ? "TEST" : type,
              item: null,
            })
          }
        >
          <Plus size={17} /> Add {type === "GROUPED" ? "Lab Test" : LABEL[type]}
        </button>
      </section>
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-white p-5">
        <p className="text-sm font-semibold text-teal-700">
          Laboratory Catalogue
        </p>
        <h3 className="text-2xl font-bold">Catalog configuration overview</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total Lab Tests", stats.total, TestTube2],
            ["Active Lab Tests", stats.active, FlaskConical],
            ["Complete Profiles", stats.profiles, Layers3],
            ["Pending Price Records", stats.pending, Tags],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
              <span className="flex items-center gap-2 text-teal-700">
                <Icon size={18} />
                <b className="text-sm text-slate-700">{label}</b>
              </span>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="hms-card overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b p-3">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => changeTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${type === key ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_150px_160px_150px_auto]">
          <label className="relative md:col-span-2 xl:col-span-1">
            <Search
              className="absolute left-3.5 top-3 text-slate-400"
              size={18}
            />
            <input
              className="hms-input mt-0 pl-10"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              onKeyDown={(e) =>
                e.key === "Enter" && (setPage(1), setApplied({ ...filters }))
              }
              placeholder="Search by name or code"
            />
          </label>
          <select
            disabled={type !== "TEST"}
            className="hms-input mt-0 disabled:bg-slate-100"
            value={filters.categoryId}
            onChange={(e) =>
              setFilters({ ...filters, categoryId: e.target.value })
            }
          >
            <option value="">All categories</option>
            {foundation.categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select
            className="hms-input mt-0"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            disabled={!["TEST", "PROFILE"].includes(type)}
            className="hms-input mt-0 disabled:bg-slate-100"
            value={filters.orderable}
            onChange={(e) =>
              setFilters({ ...filters, orderable: e.target.value })
            }
          >
            <option value="all">All orderability</option>
            <option value="yes">Orderable</option>
            <option value="no">Not orderable</option>
          </select>
          <select
            disabled={type === "CATEGORY"}
            className="hms-input mt-0 disabled:bg-slate-100"
            value={filters.pricing}
            onChange={(e) =>
              setFilters({ ...filters, pricing: e.target.value })
            }
          >
            <option value="all">All pricing</option>
            <option value="configured">Configured</option>
            <option value="pending">Pending</option>
          </select>
          <button
            className="hms-button-secondary"
            onClick={() => {
              setPage(1);
              setApplied({ ...filters });
            }}
          >
            Search
          </button>
        </div>
      </section>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      {type === "GROUPED" ? (
        <GroupedCatalogTable
          loading={loading}
          groups={visible}
          count={filtered.length}
          page={page}
          pages={pages}
          onPage={setPage}
          onView={view}
          onEdit={edit}
          onPrice={editPrice}
          onStatus={status}
        />
      ) : (
        <Table
          type={type}
          loading={loading}
          rows={visible}
          count={filtered.length}
          page={page}
          pages={pages}
          onPage={setPage}
          onView={view}
          onEdit={edit}
          onPrice={editPrice}
          onStatus={status}
        />
      )}
      {modal?.kind === "form" && (
        <FormModal
          {...modal}
          foundation={foundation}
          confirm={confirm}
          onClose={() => setModal(null)}
          onSaved={async (text) => {
            setModal(null);
            notify({ type: "success", title: "Catalog Saved", message: text });
            await refresh();
          }}
        />
      )}
      {modal?.kind === "view" && (
        <DetailModal {...modal} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "price" && (
        <PriceReplacementModal
          {...modal}
          onClose={() => setModal(null)}
          onSaved={async () => {
            const itemName = modal.item.name;
            setModal(null);
            notify({
              type: "success",
              title: "Price Updated",
              message: `${itemName} now uses the new effective price. Previous price history was preserved.`,
            });
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function GroupedCatalogTable({
  loading,
  groups,
  count,
  page,
  pages,
  onPage,
  onView,
  onEdit,
  onPrice,
  onStatus,
}) {
  const [expanded, setExpanded] = useState(new Set());
  useEffect(() => {
    setExpanded((current) => {
      const next = new Set(current);
      for (const group of groups)
        if (group.kind === "PROFILE") next.add(group.key);
      return next;
    });
  }, [groups]);
  const toggle = (key) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <section className="hms-card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h3 className="font-bold">Composite Profiles and Parameters</h3>
        <p className="text-xs text-slate-500">
          {count} database-defined profile or category groups
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Composite Profile",
                "Parameter / Test",
                "Price (PKR)",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`px-4 py-3.5 ${heading === "Actions" ? "text-right" : ""}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="py-14 text-center text-slate-500">Loading composite profiles…</td></tr>
            ) : groups.length ? (
              groups.flatMap((group) => {
                const open = expanded.has(group.key);
                const parent = (
                  <tr key={group.key} className="bg-slate-50/70">
                    <td className="px-4 py-4">
                      <button className="flex items-center gap-2 font-bold text-slate-900" onClick={() => toggle(group.key)}>
                        <ChevronRight className={`transition ${open ? "rotate-90" : ""}`} size={17}/>
                        {group.name}
                      </button>
                    </td>
                    <td className="px-4 text-xs font-semibold uppercase text-slate-500">
                      {group.kind === "PROFILE" ? "Complete profile" : "Catalog grouping"}
                    </td>
                    <td className="px-4">{group.item ? <Price item={group.item}/> : "—"}</td>
                    <td className="px-4">{group.item ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${group.item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{group.item.isActive ? "ACTIVE" : "INACTIVE"}</span> : "—"}</td>
                    {group.item ? (
                      <Actions row={group.item} view={(item) => onView(item,"PROFILE")} edit={(item) => onEdit(item,"PROFILE")} price={(item) => onPrice(item,"PROFILE")} status={(item) => onStatus(item,"PROFILE")}/>
                    ) : <td className="px-4 text-right text-xs text-slate-400">Grouping only</td>}
                  </tr>
                );
                if (!open) return [parent];
                return [parent, ...group.children.map(({ kind, item }, index) => (
                  <tr key={`${group.key}:${kind}:${item.id}`} className="hover:bg-teal-50/30">
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3"><b className="text-slate-800">{item.name}</b><p className="text-xs font-semibold text-teal-700">{item.code}</p>{item.parameters?.length > 0 && <p className="mt-1 text-xs text-slate-500">Result parameters: {item.parameters.map((parameter) => parameter.name).join(", ")}</p>}</td>
                    <td className="px-4"><Price item={item}/></td>
                    <td className="px-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "ACTIVE" : "INACTIVE"}</span>{kind === "TEST" && <p className="mt-1 text-[10px] font-semibold text-slate-500">{item.isOrderable ? "Individually orderable" : "Profile component"}</p>}</td>
                    <Actions row={item} view={(record) => onView(record,kind)} edit={(record) => onEdit(record,kind)} price={(record) => onPrice(record,kind)} status={(record) => onStatus(record,kind)}/>
                  </tr>
                ))];
              })
            ) : (
              <tr><td colSpan="5" className="py-14 text-center text-slate-500">No matching composite profiles or tests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t px-5 py-3 text-sm text-slate-500">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2"><button className="rounded-lg border p-2 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16}/></button><button className="rounded-lg border p-2 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={16}/></button></div>
      </div>
    </section>
  );
}

function Table({
  type,
  loading,
  rows,
  count,
  page,
  pages,
  onPage,
  onView,
  onEdit,
  onPrice,
  onStatus,
}) {
  const headers =
    type === "PRICE"
      ? [
          "Catalog Item",
          "Type",
          "Price",
          "Effective Period",
          "Status",
          "Actions",
        ]
      : type === "CATEGORY"
        ? ["Category", "Code", "Sort Order", "Status", "Actions"]
        : [
            "Name",
            "Code",
            "Category",
            "Type",
            "Price",
            "Orderable",
            "Status",
            "Actions",
          ];
  return (
    <section className="hms-card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h3 className="font-bold">{TABS.find(([key]) => key === type)?.[1]}</h3>
        <p className="text-xs text-slate-500">{count} matching records</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3.5 ${h === "Actions" ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="py-14 text-center text-slate-500"
                >
                  Loading laboratory catalog…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) =>
                type === "PRICE" ? (
                  <PriceRow
                    key={row.id}
                    row={row}
                    edit={onEdit}
                    status={onStatus}
                  />
                ) : type === "CATEGORY" ? (
                  <CategoryRow
                    key={row.id}
                    row={row}
                    edit={onEdit}
                    status={onStatus}
                  />
                ) : (
                  <CatalogRow
                    key={row.id}
                    type={type}
                    row={row}
                    view={onView}
                    edit={onEdit}
                    price={onPrice}
                    status={onStatus}
                  />
                ),
              )
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="py-14 text-center text-slate-500"
                >
                  No matching laboratory records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t px-5 py-3 text-sm text-slate-500">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-lg border p-2 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="rounded-lg border p-2 disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
const Status = ({ active }) => (
  <td className="px-4">
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  </td>
);
function Actions({ row, view, edit, price, status }) {
  return (
    <td className="whitespace-nowrap px-4 text-right">
      {view && (
        <button
          className="font-semibold text-teal-700"
          onClick={() => view(row)}
        >
          <Eye size={15} className="mr-1 inline" />
          View
        </button>
      )}
      {edit && (
        <button
          className="ml-4 font-semibold text-sky-700"
          onClick={() => edit(row)}
        >
          <Edit3 size={15} className="mr-1 inline" />
          Edit
        </button>
      )}
      {price && (
        <button
          className="ml-4 font-semibold text-emerald-700"
          onClick={() => price(row)}
        >
          <WalletCards size={15} className="mr-1 inline" />
          Edit Price
        </button>
      )}
      <button
        className={`ml-4 font-semibold ${row.isActive ? "text-rose-700" : "text-emerald-700"}`}
        onClick={() => status(row)}
      >
        <Power size={15} className="mr-1 inline" />
        {row.isActive ? "Deactivate" : "Activate"}
      </button>
    </td>
  );
}
function CatalogRow({ type, row, view, edit, price, status }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-4">
        <b>{row.name}</b>
      </td>
      <td className="px-4 font-semibold text-teal-700">{row.code}</td>
      <td className="px-4">{row.categoryName || "—"}</td>
      <td className="px-4">{LABEL[type]}</td>
      <td className="px-4">
        <Price item={row} />
      </td>
      <td className="px-4">
        {type === "COMBINATION" ? "Combined" : row.isOrderable ? "Yes" : "No"}
      </td>
      <Status active={row.isActive} />
      <Actions row={row} view={view} edit={edit} price={price} status={status} />
    </tr>
  );
}
function CategoryRow({ row, edit, status }) {
  return (
    <tr>
      <td className="px-4 py-4 font-bold">{row.name}</td>
      <td className="px-4 font-semibold text-teal-700">{row.code}</td>
      <td className="px-4">{row.sortOrder}</td>
      <Status active={row.isActive} />
      <Actions row={row} edit={edit} status={status} />
    </tr>
  );
}
function PriceRow({ row, edit, status }) {
  const text =
    row.pricingStatus === "PENDING" || row.priceAmount == null
      ? "Price Pending"
      : Number(row.priceAmount) === 0
        ? "Free"
        : `PKR ${new Intl.NumberFormat("en-PK").format(row.priceAmount)}`;
  return (
    <tr>
      <td className="px-4 py-4">
        <b>{row.itemName}</b>
        <p className="text-xs text-teal-700">{row.itemCode}</p>
      </td>
      <td className="px-4">{LABEL[row.itemType]}</td>
      <td className="px-4 font-semibold">{text}</td>
      <td className="px-4 text-xs">
        {inputDate(row.effectiveFrom).replace("T", " ")}
        <br />
        to{" "}
        {row.effectiveTo
          ? inputDate(row.effectiveTo).replace("T", " ")
          : "Open ended"}
      </td>
      <Status active={row.isActive} />
      <Actions row={row} status={status} />
    </tr>
  );
}

function FormModal({ type, item, foundation, confirm, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(type, item));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const invalid = {};
    if (type !== "PRICE" && !form.code.trim())
      invalid.code = "Code is required.";
    if (type !== "PRICE" && !form.name.trim())
      invalid.name = "Name is required.";
    if (type === "TEST" && !form.categoryId)
      invalid.categoryId = "Category is required.";
    if (type === "PRICE" && !form.targetId)
      invalid.targetId = "Catalog item is required.";
    if (
      type === "PRICE" &&
      form.pricingStatus === "CONFIGURED" &&
      form.priceAmount === ""
    )
      invalid.priceAmount = "Configured prices require an amount.";
    if (type === "PRICE" && !form.effectiveFrom)
      invalid.effectiveFrom = "Effective-from is required.";
    if (Object.keys(invalid).length) return setErrors(invalid);
    setSaving(true);
    setErrors({});
    try {
      const oldMembers =
        type === "PROFILE"
          ? (item?.tests || []).map((x) => String(x.id))
          : type === "COMBINATION"
            ? (item?.components || []).map(
                (x) =>
                  `${x.itemType}:${x.itemType === "TEST" ? x.labTestId : x.labProfileId}`,
              )
            : [];
      const membershipChanged =
        ["PROFILE", "COMBINATION"].includes(type) &&
        JSON.stringify(oldMembers) !== JSON.stringify(form.members);
      if (
        item?.id &&
        oldMembers.length &&
        membershipChanged &&
        !(await confirm({
          title: "Replace catalog membership?",
          message:
            "This changes member selection and order without deleting underlying catalog records.",
          confirmLabel: "Replace Members",
          tone: "warning",
        }))
      ) {
        setSaving(false);
        return;
      }
      const methods = {
        TEST: ["createTest", "updateTest"],
        PROFILE: ["createProfile", "updateProfile"],
        COMBINATION: ["createCombination", "updateCombination"],
        CATEGORY: ["createCategory", "updateCategory"],
        PRICE: ["createPrice", "updatePrice"],
      }[type];
      const saved = item?.id
        ? await api[methods[1]](item.id, payload(type, form))
        : await api[methods[0]](payload(type, form));
      if (membershipChanged) {
        if (type === "PROFILE")
          await api.setProfileTests(saved.id, form.members.map(Number));
        else
          await api.setCombinationItems(
            saved.id,
            form.members.map((key) => {
              const [itemType, id] = key.split(":");
              return { itemType, targetId: Number(id) };
            }),
          );
      }
      await onSaved(
        `${LABEL[type]} ${item?.id ? "updated" : "created"} successfully.`,
      );
    } catch (e) {
      const fields = {};
      for (const issue of e.response?.data?.errors || []) {
        const key = issue.field || issue.path?.[0];
        if (key) fields[key] = issue.message;
      }
      setErrors({
        ...fields,
        form: message(e, `Unable to save ${LABEL[type].toLowerCase()}.`),
      });
    } finally {
      setSaving(false);
    }
  };
  const options =
    type === "PROFILE"
      ? foundation.tests.map((x) => ({
          key: String(x.id),
          label: `${x.code} — ${x.name}`,
        }))
      : type === "COMBINATION"
        ? [
            ...foundation.tests.map((x) => ({
              key: `TEST:${x.id}`,
              label: `Test: ${x.code} — ${x.name}`,
            })),
            ...foundation.profiles.map((x) => ({
              key: `PROFILE:${x.id}`,
              label: `Profile: ${x.code} — ${x.name}`,
            })),
          ]
        : [];
  return (
    <BaseModal
      labelledBy="lab-form-title"
      onClose={() => !saving && onClose()}
      panelClassName="max-w-3xl"
    >
      <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
        <div className="flex justify-between border-b p-5">
          <h3 id="lab-form-title" className="text-xl font-bold">
            {item?.id ? "Edit" : "Add"} {LABEL[type]}
          </h3>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {type === "PRICE" ? (
              <PriceFields
                form={form}
                update={update}
                errors={errors}
                foundation={foundation}
              />
            ) : (
              <CatalogFields
                type={type}
                form={form}
                update={update}
                errors={errors}
                categories={foundation.categories}
              />
            )}
          </div>
          {options.length > 0 && (
            <Members
              options={options}
              selected={form.members}
              change={(members) => update("members", members)}
            />
          )}{" "}
          {errors.form && (
            <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {errors.form}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t p-4">
          <button
            type="button"
            className="hms-button-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="hms-button-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
function initialForm(type, item) {
  if (type === "PRICE")
    return {
      itemType: item?.itemType || "TEST",
      targetId: item ? String(targetId(item)) : "",
      pricingStatus: item?.pricingStatus || "PENDING",
      priceAmount: item?.priceAmount == null ? "" : String(item.priceAmount),
      effectiveFrom:
        inputDate(item?.effectiveFrom) || inputDate(new Date().toISOString()),
      effectiveTo: inputDate(item?.effectiveTo),
      isActive: item?.isActive ?? true,
    };
  const members =
    type === "PROFILE"
      ? (item?.tests || []).map((x) => String(x.id))
      : type === "COMBINATION"
        ? (item?.components || []).map(
            (x) =>
              `${x.itemType}:${x.itemType === "TEST" ? x.labTestId : x.labProfileId}`,
          )
        : [];
  return {
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    code: item?.code || "",
    name: item?.name || "",
    sortOrder: item?.sortOrder ?? 0,
    isOrderable: item?.isOrderable ?? true,
    isActive: item?.isActive ?? true,
    members,
  };
}
function payload(type, form) {
  if (type === "PRICE")
    return {
      itemType: form.itemType,
      targetId: Number(form.targetId),
      pricingStatus: form.pricingStatus,
      priceAmount: form.pricingStatus === "PENDING" ? null : form.priceAmount,
      currency: "PKR",
      effectiveFrom: dbDate(form.effectiveFrom),
      effectiveTo: dbDate(form.effectiveTo),
      isActive: form.isActive,
    };
  const base = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    isActive: form.isActive,
  };
  if (type === "TEST")
    return {
      ...base,
      categoryId: Number(form.categoryId),
      isOrderable: form.isOrderable,
    };
  if (type === "PROFILE") return { ...base, isOrderable: form.isOrderable };
  if (type === "CATEGORY")
    return { ...base, sortOrder: Number(form.sortOrder) };
  return base;
}
function Field({ label, error, wide, children }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error && <small className="block text-rose-600">{error}</small>}
    </label>
  );
}
const Check = ({ label, value, change }) => (
  <label className="flex items-center gap-2 text-sm font-semibold">
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => change(e.target.checked)}
    />
    {label}
  </label>
);
function CatalogFields({ type, form, update, errors, categories }) {
  return (
    <>
      <Field label="Code" error={errors.code}>
        <input
          className="hms-input"
          value={form.code}
          onChange={(e) => update("code", e.target.value.toUpperCase())}
        />
      </Field>
      <Field label="Name" error={errors.name}>
        <input
          className="hms-input"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </Field>
      {type === "TEST" && (
        <Field label="Category" error={errors.categoryId}>
          <select
            className="hms-input"
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {type === "CATEGORY" && (
        <Field label="Sort order">
          <input
            type="number"
            min="0"
            className="hms-input"
            value={form.sortOrder}
            onChange={(e) => update("sortOrder", e.target.value)}
          />
        </Field>
      )}
      {["TEST", "PROFILE"].includes(type) && (
        <Check
          label="Individually orderable"
          value={form.isOrderable}
          change={(v) => update("isOrderable", v)}
        />
      )}
      <Check
        label="Active"
        value={form.isActive}
        change={(v) => update("isActive", v)}
      />
    </>
  );
}
function PriceFields({ form, update, errors, foundation }) {
  const choices =
    form.itemType === "TEST"
      ? foundation.tests
      : form.itemType === "PROFILE"
        ? foundation.profiles
        : foundation.combinations;
  return (
    <>
      <Field label="Catalog type">
        <select
          className="hms-input"
          value={form.itemType}
          onChange={(e) => {
            update("itemType", e.target.value);
            update("targetId", "");
          }}
        >
          <option value="TEST">Individual Test</option>
          <option value="PROFILE">Complete Profile</option>
          <option value="COMBINATION">Combination</option>
        </select>
      </Field>
      <Field label="Catalog item" error={errors.targetId}>
        <select
          className="hms-input"
          value={form.targetId}
          onChange={(e) => update("targetId", e.target.value)}
        >
          <option value="">Select item</option>
          {choices.map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} — {x.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Pricing status">
        <select
          className="hms-input"
          value={form.pricingStatus}
          onChange={(e) => {
            update("pricingStatus", e.target.value);
            if (e.target.value === "PENDING") update("priceAmount", "");
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIGURED">Configured</option>
        </select>
      </Field>
      <Field label="Price amount (PKR)" error={errors.priceAmount}>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={form.pricingStatus === "PENDING"}
          className="hms-input disabled:bg-slate-100"
          value={form.priceAmount}
          onChange={(e) => update("priceAmount", e.target.value)}
        />
      </Field>
      <Field label="Effective from" error={errors.effectiveFrom}>
        <input
          type="datetime-local"
          step="1"
          className="hms-input"
          value={form.effectiveFrom}
          onChange={(e) => update("effectiveFrom", e.target.value)}
        />
      </Field>
      <Field label="Effective to" error={errors.effectiveTo}>
        <input
          type="datetime-local"
          step="1"
          className="hms-input"
          value={form.effectiveTo}
          onChange={(e) => update("effectiveTo", e.target.value)}
        />
      </Field>
      <Check
        label="Active"
        value={form.isActive}
        change={(v) => update("isActive", v)}
      />
    </>
  );
}
function Members({ options, selected, change }) {
  const move = (i, d) => {
    const next = [...selected];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    change(next);
  };
  return (
    <div className="mt-5">
      <h4 className="font-bold">Members and order</h4>
      <select
        className="hms-input mt-2"
        value=""
        onChange={(e) =>
          e.target.value &&
          !selected.includes(e.target.value) &&
          change([...selected, e.target.value])
        }
      >
        <option value="">Add a member…</option>
        {options
          .filter((x) => !selected.includes(x.key))
          .map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
      </select>
      <div className="mt-3 space-y-2">
        {selected.map((key, i) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border p-3 text-sm"
          >
            <span>
              <b className="mr-2 text-teal-700">{i + 1}.</b>
              {options.find((x) => x.key === key)?.label}
            </span>
            <span>
              <button
                type="button"
                disabled={!i}
                className="p-1 disabled:opacity-30"
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={i === selected.length - 1}
                className="p-1 disabled:opacity-30"
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="p-1 text-rose-700"
                onClick={() => change(selected.filter((x) => x !== key))}
              >
                <X size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceReplacementModal({ type, item, effective, onClose, onSaved }) {
  const [form, setForm] = useState({
    pricingStatus: effective.pricingStatus || "PENDING",
    priceAmount:
      effective.priceAmount == null ? "" : String(effective.priceAmount),
    effectiveFrom: localNow(),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const currentText =
    effective.pricingStatus === "PENDING" || effective.priceAmount == null
      ? "Price Pending"
      : Number(effective.priceAmount) === 0
        ? "Free"
        : `PKR ${new Intl.NumberFormat("en-PK").format(Number(effective.priceAmount))}`;
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (
      form.pricingStatus === "CONFIGURED" &&
      !/^\d{1,10}(\.\d{1,2})?$/.test(form.priceAmount)
    )
      nextErrors.priceAmount =
        "Enter a non-negative amount with no more than two decimal places.";
    if (!form.effectiveFrom)
      nextErrors.effectiveFrom = "Effective date is required.";
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setSaving(true);
    setErrors({});
    try {
      await api.replaceEffectivePrice({
        itemType: type,
        targetId: item.id,
        pricingStatus: form.pricingStatus,
        priceAmount:
          form.pricingStatus === "PENDING" ? null : form.priceAmount,
        currency: "PKR",
        effectiveFrom: dbDate(form.effectiveFrom),
      });
      await onSaved();
    } catch (error) {
      const next = {};
      for (const issue of error.response?.data?.errors || []) {
        const key = issue.field || issue.path?.[0];
        if (key) next[key] = issue.message;
      }
      setErrors({
        ...next,
        form: message(error, "The price could not be updated."),
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <BaseModal
      labelledBy="price-replacement-title"
      onClose={() => !saving && onClose()}
      panelClassName="max-w-xl"
    >
      <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <p className="text-xs font-bold uppercase text-teal-700">
              {LABEL[type]}
            </p>
            <h3 id="price-replacement-title" className="text-xl font-bold">
              Edit Price
            </h3>
          </div>
          <button type="button" disabled={saving} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-6">
          <Field label="Catalog item">
            <input className="hms-input bg-slate-100" readOnly value={`${item.code} — ${item.name}`} />
          </Field>
          <Field label="Current price">
            <input className="hms-input bg-slate-100 font-semibold" readOnly value={currentText} />
          </Field>
          <Field label="Pricing status" error={errors.pricingStatus}>
            <select className="hms-input" value={form.pricingStatus} onChange={(event) => setForm((old) => ({ ...old, pricingStatus:event.target.value, priceAmount:event.target.value === "PENDING" ? "" : old.priceAmount }))}>
              <option value="CONFIGURED">Configured</option>
              <option value="PENDING">Pending</option>
            </select>
          </Field>
          <Field label="New price (PKR)" error={errors.priceAmount}>
            <input type="number" min="0" step="0.01" className="hms-input disabled:bg-slate-100" disabled={form.pricingStatus === "PENDING"} value={form.priceAmount} onChange={(event) => setForm((old) => ({ ...old, priceAmount:event.target.value }))} />
          </Field>
          <Field label="Effective date" error={errors.effectiveFrom}>
            <input type="datetime-local" step="1" className="hms-input" value={form.effectiveFrom} onChange={(event) => setForm((old) => ({ ...old, effectiveFrom:event.target.value }))} />
          </Field>
          {errors.form && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errors.form}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t p-4">
          <button type="button" className="hms-button-secondary" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="hms-button-primary" disabled={saving}>{saving ? "Saving…" : "Save Price"}</button>
        </div>
      </form>
    </BaseModal>
  );
}

function DetailModal({ type, item, onClose }) {
  const members =
    type === "PROFILE"
      ? item.tests || []
      : type === "COMBINATION"
        ? item.components || []
        : item.parameters || [];
  return (
    <BaseModal
      labelledBy="lab-detail-title"
      onClose={onClose}
      panelClassName="max-w-3xl"
    >
      <div className="overflow-y-auto p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-700">
              {LABEL[type]}
            </p>
            <h3 id="lab-detail-title" className="text-xl font-bold">
              {item.name}
            </h3>
            <p className="text-sm font-semibold text-teal-700">{item.code}</p>
          </div>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Fact label="Price">
            <Price item={item} />
          </Fact>
          <Fact label="Orderable">
            {type === "COMBINATION"
              ? "Combined offering"
              : item.isOrderable
                ? "Yes"
                : "No"}
          </Fact>
          <Fact label="Status">{item.isActive ? "Active" : "Inactive"}</Fact>
        </div>
        <h4 className="mt-5 font-bold">
          {type === "TEST" ? "Parameters" : "Configured members"}
        </h4>
        <div className="mt-3 overflow-hidden rounded-xl border">
          {members.length ? (
            members.map((x, i) => (
              <div
                key={x.membershipId || x.id || i}
                className="border-b px-4 py-3 last:border-0"
              >
                <b>{x.name}</b>
                <p className="text-xs text-teal-700">{x.code}</p>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-slate-500">No configured entries.</p>
          )}
        </div>
        <div className="mt-6 text-right">
          <button className="hms-button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
const Fact = ({ label, children }) => (
  <div className="rounded-xl border p-3">
    <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
    <div className="mt-1 text-sm font-bold">{children}</div>
  </div>
);
