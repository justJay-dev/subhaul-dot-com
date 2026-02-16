const WP_URL = import.meta.env.PUBLIC_WORDPRESS_API_URL || 'http://localhost/wp-json/wp/v2';

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
    'wp:term'?: Array<
      Array<{
        name: string;
      }>
    >;
  };
}

export async function getPosts(perPage = 100, page = 1) {
  console.log(`Fetching ${perPage} posts from WordPress (page ${page})...`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for larger fetches

    const res = await fetch(`${WP_URL}/posts?_embed&per_page=${perPage}&page=${page}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HaulCo-Build/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`WordPress API returned status: ${res.status}`);
      return [];
    }

    const posts = await res.json();

    if (!Array.isArray(posts)) {
      console.error('WordPress API did not return an array:', posts);
      return [];
    }

    return posts.map((post: WPPost) => ({
      slug: post.slug,
      title: post.title.rendered,
      description: post.excerpt.rendered.replace(/<[^>]*>?/gm, ''),
      publishDate: post.date,
      category: post._embedded?.['wp:term']?.[0]?.[0]?.name || 'General',
      tags: post._embedded?.['wp:term']?.[1]?.map((tag) => tag.name) || [],
      image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '/logo.png',
      content: post.content.rendered,
    }));
  } catch (error) {
    console.error('Error fetching posts from WordPress:', error);
    return [];
  }
}

export async function getAllPosts() {
  let allPosts: any[] = [];
  let page = 1;
  let totalPages = 1;

  try {
    // Fetch first page to get total pages
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${WP_URL}/posts?_embed&per_page=100&page=${page}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HaulCo-Build/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
    const firstPagePosts = await res.json();
    allPosts = [...firstPagePosts];

    // Fetch remaining pages
    // For now, let's limit to 3 pages (300 posts) to avoid build timeouts
    // as requested by the user's concern about build breaking.
    const maxPages = Math.min(totalPages, 3);

    for (page = 2; page <= maxPages; page++) {
      const p = await getPosts(100, page);
      allPosts = [...allPosts, ...p];
    }

    return allPosts.map((post: any) => {
      // If it's already mapped by getPosts, return as is
      if (post.publishDate) return post;

      // Otherwise map it (for the first page fetch which was raw)
      return {
        slug: post.slug,
        title: post.title.rendered,
        description: post.excerpt.rendered.replace(/<[^>]*>?/gm, ''),
        publishDate: post.date,
        category: post._embedded?.['wp:term']?.[0]?.[0]?.name || 'General',
        tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
        image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '/logo.png',
        content: post.content.rendered,
      };
    });
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return allPosts;
  }
}

export async function getPostBySlug(slug: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(`${WP_URL}/posts?slug=${slug}&_embed`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'HaulCo-Build/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`WordPress API returned status: ${res.status}`);
      return null;
    }

    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) return null;

    const post = posts[0] as WPPost;
    return {
      slug: post.slug,
      title: post.title.rendered,
      description: post.excerpt.rendered.replace(/<[^>]*>?/gm, ''),
      publishDate: post.date,
      category: post._embedded?.['wp:term']?.[0]?.[0]?.name || 'General',
      tags: post._embedded?.['wp:term']?.[1]?.map((tag) => tag.name) || [],
      image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '/og-image.png',
      content: post.content.rendered,
    };
  } catch (error) {
    console.error(`Error fetching post with slug ${slug} from WordPress:`, error);
    return null;
  }
}
