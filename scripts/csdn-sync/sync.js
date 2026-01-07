const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

// 加载配置
const config = require('./config.json');
const CSDN_USERNAME = config.csdn.username;
const RSS_URL = `https://blog.csdn.net/${CSDN_USERNAME}/rss/list`;
const OUTPUT_JSON = config.paths.outputJson;
const MARKDOWN_DIR = config.paths.markdownDir;
const IMAGE_DIR = config.paths.imageDir;

// 确保目录存在
[path.dirname(OUTPUT_JSON), MARKDOWN_DIR, IMAGE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 初始化HTML转Markdown工具
const turndown = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx'
});

// 添加自定义规则
turndown.addRule('code', {
  filter: 'pre',
  replacement: (content, node) => {
    const language = node.querySelector('code')?.className?.replace('language-', '') || '';
    return `\`\`\`${language}\n${content.trim()}\n\`\`\`\n\n`;
  }
});

// 主同步函数
async function syncCSDN() {
  console.log(`开始同步CSDN博客: ${CSDN_USERNAME}`);
  
  try {
    // 1. 获取RSS数据
    console.log('正在获取RSS订阅...');
    const rssResponse = await axios.get(RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // 2. 解析XML
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(rssResponse.data);
    
    if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
      console.error('RSS格式错误或没有文章');
      return;
    }
    
    const items = result.rss.channel[0].item.slice(0, config.csdn.maxPosts);
    console.log(`找到 ${items.length} 篇文章`);
    
    // 3. 处理每篇文章
    const posts = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`处理文章 ${i + 1}/${items.length}: ${item.title[0]}`);
      
      const post = await processPost(item, i);
      posts.push(post);
      
      // 避免请求过快
      await sleep(1000);
    }
    
    // 4. 生成blog.json
    const existingData = fs.existsSync(OUTPUT_JSON) 
      ? JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'))
      : [];
    
    // 合并新文章（避免重复）
    const mergedPosts = mergePosts(existingData, posts);
    
    fs.writeFileSync(
      OUTPUT_JSON,
      JSON.stringify(mergedPosts, null, 2),
      'utf8'
    );
    
    console.log(`同步完成！共 ${mergedPosts.length} 篇文章。`);
    
  } catch (error) {
    console.error('同步失败:', error.message);
    process.exit(1);
  }
}

// 处理单篇文章
async function processPost(item, index) {
  const link = item.link[0];
  const postId = extractPostId(link);
  
  // 生成slug（URL友好的标题）
  const slug = generateSlug(item.title[0]);
  
  // 解析日期
  const pubDate = item.pubDate ? new Date(item.pubDate[0]).toISOString().split('T')[0] : 
                  new Date().toISOString().split('T')[0];
  
  // 提取描述中的图片
  const description = item.description ? item.description[0] : '';
  const coverImage = extractCoverImage(description) || config.site.defaultCover;
  
  // 提取标签
  const tags = extractTags(item);
  
  // 获取文章详情（如果需要全文）
  let content = '';
  let readTime = '5分钟';
  let stats = { views: 0, likes: 0, comments: 0 };
  
  try {
    const { fullContent, estimatedReadTime, articleStats } = await fetchArticleDetails(link);
    content = fullContent;
    readTime = estimatedReadTime;
    stats = articleStats;
  } catch (error) {
    console.warn(`无法获取文章 ${link} 的详情: ${error.message}`);
    // 使用摘要作为回退
    content = truncateDescription(description, 200);
  }
  
  // 保存为Markdown文件
  const markdownPath = saveAsMarkdown({
    id: index + 1,
    title: item.title[0],
    content: content,
    slug: slug,
    date: pubDate
  });
  
  return {
    id: index + 1,
    title: item.title[0],
    slug: slug,
    date: pubDate,
    tags: tags,
    category: determineCategory(item.title[0], tags),
    author: config.site.author,
    excerpt: truncateDescription(description, 150),
    coverImage: coverImage,
    readTime: readTime,
    views: stats.views,
    likes: stats.likes,
    comments: stats.comments,
    content: content.substring(0, 500) + '...', // JSON中只存摘要
    contentFile: markdownPath.replace(/^\.\//, ''), // 相对路径
    source: 'csdn',
    originalUrl: link
  };
}

// 获取文章详情
async function fetchArticleDetails(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // 提取文章正文
    const articleContent = $('article, .article-content, #article_content, .blog-content-box').first();
    if (articleContent.length === 0) {
      throw new Error('未找到文章内容');
    }
    
    // 清理不需要的元素
    articleContent.find('.hide-article-box, .article-bar-bottom, .recommend-box, .template-box').remove();
    
    // 转换HTML为Markdown
    const htmlContent = articleContent.html();
    const markdownContent = turndown.turndown(htmlContent);
    
    // 估算阅读时间（按300字/分钟）
    const wordCount = markdownContent.replace(/\s+/g, '').length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 300));
    const readTime = `${readMinutes}分钟`;
    
    // 提取统计数据
    const views = extractNumber($('.read-count').text()) || 0;
    const likes = extractNumber($('.likenum').text()) || 0;
    const comments = extractNumber($('.comment-count').text()) || 0;
    
    return {
      fullContent: markdownContent,
      estimatedReadTime: readTime,
      articleStats: { views, likes, comments }
    };
    
  } catch (error) {
    throw new Error(`获取文章详情失败: ${error.message}`);
  }
}

// 保存为Markdown文件
function saveAsMarkdown(post) {
  const fileName = `${post.date}-${post.slug}.md`;
  const filePath = path.join(MARKDOWN_DIR, fileName);
  
  const frontMatter = `---
title: "${post.title}"
date: "${post.date}"
slug: "${post.slug}"
id: ${post.id}
originalUrl: "${post.originalUrl}"
---

`;
  
  const content = frontMatter + post.content;
  fs.writeFileSync(filePath, content, 'utf8');
  
  return `./${MARKDOWN_DIR}${fileName}`;
}

// 辅助函数
function extractPostId(url) {
  const match = url.match(/article\/details\/(\d+)/);
  return match ? match[1] : Date.now().toString();
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 50);
}

function extractCoverImage(description) {
  const match = description.match(/<img[^>]+src="([^">]+)"/i);
  return match ? match[1] : null;
}

function extractTags(item) {
  const tags = [];
  if (item.category) {
    if (Array.isArray(item.category)) {
      tags.push(...item.category);
    } else {
      tags.push(item.category);
    }
  }
  return tags.length > 0 ? tags.slice(0, 5) : ['技术'];
}

function determineCategory(title, tags) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('前端') || tags.includes('前端') || tags.includes('html') || tags.includes('css') || tags.includes('javascript')) {
    return '前端';
  } else if (lowerTitle.includes('后端') || tags.includes('后端') || tags.includes('java') || tags.includes('python') || tags.includes('node')) {
    return '后端';
  } else if (lowerTitle.includes('算法') || tags.includes('算法') || tags.includes('数据结构')) {
    return '算法';
  } else if (tags.includes('随笔') || tags.includes('生活') || tags.includes('思考')) {
    return '随笔';
  }
  return '技术文章';
}

function truncateDescription(text, maxLength) {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  return stripped.length > maxLength ? stripped.substring(0, maxLength) + '...' : stripped;
}

function extractNumber(text) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function mergePosts(existing, newPosts) {
  const postMap = new Map();
  
  // 添加现有文章
  existing.forEach(post => {
    postMap.set(post.originalUrl, post);
  });
  
  // 更新或添加新文章
  newPosts.forEach(post => {
    if (postMap.has(post.originalUrl)) {
      // 更新现有文章
      const existingPost = postMap.get(post.originalUrl);
      Object.assign(existingPost, post);
    } else {
      // 添加新文章
      postMap.set(post.originalUrl, post);
    }
  });
  
  return Array.from(postMap.values())
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行同步
syncCSDN();
