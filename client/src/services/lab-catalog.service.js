import { api } from "./api";

const data = async (request) => (await request).data.data;

const allPages = async (loader, params = {}) => {
  const first = await loader({ ...params, page: 1, limit: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    const next = await loader({ ...params, page, limit: 100 });
    items.push(...next.items);
  }
  return items;
};

export const labCatalogService = {
  categories: (params) => data(api.get("/lab/catalog/categories", { params })),
  tests: (params) => data(api.get("/lab/catalog/tests", { params })),
  test: (id) => data(api.get(`/lab/catalog/tests/${id}`)),
  profiles: (params) => data(api.get("/lab/catalog/profiles", { params })),
  profile: (id) => data(api.get(`/lab/catalog/profiles/${id}`)),
  combinations: (params) =>
    data(api.get("/lab/catalog/combinations", { params })),
  prices: (params) => data(api.get("/lab/catalog/prices", { params })),
  effectivePrice: (params) =>
    data(api.get("/lab/catalog/effective-price", { params })),
  createCategory: (payload) =>
    data(api.post("/lab/catalog/categories", payload)),
  updateCategory: (id, payload) =>
    data(api.put(`/lab/catalog/categories/${id}`, payload)),
  setCategoryStatus: (id, isActive) =>
    data(api.patch(`/lab/catalog/categories/${id}/status`, { isActive })),
  createTest: (payload) => data(api.post("/lab/catalog/tests", payload)),
  updateTest: (id, payload) =>
    data(api.put(`/lab/catalog/tests/${id}`, payload)),
  setTestStatus: (id, isActive) =>
    data(api.patch(`/lab/catalog/tests/${id}/status`, { isActive })),
  createProfile: (payload) => data(api.post("/lab/catalog/profiles", payload)),
  updateProfile: (id, payload) =>
    data(api.put(`/lab/catalog/profiles/${id}`, payload)),
  setProfileStatus: (id, isActive) =>
    data(api.patch(`/lab/catalog/profiles/${id}/status`, { isActive })),
  setProfileTests: (id, testIds) =>
    data(api.put(`/lab/catalog/profiles/${id}/tests`, { testIds })),
  createCombination: (payload) =>
    data(api.post("/lab/catalog/combinations", payload)),
  updateCombination: (id, payload) =>
    data(api.put(`/lab/catalog/combinations/${id}`, payload)),
  setCombinationStatus: (id, isActive) =>
    data(api.patch(`/lab/catalog/combinations/${id}/status`, { isActive })),
  setCombinationItems: (id, items) =>
    data(api.put(`/lab/catalog/combinations/${id}/items`, { items })),
  createPrice: (payload) => data(api.post("/lab/catalog/prices", payload)),
  replaceEffectivePrice: (payload) =>
    data(api.post("/lab/catalog/prices/replace-effective", payload)),
  updatePrice: (id, payload) =>
    data(api.put(`/lab/catalog/prices/${id}`, payload)),
  setPriceStatus: (id, isActive) =>
    data(api.patch(`/lab/catalog/prices/${id}/status`, { isActive })),
  allTests: (params) =>
    allPages((query) => labCatalogService.tests(query), params),
  allProfiles: (params) =>
    allPages((query) => labCatalogService.profiles(query), params),
  allCombinations: (params) =>
    allPages((query) => labCatalogService.combinations(query), params),
  allCategories: (params) =>
    allPages((query) => labCatalogService.categories(query), params),
  allPrices: (params) =>
    allPages((query) => labCatalogService.prices(query), params),
};
