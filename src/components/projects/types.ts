export type ReleaseStatus = 'release' | 'dev' | 'close';

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
  projectType?: 'category' | 'project' | 'contribution';
  category?: 'projects' | 'contributing';
  parentProject?: string;
  linkedProjects?: string[];
  roadmap?: ProjectRoadmapItem[];
}
