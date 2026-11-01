import { found } from './errors.js';

/** Runs a prepared query one page at a time: `{ items, hasMore }`. */
export async function paginate(query, { page = 1, limit = 12 }, map = (item) => item) {
  const rows = await query.skip((page - 1) * limit).limit(limit + 1).lean();
  return { items: rows.slice(0, limit).map(map), hasMore: rows.length > limit };
}

/** Atomically adds or removes `userId` in an array field, optionally keeping a counter in sync. */
export async function toggle(Model, id, field, userId, counter) {
  const inc = (by) => (counter ? { $inc: { [counter]: by } } : {});
  const added = await Model.findOneAndUpdate(
    { _id: id, [field]: { $ne: userId } },
    { $addToSet: { [field]: userId }, ...inc(1) },
    { new: true },
  );
  const doc = added ?? (await Model.findOneAndUpdate({ _id: id, [field]: userId }, { $pull: { [field]: userId }, ...inc(-1) }, { new: true }));
  found(doc, Model.modelName);
  return { doc, active: Boolean(added), count: doc[field].length };
}
