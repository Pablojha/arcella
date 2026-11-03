import { useEffect } from 'react';
import { SITE } from '../config/site';

/** The <meta>/<link> tag matching `selector` in <head>, created with `attributes` when missing. */
function headTag(selector, element, attributes) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = Object.assign(document.createElement(element), attributes);
    document.head.append(tag);
  }
  return tag;
}

function apply({ description, url, title, noindex }) {
  headTag('meta[name="description"]', 'meta', { name: 'description' }).content = description;
  headTag('meta[property="og:description"]', 'meta', { property: 'og:description' }).content = description;
  headTag('meta[property="og:title"]', 'meta', { property: 'og:title' }).content = title;
  headTag('meta[property="og:url"]', 'meta', { property: 'og:url' }).content = url;
  headTag('link[rel="canonical"]', 'link', { rel: 'canonical' }).href = url;
  const robots = document.head.querySelector('meta[name="robots"]');
  if (noindex) headTag('meta[name="robots"]', 'meta', { name: 'robots' }).content = 'noindex';
  else robots?.remove();
}

/**
 * A public page's search and social details: its description, canonical URL (`path`) and preview title. The title
 * itself comes from useTitle/PageHeader, which run first. `noindex` keeps a page (like the 404) out of search.
 */
export function usePageMeta({ path, description = SITE.description, noindex = false }) {
  useEffect(() => {
    apply({ description, url: SITE.url + (path ?? window.location.pathname), title: document.title, noindex });
    return () => apply({ description: SITE.description, url: SITE.url + window.location.pathname, title: 'Arcella · the architecture network', noindex: false });
  }, [path, description, noindex]);
}
