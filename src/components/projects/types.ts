export type ReleaseStatus = 'release' | 'dev' | 'close';
export type ProjectType = 'category' | 'project' | 'contribution';
export type ProjectCategory = 'projects' | 'contributing';

export interface ProjectRoadmapItem {
  version: string;
  releaseStatus: ReleaseStatus;
  items?: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  version?: string;
  status: string;
  tags: string[];
  github?: string;
  link?: string;
  projectType?: ProjectType;
  category?: ProjectCategory;
  parentProject?: string;
  linkedProjects?: string[];
  roadmap?: ProjectRoadmapItem[];
}

export interface ProjectRoadmapNodeData {
  id: string;
  title: string;
  version?: string;
  status: string;
  projectType?: ProjectType;
  category?: ProjectCategory;
  parentProject?: string;
}

export interface ProjectInspectorProject extends ProjectRoadmapNodeData {
  description: string;
  github?: string;
  link?: string;
  linkedProjects?: string[];
  roadmap?: ProjectRoadmapItem[];
}
