const idOf = (value) => String(value?._id ?? value);

export const same = (a, b) => Boolean(a && b) && idOf(a) === idOf(b);

export const has = (list = [], id) => Boolean(id) && list.some((item) => same(item, id));

/** Replaces an array of user ids with `<field>Count` and a boolean flag for the viewer. */
export function withCount(doc, field, viewerId, flag) {
  const { [field]: list = [], ...rest } = doc;
  return { ...rest, [`${field}Count`]: list.length, [flag]: has(list, viewerId) };
}
