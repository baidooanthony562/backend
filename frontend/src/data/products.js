// This file used to ship ~20 hardcoded sample products with Unsplash stock
// photos so the UI had something to render before the backend responded.
// That fallback was leaking through to real visitors when the API was slow,
// letting them see and try to "buy" products we do not actually sell — so
// the seed data has been removed and the productStore no longer imports it.
//
// Left as an empty named export only to avoid touching every import site;
// remove this file once those imports are cleaned up too.
export const featuredProducts = [];
