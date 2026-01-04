// 网站主逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 默认加载项目页面
    loadPage('projects');

    // 为导航链接添加点击事件
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新活动状态
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            
            // 加载对应页面
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });
});

// 加载不同页面的函数
async function loadPage(page) {
    const contentSection = document.getElementById('content-section');
    
    // 简单加载动画
    contentSection.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 正在加载...</div>';
    
    try {
        switch(page) {
            case 'projects':
                await loadProjects();
                break;
            case 'blog':
                contentSection.innerHTML = '<h2>博客文章</h2><p>博客功能正在建设中，未来将使用 Markdown 文件驱动。</p>';
                break;
            case 'music':
                contentSection.innerHTML = '<h2>音乐 Demo</h2><p>音乐展示页面正在规划中，将嵌入音频播放器。</p>';
                break;
            case 'essays':
                contentSection.innerHTML = '<h2>随笔</h2><p>随笔与思考将在此呈现。</p>';
                break;
            case 'photos':
                contentSection.innerHTML = '<h2>摄影作品</h2><p>摄影画廊功能开发中。</p>';
                break;
            default:
                await loadProjects();
        }
    } catch (error) {
        console.error('加载内容失败:', error);
        contentSection.innerHTML = '<p class="error">加载内容时出错，请稍后再试。</p>';
    }
}

// 加载并渲染项目
async function loadProjects() {
    try {
        // 从 /data/projects.json 加载数据
        const response = await fetch('data/projects.json');
        if (!response.ok) throw new Error('网络响应不正常');
        
        const projects = await response.json();
        const contentSection = document.getElementById('content-section');
        
        if (projects.length === 0) {
            contentSection.innerHTML = '<h2>我的项目</h2><p>暂无项目展示。</p>';
            return;
        }
        
        // 构建项目网格HTML
        let projectsHTML = `
            <h2><i class="fas fa-code"></i> 我的项目</h2>
            <p class="section-subtitle">以下是我开发或参与的一些技术项目。</p>
            <div class="projects-grid">
        `;
        
        projects.forEach(project => {
            // 处理可能缺失的演示链接
            const demoButton = project.demoLink 
                ? `<a href="${project.demoLink}" target="_blank" class="btn btn-primary"><i class="fas fa-external-link-alt"></i> 查看演示</a>`
                : '<button class="btn" style="opacity:0.6; cursor:default;" disabled><i class="fas fa-ban"></i> 无在线演示</button>';
            
            // 技术栈标签
            const techTags = project.techStack.map(tech => 
                `<span class="tech-tag">${tech}</span>`
            ).join('');
            
            projectsHTML += `
                <article class="project-card">
                    <div class="project-image">
                        ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}" style="width:100%;height:100%;object-fit:cover;">` : '项目图片'}
                    </div>
                    <div class="project-content">
                        <h3 class="project-title">${project.title}</h3>
                        <p class="project-description">${project.description}</p>
                        <div class="tech-stack">
                            ${techTags}
                        </div>
                        <div class="project-links">
                            ${demoButton}
                            <a href="${project.codeLink}" target="_blank" class="btn btn-outline"><i class="fab fa-github"></i> 查看代码</a>
                        </div>
                    </div>
                </article>
            `;
        });
        
        projectsHTML += '</div>'; // 关闭 projects-grid
        contentSection.innerHTML = projectsHTML;
        
    } catch (error) {
        console.error('加载项目失败:', error);
        document.getElementById('content-section').innerHTML = `
            <h2>我的项目</h2>
            <p class="error">抱歉，暂时无法加载项目列表。错误: ${error.message}</p>
        `;
    }
}
