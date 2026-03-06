import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildProjectInspectorProjects, getProjectsEntriesForLang } from '../../lib/projectsData';

const PROJECT_LANGS = ['ja', 'en'] as const;

export function getStaticPaths() {
  return PROJECT_LANGS.map((lang) => ({ params: { lang } }));
}

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang;
  if (lang !== 'ja' && lang !== 'en') {
    return new Response(null, { status: 404 });
  }

  const entries = await getCollection('projects');
  const projects = buildProjectInspectorProjects(getProjectsEntriesForLang(entries, lang));

  return new Response(JSON.stringify({ projects }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
