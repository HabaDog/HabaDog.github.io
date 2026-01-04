// 网站主逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 1. 默认加载项目页面
    loadPage('projects');

    // 2. 为所有导航链接添加点击事件
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止链接默认跳转行为
            
            // 3. 更新活动状态：移除所有active，为当前点击的添加active
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            
            // 4. 加载对应页面
            const page = this.getAttribute('data-page');
            loadPage(page);

            // （可选）更新浏览器地址栏URL，便于分享
            window.history.pushState({page: page}, '', `#${page}`);
        });
    });

    // 5. 处理浏览器前进/后退按钮
    window.addEventListener('popstate', function(event) {
        const page = event.state?.page || 'projects';
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        document.querySelector(`.nav-links a[data-page="${page}"]`)?.classList.add('active');
        loadPage(page);
    });
});

// 加载不同页面的主函数
async function loadPage(page) {
    const contentSection = document.getElementById('content-section');
    
    // 显示加载中状态
    contentSection.innerHTML = `
        <div class="loading" style="text-align: center; padding: 3rem; color: #7f8c8d;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 1rem;">正在加载${getPageName(page)}内容...</p>
        </div>
    `;
    
    try {
        // 根据点击的页面，调用不同的加载函数
        switch(page) {
            case 'projects':
                await loadProjects();
                break;
            case 'blog':
                await loadBlogPosts();
                break;
            case 'music':
                await loadMusicDemos();
                break;
            case 'essays':
                await loadEssays();
                break;
            case 'photos':
                await loadPhotos();
                break;
            default:
                await loadProjects(); // 默认回退到项目页
        }
    } catch (error) {
        console.error(`加载${page}页面失败:`, error);
        contentSection.innerHTML = `
            <div class="error" style="text-align: center; padding: 3rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <h2>加载失败</h2>
                <p>抱歉，加载${getPageName(page)}时出了点问题。请刷新页面重试。</p>
                <p><small>错误信息: ${error.message}</small></p>
            </div>
        `;
    }
}

// 获取页面中文名称的辅助函数
function getPageName(pageKey) {
    const names = {
        'projects': '项目',
        'blog': '博客',
        'music': '音乐',
        'essays': '随笔',
        'photos': '摄影'
    };
    return names[pageKey] || '未知';
}

// ========== 以下是各个页面的具体加载函数 ==========

// 1. 加载“项目”页面
async function loadProjects() {
    const response = await fetch('data/projects.json');
    const projects = await response.json();
    const contentSection = document.getElementById('content-section');
    
    let projectsHTML = `
        <h2><i class="fas fa-code"></i> 我的项目</h2>
        <p class="section-subtitle">以下是我开发或参与的一些技术项目，点击链接查看详情。</p>
        <div class="projects-grid">
    `;
    
    projects.forEach(proj => {
        const demoBtn = proj.demoLink && proj.demoLink !== '#' 
            ? `<a href="${proj.demoLink}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> 查看演示</a>`
            : `<button class="btn" style="opacity:0.6; cursor:default;" disabled><i class="fas fa-ban"></i> 无在线演示</button>`;
        
        const techTags = proj.techStack.map(t => `<span class="tech-tag">${t}</span>`).join('');
        
        projectsHTML += `
            <article class="project-card">
                <div class="project-image" style="background-image: url('${proj.imageUrl}'); background-size: cover; background-position: center;">
                    <!-- 图片已通过CSS背景显示 -->
                </div>
                <div class="project-content">
                    <h3 class="project-title">${proj.title}</h3>
                    <p class="project-description">${proj.description}</p>
                    <div class="tech-stack">${techTags}</div>
                    <div class="project-links">
                        ${demoBtn}
                        <a href="${proj.codeLink}" target="_blank" class="btn btn-outline"><i class="fab fa-github"></i> 查看代码</a>
                    </div>
                </div>
            </article>
        `;
    });
    
    projectsHTML += `</div>`;
    contentSection.innerHTML = projectsHTML;
}

// 2. 加载“随笔”页面
async function loadEssays() {
    const response = await fetch('data/essays.json');
    const essays = await response.json();
    const contentSection = document.getElementById('content-section');
    
    let essaysHTML = `
        <h2><i class="fas fa-pen-fancy"></i> 随笔与思考</h2>
        <p class="section-subtitle">这里记录了一些零碎的想法、阅读笔记和学习心得。</p>
        <div class="essays-list" style="margin-top: 2rem;">
    `;
    
    essays.forEach(essay => {
        const tags = essay.tags.map(t => `<span class="tech-tag" style="background:#f1f8ff; color:#0366d6;">${t}</span>`).join('');
        
        essaysHTML += `
            <article class="essay-item" style="background: white; border-radius: 10px; padding: 1.8rem; margin-bottom: 1.5rem; box-shadow: 0 3px 10px rgba(0,0,0,0.05); border-left: 4px solid #4a6cf7;">
                <h3 style="margin-top:0; color: #2c3e50;">${essay.title}</h3>
                <div style="color: #7f8c8d; font-size: 0.9rem; margin-bottom: 0.8rem;">
                    <i class="far fa-calendar"></i> ${essay.date} 
                    <span style="margin-left: 1rem;"><i class="fas fa-tags"></i> ${tags}</span>
                </div>
                <p style="color: #555; line-height: 1.7; margin-bottom: 1rem;">${essay.excerpt}</p>
                <div class="essay-content" style="color: #444; line-height: 1.8; border-top: 1px solid #eee; padding-top: 1rem; margin-top: 1rem;">
                    ${essay.content}
                </div>
            </article>
        `;
    });
    
    essaysHTML += `</div>`;
    contentSection.innerHTML = essaysHTML;
}

// 3. 加载“博客”页面 (示例框架)
async function loadBlogPosts() {
    // 您可以创建 data/blog.json 并填充您的博客数据
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = `
        <h2><i class="fas fa-blog"></i> 技术博客</h2>
        <p class="section-subtitle">这里将分享更系统、深入的技术文章和教程。</p>
        <div style="background: #f8f9fa; border-radius: 10px; padding: 2rem; text-align: center; margin-top: 2rem;">
            <i class="fas fa-tools fa-3x" style="color: #bdc3c7;"></i>
            <h3 style="color: #7f8c8d;">功能开发中</h3>
            <p>博客系统正在积极构建中。规划使用 Markdown 文件驱动，支持分类与标签。</p>
            <p>您可以先在 <strong>data/blog.json</strong> 文件中添加您的博客文章数据。</p>
        </div>
    `;
}

// 4. 加载“音乐”页面 (示例框架)
async function loadMusicDemos() {
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = `
        <h2><i class="fas fa-music"></i> 音乐作品</h2>
        <p class="section-subtitle">这里将展示我的音乐创作与编曲 Demo。</p>
        <div style="background: #f8f9fa; border-radius: 10px; padding: 2rem; text-align: center; margin-top: 2rem;">
            <i class="fas fa-headphones fa-3x" style="color: #bdc3c7;"></i>
            <h3 style="color: #7f8c8d;">音频模块待集成</h3>
            <p>计划集成一个美观的音频播放器，支持在线播放。</p>
            <p>您可以在 <strong>data/music.json</strong> 中准备作品信息（标题、描述、音频文件链接、封面图）。</p>
        </div>
    `;
}

// 5. 加载“摄影”页面 (示例框架)
async function loadPhotos() {
    const contentSection = document.getElementById('content-section');
    contentSection.innerHTML = `
        <h2><i class="fas fa-camera"></i> 摄影作品</h2>
        <p class="section-subtitle">透过镜头捕捉的瞬间与风景。</p>
        <div style="background: #f8f9fa; border-radius: 10px; padding: 2rem; text-align: center; margin-top: 2rem;">
            <i class="fas fa-images fa-3x" style="color: #bdc3c7;"></i>
            <h3 style="color: #7f8c8d;">相册画廊搭建中</h3>
            <p>计划创建一个响应式的图片画廊，支持点击放大和滑动浏览。</p>
            <p>您可以在 <strong>data/photos.json</strong> 中准备作品信息（标题、描述、图片URL、拍摄参数等）。</p>
        </div>
    `;
}
