import type { CollectionEntry } from 'astro:content';
import type { ProjectInspectorProject, ProjectRoadmapNodeData } from '../components/projects/types';

type ProjectEntry = CollectionEntry<'projects'>;
type ProjectsLang = 'ja' | 'en';

const sortProjectsForRoadmap = (entries: ProjectEntry[]): ProjectEntry[] => {
  return [...entries].sort((left, right) => Number(right.data.featured) - Number(left.data.featured));
};

export const getProjectsEntriesForLang = (
  entries: ProjectEntry[],
  lang: ProjectsLang,
): ProjectEntry[] => {
  return sortProjectsForRoadmap(entries.filter((entry) => entry.data.lang === lang));
};

export const serializeProjectRoadmapNode = (entry: ProjectEntry): ProjectRoadmapNodeData => {
  return {
    id: entry.id,
    title: entry.data.title,
    version: entry.data.version,
    status: entry.data.status,
    projectType: entry.data.projectType,
    category: entry.data.category,
    parentProject: entry.data.parentProject,
  };
};

export const serializeProjectInspector = (entry: ProjectEntry): ProjectInspectorProject => {
  return {
    id: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    version: entry.data.version,
    status: entry.data.status,
    github: entry.data.github,
    link: entry.data.link,
    projectType: entry.data.projectType,
    category: entry.data.category,
    parentProject: entry.data.parentProject,
    linkedProjects: entry.data.linkedProjects,
    roadmap: entry.data.roadmap,
  };
};

export const buildProjectRoadmapNodes = (entries: ProjectEntry[]): ProjectRoadmapNodeData[] => {
  return entries.map(serializeProjectRoadmapNode);
};

export const buildProjectInspectorProjects = (entries: ProjectEntry[]): ProjectInspectorProject[] => {
  return entries.map(serializeProjectInspector);
};
