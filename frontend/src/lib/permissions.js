/**
 * Whether the signed-in member's staff role grants `permission`. The API sends the list with the profile and checks it
 * on every request; this only decides which controls to show.
 */
export const can = (user, permission) => Boolean(user?.permissions?.includes(permission));
