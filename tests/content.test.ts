import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

interface PostFrontmatter {
  title?: string;
  description?: string;
  pubDate?: string;
  category?: string;
  draft?: boolean;
  updatedDate?: string;
}

interface Post {
  filename: string;
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
}

function parseFrontmatter(fileContent: string): PostFrontmatter {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatterText = match[1];
  const frontmatter: PostFrontmatter = {};

  // Simple YAML parser for common fields
  const titleMatch = frontmatterText.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch) frontmatter.title = titleMatch[1].trim();

  const descMatch = frontmatterText.match(/^description:\s*["']?(.+?)["']?\s*$/m);
  if (descMatch) frontmatter.description = descMatch[1].trim();

  const pubDateMatch = frontmatterText.match(
    /^pubDate:\s*(\d{4}-\d{2}-\d{2})/m
  );
  if (pubDateMatch) frontmatter.pubDate = pubDateMatch[1];

  const categoryMatch = frontmatterText.match(/^category:\s*["']?(.+?)["']?\s*$/m);
  if (categoryMatch) frontmatter.category = categoryMatch[1].trim();

  const draftMatch = frontmatterText.match(/^draft:\s*(true|false)/m);
  if (draftMatch) frontmatter.draft = draftMatch[1] === 'true';

  const updatedMatch = frontmatterText.match(
    /^updatedDate:\s*(\d{4}-\d{2}-\d{2})/m
  );
  if (updatedMatch) frontmatter.updatedDate = updatedMatch[1];

  return frontmatter;
}

describe('Blog Content Validation', () => {
  let posts: Post[] = [];

  beforeAll(async () => {
    const files = await fsPromises.readdir(CONTENT_DIR);
    const mdFiles = files.filter(
      (f) => f.endsWith('.md') || f.endsWith('.mdx')
    );

    posts = await Promise.all(
      mdFiles.map(async (filename) => {
        const slug = filename.replace(/\.(md|mdx)$/, '');
        const filePath = path.join(CONTENT_DIR, filename);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        return { filename, slug, frontmatter, content };
      })
    );
  });

  it('should have at least 14 blog posts', () => {
    expect(posts.length).toBeGreaterThanOrEqual(14);
  });

  it('all posts should have required frontmatter fields', () => {
    const missingFields = posts.filter(
      (p) => !p.frontmatter.title || !p.frontmatter.description
    );

    expect(
      missingFields.length,
      `Posts missing title/description: ${missingFields.map((p) => p.filename).join(', ')}`
    ).toBe(0);
  });

  it('all posts should have pubDate', () => {
    const missingDate = posts.filter((p) => !p.frontmatter.pubDate);
    expect(
      missingDate.length,
      `Posts missing pubDate: ${missingDate.map((p) => p.filename).join(', ')}`
    ).toBe(0);
  });

  it('all posts should have valid category', () => {
    const validCategories = ['about', 'sessions', 'projects'];
    const invalidCategory = posts.filter(
      (p) => !validCategories.includes(p.frontmatter.category || '')
    );

    expect(
      invalidCategory.length,
      `Posts with invalid category: ${invalidCategory.map((p) => `${p.filename} (${p.frontmatter.category})`).join(', ')}`
    ).toBe(0);
  });

  it('should not have duplicate post slugs', () => {
    const slugs = posts.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);

    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it('post filenames should match slug format', () => {
    const mismatches = posts.filter((p) => {
      const expectedSlug = p.filename.replace(/\.(md|mdx)$/, '');
      return p.slug !== expectedSlug;
    });

    expect(mismatches.length).toBe(0);
  });

  it('published posts should have valid dates (not in future)', () => {
    const published = posts.filter((p) => !p.frontmatter.draft);
    const now = new Date();

    for (const post of published) {
      const postDate = new Date(post.frontmatter.pubDate || '');
      expect(
        postDate <= now,
        `Post ${post.filename} has future date: ${post.frontmatter.pubDate}`
      ).toBe(true);
    }
  });

  it('post content should be valid Markdown', () => {
    const invalidContent = posts.filter((p) => {
      // Basic check: should have content after frontmatter
      const afterFrontmatter = p.content.replace(/^---\n[\s\S]*?\n---\n/, '');
      return afterFrontmatter.trim().length === 0;
    });

    expect(
      invalidContent.length,
      `Posts with no content: ${invalidContent.map((p) => p.filename).join(', ')}`
    ).toBe(0);
  });

  it('published posts should be at least 100 characters', () => {
    const tooShort = posts.filter((p) => {
      if (p.frontmatter.draft) return false;
      const content = p.content.replace(/^---\n[\s\S]*?\n---\n/, '');
      return content.trim().length < 100;
    });

    expect(
      tooShort.length,
      `Posts too short: ${tooShort.map((p) => p.filename).join(', ')}`
    ).toBe(0);
  });

  it('category distribution should be reasonable', () => {
    const published = posts.filter((p) => !p.frontmatter.draft);
    const categories = published.reduce(
      (acc, p) => {
        const cat = p.frontmatter.category || 'unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Should have posts in multiple categories
    expect(Object.keys(categories).length).toBeGreaterThan(1);

    // No single category should have 0 posts
    Object.values(categories).forEach((count) => {
      expect(count).toBeGreaterThan(0);
    });
  });
});
