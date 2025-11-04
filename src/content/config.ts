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

export const collections = { blog, projects };
