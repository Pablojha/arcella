import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const GIPHY = 'https://api.giphy.com/v1/gifs';

/** Trending GIFs, or results for `q`, from Giphy; the API key never leaves the server. */
export async function search(req, res) {
  if (!env.giphyKey) throw new ApiError(503, "GIFs aren't available right now");
  const { q } = req.query;
  const params = new URLSearchParams({ api_key: env.giphyKey, limit: '24', rating: 'pg-13', bundle: 'messaging_non_clips', ...(q && { q }) });
  const response = await fetch(`${GIPHY}/${q ? 'search' : 'trending'}?${params}`);
  if (!response.ok) throw new ApiError(502, "GIFs couldn't load. Please try again.");
  const { data } = await response.json();
  const items = data.map(({ id, title, images: { fixed_width: gif } }) => ({ id, title, url: gif.webp || gif.url, width: Number(gif.width), height: Number(gif.height) }));
  res.json({ items });
}
