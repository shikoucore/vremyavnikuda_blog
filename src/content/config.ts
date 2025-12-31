import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    lang: z.enum(['ja', 'en']).default('ja'),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    link: z.string().url().optional(),
    github: z.string().url().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    lang: z.enum(['ja', 'en']).default('ja'),
    // Project type and hierarchy
    projectType: z.enum(['category', 'project', 'contribution']).default('project'),
    category: z.enum(['projects', 'contributing']).optional(),
    parentProject: z.string().optional(), // ID родительского проекта для ветвления
    linkedProjects: z.array(z.string()).optional(), // Дополнительные связи с другими проектами
    // Roadmap fields
    status: z.enum(['active', 'maintenance', 'completed', 'archived']).default('active'),
    version: z.string().optional(),
    roadmap: z.array(z.object({
      version: z.string(),
      releaseStatus: z.enum(['release', 'dev']),
      items: z.array(z.string()).optional(),
    })).optional(),
  }),
});

const achievements = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    organization: z.string(),
    image: z.string(), // Path to certificate image
    verificationUrl: z.string().url().optional(),
    lang: z.enum(['ja', 'en']).default('ja'),
  }),
});

export const collections = { blog, projects, achievements };
